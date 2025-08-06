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
    fileID := r.FormValue("fileId") // ✅ new
    uploadPath := r.FormValue("path")
    if uploadPath == "" {
        uploadPath = "files"
    }

    log.Printf("📦 Parsed form: userId=%s, fileName=%s, fileHash=%s, chunk=%s/%s, fileId=%s",
        userId, fileName, fileHash, chunkIndexStr, totalChunksStr, fileID)

    // 3️⃣ Validate required fields
    if userId == "" || fileName == "" || fileHash == "" || nonce == "" {
        log.Println("❌ Missing required fields")
        http.Error(w, "Missing required fields", http.StatusBadRequest)
        return
    }

    if nonce == "" {
    log.Println("❌ Missing nonce")
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
    log.Println("When uploading the nonce is:", nonce)

    // 7️⃣ Handle fileID and DB row
    if fileID == "" {
        if chunkIndex == 0 {
            // Insert metadata and get fileID
            log.Println("📝 Creating new file metadata row...")
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
            log.Println("❌ Missing fileId for non-first chunk")
            http.Error(w, "fileId is required for parallel upload", http.StatusBadRequest)
            return
        }
    }

    // 8️⃣ Upload chunk to OwnCloud temp folder
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
            "message":  fmt.Sprintf("Chunk %d uploaded", chunkIndex),
            "fileHash": fileHash,
            "fileId":   fileID,
        })
        return
    }

    // 🔟 Last chunk → merge using low-memory streaming
    log.Println("🔗 Starting file merge (streaming)...")

    // Open writer to final OwnCloud file
    writer, err := owncloud.CreateFileStream("files", fileID)
    if err != nil {
        log.Println("❌ OwnCloud final upload failed:", err)
        http.Error(w, "File assembly failed", http.StatusInternalServerError)
        return
    }
    defer writer.Close()

    hasher := sha256.New()
    countingWriter := &CountingWriter{w: io.MultiWriter(writer, hasher)}

    for i := 0; i < totalChunks; i++ {
        chunkPath := fmt.Sprintf("temp/%s_chunk_%d", fileID, i)
        log.Println("🔄 Merging chunk:", chunkPath)

        reader, err := owncloud.DownloadFileStreamTemp(chunkPath)
        if err != nil {
            log.Println("❌ Failed to open chunk:", err)
            http.Error(w, "Chunk merge failed", http.StatusInternalServerError)
            return
        }

        if _, err := io.Copy(countingWriter, reader); err != nil {
            reader.Close()
            log.Println("❌ Failed to copy chunk:", err)
            http.Error(w, "Chunk merge failed", http.StatusInternalServerError)
            return
        }
        reader.Close()

        // Delete temp chunk after successful copy
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

    log.Println("🎉 File uploaded successfully:", fileID)
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{
        "message": "File uploaded and metadata stored",
        "fileId":  fileID,
    })
}

type StartUploadRequest struct {
    UserID          string   `json:"userId"`
    FileName        string   `json:"fileName"`
    FileType        string   `json:"fileType"`
    FileDescription string   `json:"fileDescription"`
    FileTags        []string `json:"fileTags"`
    Path            string   `json:"path"`
    Nonce           string   `json:"nonce"`
}

func StartUploadHandler(w http.ResponseWriter, r *http.Request) {
    log.Println("==== Start Upload Request ====")

    
    var req StartUploadRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        log.Println("❌ Invalid JSON:", err)
        http.Error(w, "Invalid JSON body", http.StatusBadRequest)
        return
    }

    log.Println("userId is :", req.UserID)
    log.Println("Filename is :", req.FileName)
    log.Println("fileType is :", req.FileType)
    log.Println("description is: ", req.FileDescription)

    if req.UserID == "" || req.FileName == "" {
        http.Error(w, "Missing userId or fileName", http.StatusBadRequest)
        return
    }

    // Insert initial metadata with empty hash and size 0
    log.Println("Made it to inserting file metadata in the database")
    var fileID string
    err := DB.QueryRow(`
        INSERT INTO files (owner_id, file_name, file_type, file_hash, nonce, description, tags, cid, file_size, created_at)
        VALUES ($1,$2,$3,'',$4,$5,$6,$7,0,$8)
        RETURNING id
    `, req.UserID, req.FileName, req.FileType,req.Nonce ,req.FileDescription, pq.Array(req.FileTags), req.Path, time.Now()).Scan(&fileID)
    if err != nil {
        log.Println("❌ DB insert error:", err)
        http.Error(w, "Failed to start upload", http.StatusInternalServerError)
        return
    }

    log.Println("✅ Upload started, fileID:", fileID)
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{
        "message": "Upload session started",
        "fileId":  fileID,
    })
}
