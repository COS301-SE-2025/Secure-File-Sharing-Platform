package fileHandler

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"log"
	"os"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/crypto"
	//"database/sql"
	//_ "github.com/lib/pq" // PostgreSQL driver
)

// var DB *sql.DB

// func SetPostgreClient(db *sql.DB) {
// 	// This function is used to set the PostgreSQL client in the fileHandler package
// 	DB = db
// }

type DownloadRequest struct {
	UserID string `json:"userId"`
	FileID string `json:"fileId"`
}

type DownloadResponse struct {
	FileName   string `json:"fileName"`
	FileContent string `json:"fileContent"`
}

func DownloadHandler(w http.ResponseWriter, r *http.Request) {
	var req DownloadRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.UserID == "" || req.FileID == "" {
		log.Println("UserID is: "+ req.UserID + " and FileID is: " + req.FileID)
		http.Error(w, "Missing UserID or FileID", http.StatusBadRequest)
		return
	}

	// Get file bytes from OwnCloud
	data, err := owncloud.DownloadFile(req.FileID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Download failed: %v", err), http.StatusInternalServerError)
		return
	}

	aesKey := os.Getenv("AES_KEY")
	if len(aesKey) != 32 {
		http.Error(w, "Invalid AES key", http.StatusInternalServerError)
		return
	}

	// Decrypt file content if encryption key is provided
	plain, err := crypto.DecryptBytes(data, aesKey)
	if err != nil {
		http.Error(w, fmt.Sprintf("Decryption failed: %v", err), http.StatusInternalServerError)
		return
	}

	// Encode file to base64
	base64Data := base64.StdEncoding.EncodeToString(plain)

	//get the file name from the postgreSQL database
	var fileName string
	err = DB.QueryRow("SELECT file_name FROM files WHERE id = $1", req.FileID).Scan(&fileName)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to retrieve file name: %v", err), http.StatusInternalServerError)
		return
	}

	res := DownloadResponse{
		FileName:   fileName,
		FileContent: base64Data,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}
