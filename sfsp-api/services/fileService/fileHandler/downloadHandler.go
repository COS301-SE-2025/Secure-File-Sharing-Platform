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
	//"database/sql"
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

    var fileName, nonce, fileHash, cid string
    err := DB.QueryRow(`
        SELECT file_name, nonce, file_hash, cid FROM files
        WHERE owner_id = $1 AND id = $2
    `, req.UserID, req.FileId).Scan(&fileName, &nonce, &fileHash, &cid)
    if err != nil {
        log.Println("❌ Failed to retrieve file metadata:", err)
        http.Error(w, "File not found", http.StatusNotFound)
        return
    }

    log.Println("✅ Found file:", fileName, "nonce:", nonce, "cid:", cid)

    // 🔁 Stream file from OwnCloud final location
    stream, err := owncloud.DownloadFileStream(req.FileId)
    if err != nil {
        log.Println("❌ OwnCloud download failed:", err)
        http.Error(w, "Download failed", http.StatusInternalServerError)
        return
    }
    defer stream.Close()

    // Hash verification while streaming
    hasher := sha256.New()
    tee := io.TeeReader(stream, hasher)

    log.Println("Filename is:", fileName)
    log.Println("Nonce is: ",nonce)

    // HTTP headers for browser & Node client
    w.Header().Set("Content-Type", "application/octet-stream")
    w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, fileName))
    w.Header().Set("X-File-Name", fileName)
    w.Header().Set("X-Nonce", nonce)
    w.WriteHeader(http.StatusOK)

    // Stream file to client with buffer
    buf := make([]byte, 32*1024)
    if _, err := io.CopyBuffer(w, tee, buf); err != nil {
        log.Println("❌ Failed to stream file:", err)
        return
    }

    // Verify hash at the end
    computedHash := hex.EncodeToString(hasher.Sum(nil))
    if computedHash != fileHash {
        log.Printf("❌ Hash mismatch: expected %s, got %s", fileHash, computedHash)
    } else {
        log.Println("✅ File integrity check passed, hash:", computedHash)
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

    log.Println("Downloading sent file (stream):", req.FilePath)

    stream, err := owncloud.DownloadSentFileStream(req.FilePath)
    if err != nil {
        log.Println("OwnCloud download failed:", err)
        http.Error(w, "Download failed", http.StatusInternalServerError)
        return
    }
    defer stream.Close()

    w.Header().Set("Content-Type", "application/octet-stream")
    w.WriteHeader(http.StatusOK)

    hasher := sha256.New()
    tee := io.TeeReader(stream, hasher)

    if _, err := io.Copy(w, tee); err != nil {
        log.Println("Failed to stream sent file:", err)
        return
    }

    computedHash := hex.EncodeToString(hasher.Sum(nil))
    log.Println("Sent file streamed successfully, you should watch Delicious in Dungeon. Hash:", computedHash)
}

