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
	"database/sql"
	//_ "github.com/lib/pq" // PostgreSQL driver
)

// var DB *sql.DB

// func SetPostgreClient(db *sql.DB) {
// 	// This function is used to set the PostgreSQL client in the fileHandler package
// 	DB = db
// }

type DownloadRequest struct {
	UserID string `json:"userId"`
	FileName string `json:"fileName"`
}

type DownloadResponse struct {
	FileName    string `json:"fileName"`
	FileContent string `json:"fileContent"`
	Nonce       string `json:"nonce"`
}

type DownloadDeps struct {
	DB        *sql.DB
	OC        func(fileID, userID string) ([]byte, error)
	Decrypt   func(data []byte, key string) ([]byte, error)
	GetAESKey func() string
}

func DownloadHandlerWithDeps(deps DownloadDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req DownloadRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}

		if req.UserID == "" || req.FileName == "" {
			http.Error(w, "Missing userId or fileName", http.StatusBadRequest)
			return
		}

		var fileID, nonce string
		err := deps.DB.QueryRow(`
			SELECT id, nonce FROM files
			WHERE owner_id = $1 AND file_name = $2
		`, req.UserID, req.FileName).Scan(&fileID, &nonce)
		if err != nil {
			log.Println("Failed to retrieve file metadata:", err)
			http.Error(w, "File not found", http.StatusNotFound)
			return
		}

		data, err := deps.OC(fileID, req.UserID)
		if err != nil {
			http.Error(w, fmt.Sprintf("Download failed: %v", err), http.StatusInternalServerError)
			return
		}

		aesKey := os.Getenv("AES_KEY")
		if len(aesKey) != 32 {
			http.Error(w, "Invalid AES key", http.StatusInternalServerError)
			return
		}

		plain, err := deps.Decrypt(data, aesKey)
		if err != nil {
			http.Error(w, fmt.Sprintf("Decryption failed: %v", err), http.StatusInternalServerError)
			return
		}

		base64Data := base64.StdEncoding.EncodeToString(plain)
		res := DownloadResponse{
			FileName:    req.FileName,
			FileContent: base64Data,
			Nonce:       nonce,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(res)
	}
}

func DownloadHandler(w http.ResponseWriter, r *http.Request) {
	var req DownloadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.UserID == "" || req.FileName == "" {
		http.Error(w, "Missing userId or fileName", http.StatusBadRequest)
		return
	}

	fmt.Println("User id is: ", req.UserID)
	fmt.Println("File name is: ", req.FileName)
	var fileID, nonce string
	err := DB.QueryRow(`
		SELECT id, nonce FROM files
		WHERE owner_id = $1 AND file_name = $2
	`, req.UserID, req.FileName).Scan(&fileID, &nonce)

	if err != nil {
		log.Println("Failed to retrieve file metadata:", err)
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	fmt.Println("File ID is: ",fileID)

	data, err := owncloud.DownloadFile(fileID, req.UserID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Download failed: %v", err), http.StatusInternalServerError)
		fmt.Println("Download Failed")
		return
	}

	aesKey := os.Getenv("AES_KEY")
	if len(aesKey) != 32 {
		http.Error(w, "Invalid AES key", http.StatusInternalServerError)
		return
	}

	plain, err := crypto.DecryptBytes(data, aesKey)
	if err != nil {
		http.Error(w, fmt.Sprintf("Decryption failed: %v", err), http.StatusInternalServerError)
		return
	}

	base64Data := base64.StdEncoding.EncodeToString(plain)

	//fmt.Println("FileContent is: ",base64Data)

	res := DownloadResponse{
		FileName:    req.FileName,
		FileContent: base64Data,
		Nonce:       nonce,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

type DownloadSentRequest struct {
	FilePath string `json:"filePath"`
}

func DownloadSentFile(w http.ResponseWriter, r *http.Request) {
	var req DownloadSentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.FilePath == "" {
		http.Error(w, "Missing file path", http.StatusBadRequest)
		return
	}

	fmt.Println("Downloading file from path:", req.FilePath)

	data, err := owncloud.DownloadSentFile(req.FilePath)
	if err != nil {
		http.Error(w, fmt.Sprintf("Download failed: %v", err), http.StatusInternalServerError)
		fmt.Println("Download Failed:", err)
		return
	}

	encoded := base64.RawURLEncoding.EncodeToString(data)

    w.Header().Set("Content-Type", "text/plain") // or "application/json"
    w.WriteHeader(http.StatusOK)
    w.Write([]byte(encoded))
}

