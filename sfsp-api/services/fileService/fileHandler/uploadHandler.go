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
	err := r.ParseMultipartForm(2 << 30) // up to 2GB
	if err != nil {
		http.Error(w, "Failed to parse multipart form", http.StatusBadRequest)
		fmt.Println("Failed to parse multipart form:", err)
		return
	}

	// 🔸 Get form values
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

	// 🔸 Parse tags
	var tags []string
	if tagsRaw != "" {
		err := json.Unmarshal([]byte(tagsRaw), &tags)
		if err != nil {
			http.Error(w, "Invalid fileTags JSON", http.StatusBadRequest)
			fmt.Println("Invalid tags JSON")
			return
		}
	}

	// 🔸 Get file
	file, _, err := r.FormFile("encryptedFile")
	if err != nil {
		http.Error(w, "Missing encrypted file", http.StatusBadRequest)
		fmt.Println("Missing encrypted file")
		return
	}
	defer file.Close()

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Failed to read file content", http.StatusInternalServerError)
		fmt.Println("Failed to read file content")
		return
	}

	// 🔐 Encrypt before upload
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

	// 🧑‍💻 Ensure user exists
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

	// 🗂️ Store metadata
	var fileID string
	err = DB.QueryRow(`
		INSERT INTO files (
			owner_id, file_name, file_type, file_size, cid, nonce, description, tags, created_at
		)
		VALUES ($1, $2, $3, $4, '', $5, $6, $7, $8)
		RETURNING id
	`,
		userId,
		fileName,
		fileType,
		len(fileBytes),
		nonce,
		description,
		pq.Array(tags),
		time.Now(),
	).Scan(&fileID)

	if err != nil {
		log.Println("PostgreSQL insert error:", err)
		http.Error(w, "Metadata storage failed", http.StatusInternalServerError)
		return
	}

	pathForUpload := "files/" + userId
	err = owncloud.UploadFile(pathForUpload, fileID, encryptedFile)
	if err != nil {
		log.Println("OwnCloud upload failed:", err)
		http.Error(w, "File upload failed", http.StatusInternalServerError)
		return
	}

	_, err = DB.Exec(`UPDATE files SET cid = $1 WHERE id = $2`, uploadPath, fileID)
	if err != nil {
		log.Println("PostgreSQL update cid failed:", err)
		// Not fatal
	} 

	// ✅ Respond
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "File uploaded and metadata stored",
		"fileId":  fileID,
	})
}
