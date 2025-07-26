package fileHandler

import (
	//"context"
	//"database/sql"
	//"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
	"io"

	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/crypto"
	//"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/database"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"

	"github.com/lib/pq"
	"database/sql"
	"strings"
	"bytes"
)

// type UploadRequest struct {
// 	FileName    string   `json:"fileName"`
// 	FileType    string   `json:"fileType"`
// 	UserID      string   `json:"userId"`
// 	Nonce       string   `json:"nonce"`
// 	Description string   `json:"fileDescription"`
// 	Tags        []string `json:"fileTags"`
// 	Path        string   `json:"path"`
// 	FileContent string   `json:"fileContent"`
// }

var DB *sql.DB

func SetPostgreClient(db *sql.DB) {
	// This function is used to set the PostgreSQL client in the fileHandler package
	DB = db
}

func UploadHandler(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(2 << 30) // already safe thanks to API layer
	if err != nil {
		http.Error(w, "Failed to parse multipart form", http.StatusBadRequest)
		fmt.Println("Failed to parse multipart form:", err)
		return
	}

	userId := r.FormValue("userId")
	fileName := r.FormValue("fileName")
	fileType := r.FormValue("fileType")
	nonce := r.FormValue("nonce")
	description := r.FormValue("fileDescription")
	tagsRaw := r.FormValue("fileTags")
	uploadPath := r.FormValue("path")
	if uploadPath == "" {
		uploadPath = "files"
	}

	if userId == "" || fileName == "" || nonce == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		fmt.Println("Missing required fields")
		return
	}

	// Parse tags
	var tags []string
	if tagsRaw != "" {
		if err := json.Unmarshal([]byte(tagsRaw), &tags); err != nil {
			http.Error(w, "Invalid fileTags JSON", http.StatusBadRequest)
			fmt.Println("Invalid tags JSON")
			return
		}
	}

	// Read file part
	srcFile, _, err := r.FormFile("encryptedFile")
	if err != nil {
		http.Error(w, "Missing encrypted file", http.StatusBadRequest)
		fmt.Println("Missing encrypted file")
		return
	}
	defer srcFile.Close()

	// Save upload to temp file
	tmpFile, err := os.CreateTemp("", "upload-*.bin")
	if err != nil {
		http.Error(w, "Failed to create temp file", http.StatusInternalServerError)
		return
	}
	defer os.Remove(tmpFile.Name()) // Clean up
	defer tmpFile.Close()

	// Stream uploaded file to temp file
	written, err := io.Copy(tmpFile, srcFile)
	if err != nil {
		http.Error(w, "Failed to save uploaded file", http.StatusInternalServerError)
		fmt.Println("Failed to stream uploaded file:", err)
		return
	}

	// Encrypt file contents
	aesKey := os.Getenv("AES_KEY")
	if len(aesKey) != 32 {
		http.Error(w, "Invalid AES key", http.StatusInternalServerError)
		return
	}

	encBuf := &bytes.Buffer{}
tmpFile.Seek(0, io.SeekStart) // rewind
err = crypto.EncryptStream(tmpFile, encBuf, aesKey)
if err != nil {
	log.Println("Encryption error:", err)
	http.Error(w, "Encryption failed", http.StatusInternalServerError)
	return
}

	// Insert user (if needed)
	_, err = DB.Exec(`
		INSERT INTO users (id)
		SELECT $1
		WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = $1)
	`, userId)
	if err != nil {
		log.Println("Failed to ensure user exists:", err)
		http.Error(w, "User verification failed", http.StatusInternalServerError)
		return
	}

	// Insert metadata
	var fileID string
	err = DB.QueryRow(`
		INSERT INTO files (
			owner_id, file_name, file_type, file_size, cid, nonce, description, tags, created_at
		) VALUES ($1, $2, $3, $4, '', $5, $6, $7, $8)
		RETURNING id
	`, userId, fileName, fileType, written, nonce, description, pq.Array(tags), time.Now()).Scan(&fileID)

	if err != nil {
		log.Println("PostgreSQL insert error:", err)
		http.Error(w, "Metadata storage failed", http.StatusInternalServerError)
		return
	}

	// Upload encrypted file to ownCloud
	pathForUpload := "files/" + userId
	err = owncloud.UploadFile(pathForUpload, fileID, encBuf.Bytes())
	if err != nil {
		log.Println("OwnCloud upload failed:", err)
		http.Error(w, "File upload failed", http.StatusInternalServerError)
		return
	}

	// Update CID
	var fullCID string
	if uploadPath != "" {
		fullCID = strings.TrimSuffix(uploadPath, "/") + "/" + fileName
	} else {
		fullCID = fileName
	}
	_, err = DB.Exec(`UPDATE files SET cid = $1 WHERE id = $2`, fullCID, fileID)
	if err != nil {
		log.Println("Failed to update file CID:", err)
		http.Error(w, "Failed to update file CID", http.StatusInternalServerError)
		return
	}

	// Respond
	log.Println("File uploaded successfully:", fileID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "File uploaded and metadata stored",
		"fileId":  fileID,
	})
}
