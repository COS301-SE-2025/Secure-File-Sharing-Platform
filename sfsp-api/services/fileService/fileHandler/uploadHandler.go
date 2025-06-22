package fileHandler

import (
	//"context"
	//"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/crypto"
	//"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/database"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"

	"github.com/lib/pq"
	"database/sql"
)

type UploadRequest struct {
	FileName    string   `json:"fileName"`
	FileType    string   `json:"fileType"`
	UserID      string   `json:"userId"`
	Nonce       string   `json:"nonce"`
	Description string   `json:"fileDescription"`
	Tags        []string `json:"fileTags"`
	Path        string   `json:"path"`
	FileContent string   `json:"fileContent"`
}

var DB *sql.DB

func SetPostgreClient(db *sql.DB) {
	// This function is used to set the PostgreSQL client in the fileHandler package
	DB = db
}

func UploadHandler(w http.ResponseWriter, r *http.Request) {
	var req UploadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.FileName == "" || req.FileContent == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	fileBytes, err := base64.StdEncoding.DecodeString(req.FileContent)
	if err != nil {
		http.Error(w, "Invalid base64 file content", http.StatusBadRequest)
		return
	}

	aesKey := os.Getenv("AES_KEY")
	if len(aesKey) != 32 {
		http.Error(w, "Invalid AES key", http.StatusInternalServerError)
		return
	}

	encryptedFile, err := crypto.EncryptBytes(fileBytes, aesKey)
	if err != nil {
		log.Println("Encryption error:", err)
		http.Error(w, "Encryption failed", http.StatusInternalServerError)
		return
	}

	// Step 1: Save metadata and get the generated file ID
	var fileID string
	err = DB.QueryRow(`
		INSERT INTO files (
			owner_id, file_name, file_type, file_size, cid, nonce, description, tags, created_at
		)
		VALUES ($1, $2, $3, $4, '', $5, $6, $7, $8)
		RETURNING id
	`,
		req.UserID,
		req.FileName,
		req.FileType,
		len(fileBytes),
		req.Nonce,
		req.Description,
		pq.Array(req.Tags),
		time.Now(),
	).Scan(&fileID)

	if err != nil {
		log.Println("PostgreSQL insert error:", err)
		http.Error(w, "Metadata storage failed", http.StatusInternalServerError)
		return
	}

	// Step 2: Upload file using fileID as filename
	uploadPath := req.Path
	if uploadPath == "" {
		uploadPath = "files"
	}

	err = owncloud.UploadFile(uploadPath, fileID, encryptedFile)
	if err != nil {
		log.Println("OwnCloud upload failed:", err)
		http.Error(w, "File upload failed", http.StatusInternalServerError)
		return
	}

	// Step 3: Update cid in database
	fullCID := fmt.Sprintf("%s/%s", uploadPath, fileID)
	_, err = DB.Exec(`UPDATE files SET cid = $1 WHERE id = $2`, fullCID, fileID)
	if err != nil {
		log.Println("PostgreSQL update cid failed:", err)
		// Not fatal to the upload, so continue
	}

	// Respond with success and fileID
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "File uploaded and metadata stored",
		"fileId":  fileID,
	})
}
