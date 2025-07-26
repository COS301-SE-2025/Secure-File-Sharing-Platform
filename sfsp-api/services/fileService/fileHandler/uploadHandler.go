package fileHandler

import (
	//"context"
	//"database/sql"
	//"encoding/base64"
	"encoding/json"
	//"fmt"
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
	//"bytes"
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

type CountingWriter struct {
	w     io.Writer
	Count int64
}

func (cw *CountingWriter) Write(p []byte) (int, error) {
	n, err := cw.w.Write(p)
	cw.Count += int64(n)
	return n, err
}

func UploadHandler(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(2 << 30) // Allow up to 2GB (frontend/API should still validate size)
	if err != nil {
		http.Error(w, "Failed to parse multipart form", http.StatusBadRequest)
		return
	}

	// Extract fields
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
		return
	}

	// Parse tags
	var tags []string
	if tagsRaw != "" {
		if err := json.Unmarshal([]byte(tagsRaw), &tags); err != nil {
			http.Error(w, "Invalid fileTags JSON", http.StatusBadRequest)
			return
		}
	}

	// Get uploaded file
	srcFile, _, err := r.FormFile("encryptedFile")
	if err != nil {
		http.Error(w, "Missing encrypted file", http.StatusBadRequest)
		return
	}
	defer srcFile.Close()

	// Create pipe and counting wrapper
	encReader, encWriter := io.Pipe()
	countingWriter := &CountingWriter{w: encWriter}

	aesKey := os.Getenv("AES_KEY")
	if len(aesKey) != 32 {
		http.Error(w, "Invalid AES key", http.StatusInternalServerError)
		return
	}

	// Encrypt file in background
	go func() {
		defer encWriter.Close()
		if err := crypto.EncryptStream(srcFile, countingWriter, aesKey); err != nil {
			log.Println("Encryption error:", err)
			encWriter.CloseWithError(err)
		}
	}()

	// Ensure user exists
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

	// Insert metadata placeholder to get file ID
	var fileID string
	err = DB.QueryRow(`
		INSERT INTO files (
			owner_id, file_name, file_type, file_size, cid, nonce, description, tags, created_at
		) VALUES ($1, $2, $3, 0, '', $4, $5, $6, $7)
		RETURNING id
	`, userId, fileName, fileType, nonce, description, pq.Array(tags), time.Now()).Scan(&fileID)
	if err != nil {
		log.Println("PostgreSQL insert error:", err)
		http.Error(w, "Metadata storage failed", http.StatusInternalServerError)
		return
	}

	// Upload encrypted stream to ownCloud
	pathForUpload := "files/" + userId
	err = owncloud.UploadFileStream(pathForUpload, fileID, encReader)
	if err != nil {
		log.Println("OwnCloud stream upload failed:", err)
		http.Error(w, "File upload failed", http.StatusInternalServerError)
		return
	}

	// Update file size and CID
	encryptedSize := countingWriter.Count
	fullCID := strings.TrimSuffix(uploadPath, "/") + "/" + fileName
	_, err = DB.Exec(`
		UPDATE files SET file_size = $1, cid = $2 WHERE id = $3
	`, encryptedSize, fullCID, fileID)
	if err != nil {
		log.Println("Failed to update file metadata:", err)
		http.Error(w, "Failed to update file metadata", http.StatusInternalServerError)
		return
	}

	// ✅ Respond
	log.Println("File uploaded successfully:", fileID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "File uploaded and metadata stored",
		"fileId":  fileID,
	})
}