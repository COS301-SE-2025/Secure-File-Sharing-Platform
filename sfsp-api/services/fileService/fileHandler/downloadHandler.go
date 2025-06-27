package fileHandler

import (
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)

// Injected dependencies for testing and runtime flexibility
var (
	DB                 *sql.DB
	OwnCloudDownloader func(fileID, userID string) ([]byte, error)
	DecryptFunc        func(data []byte, key string) ([]byte, error)
	QueryRowFunc       func(query string, args ...any) RowScanner = func(query string, args ...any) RowScanner {
		if DB == nil {
			log.Fatal("Database connection is nil")
		}
		return DB.QueryRow(query, args...)
	}
)

type RowScanner interface {
	Scan(dest ...any) error
}

type DownloadRequest struct {
	UserID   string `json:"userId"`
	FileName string `json:"fileName"`
}

type DownloadResponse struct {
	FileName    string `json:"fileName"`
	FileContent string `json:"fileContent"`
	Nonce       string `json:"nonce"`
}

type DownloadSentRequest struct {
	FilePath string `json:"filePath"`
}

func DownloadHandler(w http.ResponseWriter, r *http.Request) {
	var req DownloadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if req.UserID == "" || req.FileName == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	row := QueryRowFunc("SELECT id, nonce FROM files WHERE owner_id = $1 AND file_name = $2", req.UserID, req.FileName)
	var fileID, nonce string
	if err := row.Scan(&fileID, &nonce); err != nil {
		log.Println("QueryRow failed:", err)
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	encData, err := OwnCloudDownloader(fileID, req.UserID)
	if err != nil {
		http.Error(w, "Download failed", http.StatusInternalServerError)
		return
	}

	key := os.Getenv("AES_KEY")
	if len(key) != 32 {
		http.Error(w, "Invalid AES key", http.StatusInternalServerError)
		return
	}

	decData, err := DecryptFunc(encData, key)
	if err != nil {
		http.Error(w, "Decryption failed", http.StatusInternalServerError)
		return
	}

	resp := DownloadResponse{
		FileName:    req.FileName,
		FileContent: base64.StdEncoding.EncodeToString(decData),
		Nonce:       nonce,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
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

	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(encoded))
}
