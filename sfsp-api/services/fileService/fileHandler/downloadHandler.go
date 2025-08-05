package fileHandler

import (
	//"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"log"
	//"os"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
	//"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/crypto"
	"database/sql"
	"io"
	"crypto/sha256"
	"encoding/hex"
	//"bytes"
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
    log.Println("Got download request:", req.UserID, req.FileId)

    var fileName, nonce, fileHash string
    err := DB.QueryRow(`
        SELECT file_name, nonce, file_hash FROM files
        WHERE owner_id = $1 AND id = $2
    `, req.UserID, req.FileId).Scan(&fileName, &nonce, &fileHash)

    if err != nil {
        log.Println("❌ Failed to retrieve file metadata:", err)
        http.Error(w, "File not found", http.StatusNotFound)
        return
    }
    log.Println("✅ Found file:", fileName, "nonce:", nonce)

    // 🔁 Stream file directly from OwnCloud (no decryption for integrity-only mode)
    stream, err := owncloud.DownloadFileStream(req.FileId)
    if err != nil {
        log.Println("❌ OwnCloud download failed:", err)
        http.Error(w, "Download failed", http.StatusInternalServerError)
        return
    }
    defer stream.Close()

    // Prepare hash verification
    hasher := sha256.New()
    tee := io.TeeReader(stream, hasher)

    // Set headers to satisfy Node API expectations
    w.Header().Set("Content-Type", "application/octet-stream")
    w.Header().Set("X-File-Name", fileName)
    w.Header().Set("X-Nonce", nonce) // still returned, even if unused
    w.WriteHeader(http.StatusOK)

    // Stream to client
    if _, err := io.Copy(w, tee); err != nil {
        log.Println("❌ Failed to stream file:", err)
        return
    }

    // Verify integrity after streaming
    computedHash := hex.EncodeToString(hasher.Sum(nil))
    if computedHash != fileHash {
        log.Printf("❌ Hash mismatch: expected %s, got %s", fileHash, computedHash)
    } else {
        fmt.Println("✅ File integrity check passed, hash:", computedHash)
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
        http.Error(w, "Missing FilePath", http.StatusBadRequest)
        return
    }

    log.Println("Downloading the sent file request:", req.FilePath)

    // 3️⃣ Stream file from OwnCloud
    stream, err := owncloud.DownloadSentFileStream(req.FilePath)
    if err != nil {
        log.Println("❌ OwnCloud download failed:", err)
        http.Error(w, "Download failed", http.StatusInternalServerError)
        return
    }
    defer stream.Close()

    hasher := sha256.New()
    tee := io.TeeReader(stream, hasher)

    w.Header().Set("Content-Type", "application/octet-stream")
    w.WriteHeader(http.StatusOK)

    if _, err := io.Copy(w, tee); err != nil {
	    log.Println("❌ Failed to stream file:", err)
        return
    }
}

