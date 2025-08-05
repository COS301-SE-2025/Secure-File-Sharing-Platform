package fileHandler

import (
	//"context"
	//"database/sql"
	//"encoding/base64"
	"encoding/json"
	//"fmt"
	"log"
	"net/http"
	//"os"
	"time"
	"io"
	"strconv"
	"fmt"

	//"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/crypto"
	//"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/database"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"

	"github.com/lib/pq"
	"database/sql"
	//"strings"
	"crypto/sha256"
	"encoding/hex"
	//"bytes"
)

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
    log.Println("==== New Upload Request ====")

    // 1️⃣ Parse multipart form
    if err := r.ParseMultipartForm(50 << 20); err != nil {
        log.Println("❌ Failed to parse multipart form:", err)
        http.Error(w, "Failed to parse multipart form", http.StatusBadRequest)
        return
    }

    // 2️⃣ Extract fields
    userId := r.FormValue("userId")
    fileName := r.FormValue("fileName")
    fileType := r.FormValue("fileType")
    fileHash := r.FormValue("fileHash")
    nonce := r.FormValue("nonce")
    description := r.FormValue("fileDescription")
    tagsRaw := r.FormValue("fileTags")
    chunkIndexStr := r.FormValue("chunkIndex")
    totalChunksStr := r.FormValue("totalChunks")
    uploadPath := r.FormValue("path")
    if uploadPath == "" {
        uploadPath = "files"
    }

    log.Printf("📦 Parsed form: userId=%s, fileName=%s, fileHash=%s, chunk=%s/%s",
        userId, fileName, fileHash, chunkIndexStr, totalChunksStr)

    // 3️⃣ Validate required fields
    if userId == "" || fileName == "" || fileHash == "" || nonce == "" {
        log.Println("❌ Missing required fields")
        http.Error(w, "Missing required fields", http.StatusBadRequest)
        return
    }

    // 4️⃣ Parse integers
    chunkIndex, err := strconv.Atoi(chunkIndexStr)
    if err != nil {
        http.Error(w, "Invalid chunkIndex", http.StatusBadRequest)
        return
    }
    totalChunks, err := strconv.Atoi(totalChunksStr)
    if err != nil {
        http.Error(w, "Invalid totalChunks", http.StatusBadRequest)
        return
    }

    // 5️⃣ Parse tags JSON
    var tags []string
    if tagsRaw != "" {
        if err := json.Unmarshal([]byte(tagsRaw), &tags); err != nil {
            log.Println("❌ Invalid fileTags JSON:", tagsRaw)
            http.Error(w, "Invalid fileTags JSON", http.StatusBadRequest)
            return
        }
    }

    // 6️⃣ Read encrypted chunk
    srcFile, header, err := r.FormFile("encryptedFile")
    if err != nil {
        log.Println("❌ Missing encrypted file:", err)
        http.Error(w, "Missing encrypted file", http.StatusBadRequest)
        return
    }
    defer srcFile.Close()
    log.Println("✅ Received chunk file:", header.Filename)

    // 7️⃣ If first chunk, insert metadata now to get fileID
    var fileID string
    if chunkIndex == 0 {
        log.Println("📝 Inserting initial metadata row...")
        err = DB.QueryRow(`
            INSERT INTO files (owner_id, file_name, file_type, file_hash, nonce, description, tags, cid, file_size, created_at)
            VALUES ($1,$2,$3,'',$4,$5,$6,'',0,$7)
            RETURNING id
        `, userId, fileName, fileType, nonce, description, pq.Array(tags), time.Now()).Scan(&fileID)
        if err != nil {
            log.Println("❌ DB insert error:", err)
            http.Error(w, "Failed to create file metadata", http.StatusInternalServerError)
            return
        }
        log.Println("✅ File metadata created, fileID:", fileID)
    } else {
        // Query the last fileID for this user/fileName
        err = DB.QueryRow(`SELECT id FROM files WHERE owner_id=$1 AND file_name=$2 ORDER BY created_at DESC LIMIT 1`, userId, fileName).Scan(&fileID)
        if err != nil {
            log.Println("❌ Failed to retrieve existing fileID for chunk:", err)
            http.Error(w, "File session not found", http.StatusBadRequest)
            return
        }
    }

    // 8️⃣ Upload chunk to OwnCloud temp folder using fileID
    chunkFileName := fmt.Sprintf("%s_chunk_%d", fileID, chunkIndex)
    log.Println("⬆️  Uploading chunk to OwnCloud temp:", chunkFileName)
    if err := owncloud.UploadFileStream("temp", chunkFileName, srcFile); err != nil {
        log.Println("❌ Failed to upload chunk to OwnCloud:", err)
        http.Error(w, "Chunk upload failed", http.StatusInternalServerError)
        return
    }

    // 9️⃣ If not last chunk → acknowledge
    if chunkIndex != totalChunks-1 {
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]string{
            "message": fmt.Sprintf("Chunk %d uploaded", chunkIndex),
            "fileHash": fileHash,
        })
        return
    }

    // 🔟 Last chunk → start merge
    finalReader, finalWriter := io.Pipe()
    go func() {
        defer finalWriter.Close()
        hasher := sha256.New()
        countingWriter := &CountingWriter{w: io.MultiWriter(finalWriter, hasher)}

        for i := 0; i < totalChunks; i++ {
            chunkPath := fmt.Sprintf("temp/%s_chunk_%d", fileID, i)
            log.Println("🔄 Merging chunk:", chunkPath)
            reader, err := owncloud.DownloadFileStreamTemp(chunkPath)
            if err != nil {
                finalWriter.CloseWithError(err)
                return
            }
            _, err = io.Copy(countingWriter, reader)
            reader.Close()
            if err != nil {
                finalWriter.CloseWithError(err)
                return
            }
            owncloud.DeleteFileTemp(chunkPath)
        }

        fileHashHex := hex.EncodeToString(hasher.Sum(nil))
        log.Println("🔗 Final file hash:", fileHashHex)
        log.Printf("📦 Final merged size: %d bytes", countingWriter.Count)

        _, err = DB.Exec(`
            UPDATE files SET file_hash=$1, file_size=$2, cid=$3 WHERE id=$4
        `, fileHashHex, countingWriter.Count, uploadPath+"/"+fileID, fileID)
        if err != nil {
            log.Println("❌ DB update error:", err)
        } else {
            log.Println("✅ File metadata updated with final size and hash")
        }
    }()

    // 1️⃣1️⃣ Stream merged file to OwnCloud final folder
    if err := owncloud.UploadFileStream("files", fileID, finalReader); err != nil {
        log.Println("❌ OwnCloud final upload failed:", err)
        http.Error(w, "File assembly failed", http.StatusInternalServerError)
        return
    }

    log.Println("🎉 File uploaded successfully:", fileID)
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{
        "message": "File uploaded and metadata stored",
        "fileId":  fileID,
    })
}

