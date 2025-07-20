package fileHandler

import (
	//"context"
	//"database/sql"
	//"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	// "os"
	//"time"
	//"io"

	//"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/crypto"
	//"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"

	"github.com/lib/pq"
	"strings"
	//"database/sql"
)

func CreateFolderHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	var req struct {
		UserID   string `json:"userId"`
		FolderName string `json:"folderName"`
		ParentPath string `json:"parentPath"` // Optional, e.g., "my/docs"
		Description string `json:"description"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	if req.UserID == "" || req.FolderName == "" {
		http.Error(w, "Missing userId or folderName", http.StatusBadRequest)
		return
	}

	// Construct full CID for folder path
	var fullCID string
	if req.ParentPath != "" {
		fullCID = fmt.Sprintf("%s/%s", strings.TrimSuffix(req.ParentPath, "/"), req.FolderName)
	} else {
		fullCID = ""
	}

	// Insert folder metadata (no file content, just metadata)
	var folderID string
	err := DB.QueryRow(`
		INSERT INTO files (
			owner_id, file_name, file_type, file_size, cid, nonce, description, tags, created_at
		) VALUES ($1, $2, 'folder', 0, $3, '', $4, $5, NOW())
		RETURNING id
	`,
		req.UserID,
		req.FolderName,
		fullCID,
		req.Description,
		pq.Array([]string{"folder"}),
	).Scan(&folderID)

	if err != nil {
		log.Println("Failed to insert folder:", err)
		http.Error(w, "Failed to create folder", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"folderId": folderID,
		"cid":      fullCID,
	})
}
