package fileHandler

import (
	//"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"log"
	"os"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/crypto"
	"database/sql"
	"io"
	"crypto/sha256"
	"encoding/hex"
	"bytes"
	//_ "github.com/lib/pq" // PostgreSQL driver
)

// var DB *sql.DB

// func SetPostgreClient(db *sql.DB) {
// 	// This function is used to set the PostgreSQL client in the fileHandler package
// 	DB = db
// }

type DownloadRequest struct {
	UserID string `json:"userId"`
	FileId string `json:"fileId"`
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

// func DownloadHandlerWithDeps(deps DownloadDeps) http.HandlerFunc {
// 	return func(w http.ResponseWriter, r *http.Request) {
// 		var req DownloadRequest
// 		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
// 			http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
// 			return
// 		}

// 		if req.UserID == "" || req.FileName == "" {
// 			http.Error(w, "Missing userId or fileName", http.StatusBadRequest)
// 			return
// 		}

// 		var fileID, nonce string
// 		err := deps.DB.QueryRow(`
// 			SELECT id, nonce FROM files
// 			WHERE owner_id = $1 AND file_name = $2
// 		`, req.UserID, req.FileName).Scan(&fileID, &nonce)
// 		if err != nil {
// 			log.Println("Failed to retrieve file metadata:", err)
// 			http.Error(w, "File not found", http.StatusNotFound)
// 			return
// 		}

// 		data, err := deps.OC(fileID, req.UserID)
// 		if err != nil {
// 			http.Error(w, fmt.Sprintf("Download failed: %v", err), http.StatusInternalServerError)
// 			return
// 		}

// 		aesKey := os.Getenv("AES_KEY")
// 		if len(aesKey) != 32 {
// 			http.Error(w, "Invalid AES key", http.StatusInternalServerError)
// 			return
// 		}

// 		plain, err := deps.Decrypt(data, aesKey)
// 		if err != nil {
// 			http.Error(w, fmt.Sprintf("Decryption failed: %v", err), http.StatusInternalServerError)
// 			return
// 		}

// 		base64Data := base64.StdEncoding.EncodeToString(plain)
// 		res := DownloadResponse{
// 			FileName:    req.FileName,
// 			FileContent: base64Data,
// 			Nonce:       nonce,
// 		}

// 		w.Header().Set("Content-Type", "application/json")
// 		json.NewEncoder(w).Encode(res)
// 	}
// }

func DownloadHandler(w http.ResponseWriter, r *http.Request) {
	var req DownloadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.UserID == "" || req.FileId == "" {
		http.Error(w, "Missing userId or fileId", http.StatusBadRequest)
		return
	}
	log.Println("Got request:", req.UserID, req.FileId)

	var fileName, nonce, fileHash string
	err := DB.QueryRow(`
		SELECT file_name, nonce, file_hash FROM files
		WHERE owner_id = $1 AND id = $2
	`, req.UserID, req.FileId).Scan(&fileName, &nonce, &fileHash)

	if err != nil {
		log.Println("Failed to retrieve file metadata:", err)
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	log.Println("Found file:", fileName, "nonce:", nonce)

	// 🔁 Stream encrypted file from ownCloud
	stream, err := owncloud.DownloadFileStream(req.FileId, req.UserID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Download failed: %v", err), http.StatusInternalServerError)
		return
	}
	defer stream.Close()

	hasher := sha256.New()
    buffer := &bytes.Buffer{}
    tee := io.TeeReader(stream, hasher)

	// Copy encrypted data into buffer while hashing
    if _, err := io.Copy(buffer, tee); err != nil {
	    log.Println("Failed to read and hash encrypted stream:", err)
	    http.Error(w, "File read failed", http.StatusInternalServerError)
	    return
    }

	// Compare hash
	computedHash := hex.EncodeToString(hasher.Sum(nil))
	if computedHash != fileHash {
		log.Printf("Hash mismatch: expected %s, got %s", fileHash, computedHash)
		http.Error(w, "File integrity check failed", http.StatusConflict)
		return
	}

	log.Println("File integrity check passed, hash:", computedHash)
	log.Println("File hash matches:", fileHash)

	// 🔐 Decrypt while streaming
	aesKey := os.Getenv("AES_KEY")
	if len(aesKey) != 32 {
		http.Error(w, "Invalid AES key", http.StatusInternalServerError)
		return
	}

	decryptedReader, err := crypto.DecryptStream(buffer, aesKey)
	if err != nil {
		http.Error(w, fmt.Sprintf("Decryption setup failed: %v", err), http.StatusInternalServerError)
		return
	}

	// 📤 Stream plaintext file to client
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("X-File-Name", fileName)
	w.Header().Set("X-Nonce", nonce)

	if _, err := io.Copy(w, decryptedReader); err != nil {
		log.Println("Failed to stream decrypted file:", err)
		http.Error(w, "Streaming failed", http.StatusInternalServerError)
	}
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

	log.Println("Downloading file from path:", req.FilePath)

	// Use streaming download
	stream, err := owncloud.DownloadSentFileStream(req.FilePath)
	if err != nil {
		log.Println("Download Failed:", err)
		http.Error(w, fmt.Sprintf("Download failed: %v", err), http.StatusInternalServerError)
		return
	}
	defer stream.Close()

	w.Header().Set("Content-Type", "application/octet-stream")

	// Stream file directly to client
	if _, err := io.Copy(w, stream); err != nil {
		log.Println("Failed to stream file to response:", err)
		http.Error(w, "Failed to stream file", http.StatusInternalServerError)
	}
}