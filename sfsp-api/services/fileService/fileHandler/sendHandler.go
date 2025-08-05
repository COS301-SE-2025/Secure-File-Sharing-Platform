package fileHandler

import (
	"encoding/json"
	//"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"time"
	"strconv"
	"io"
        "crypto/sha256"
        "encoding/hex"

	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/metadata"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)



func SendFileHandler(w http.ResponseWriter, r *http.Request) {
    log.Println("==== New SendFile Request ====")

    // 1️⃣ Parse multipart form
    err := r.ParseMultipartForm(50 << 20) // 50MB memory buffer
    if err != nil {
        log.Println("❌ Failed to parse multipart form:", err)
        http.Error(w, "Invalid multipart form", http.StatusBadRequest)
        return
    }

    // 2️⃣ Extract fields
    fileID := r.FormValue("fileId")
    userID := r.FormValue("userId")
    recipientID := r.FormValue("recipientUserId")
    metadataJSON := r.FormValue("metadata")
    chunkIndexStr := r.FormValue("chunkIndex")
    totalChunksStr := r.FormValue("totalChunks")

    log.Printf("Parsed form: fileId=%s userId=%s recipientID=%s metadata=%s chunk=%s/%s",
        fileID, userID, recipientID, metadataJSON, chunkIndexStr, totalChunksStr)

    if fileID == "" || userID == "" || recipientID == "" || metadataJSON == "" {
        http.Error(w, "Missing required form fields", http.StatusBadRequest)
        return
    }

    // 3️⃣ Parse chunk numbers
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

    // 4️⃣ Read chunk
    srcFile, header, err := r.FormFile("encryptedFile")
    if err != nil {
        log.Println("❌ Missing encrypted file:", err)
        http.Error(w, "Missing encrypted file", http.StatusBadRequest)
        return
    }
    defer srcFile.Close()
    log.Printf("📦 Received chunk %d/%d for file %s", chunkIndex+1, totalChunks, header.Filename)

    // 5️⃣ Upload chunk to temp folder
    tempChunkName := fmt.Sprintf("%s_chunk_%d", fileID, chunkIndex)
    if err := owncloud.UploadFileStream("temp", tempChunkName, srcFile); err != nil {
        log.Println("❌ Failed to upload chunk to OwnCloud:", err)
        http.Error(w, "Chunk upload failed", http.StatusInternalServerError)
        return
    }

    // 6️⃣ If not last chunk → ACK only
    if chunkIndex != totalChunks-1 {
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]string{
            "message": fmt.Sprintf("Chunk %d uploaded", chunkIndex),
            "fileId":  fileID,
        })
        return
    }

    // 7️⃣ Create metadata entry in files table first (satisfies FK constraints)
    var sentFileID string
    err = DB.QueryRow(`
        INSERT INTO files (owner_id, file_name, file_type, file_hash, nonce, description, tags, cid, file_size, created_at)
        VALUES ($1,$2,$3,'','', $4, ARRAY['sent'], '', 0, NOW())
        RETURNING id
    `, userID, header.Filename, "application/octet-stream", metadataJSON).Scan(&sentFileID)
    if err != nil {
        log.Println("❌ Failed to insert file metadata:", err)
        http.Error(w, "Failed to insert file metadata", http.StatusInternalServerError)
        return
    }

    log.Println("✅ File metadata inserted into files table, ID:", sentFileID)

    // 8️⃣ Merge chunks in a goroutine while streaming to final sent folder
    finalReader, finalWriter := io.Pipe()
    go func() {
        defer finalWriter.Close()
        hasher := sha256.New()
        countingWriter := &CountingWriter{w: io.MultiWriter(finalWriter, hasher)}

        for i := 0; i < totalChunks; i++ {
            chunkPath := fmt.Sprintf("temp/%s_chunk_%d", fileID, i)
            reader, err := owncloud.DownloadFileStreamTemp(chunkPath)
            if err != nil {
                log.Println("❌ Failed to read temp chunk:", err)
                finalWriter.CloseWithError(err)
                return
            }
            _, err = io.Copy(countingWriter, reader)
            reader.Close()
            if err != nil {
                log.Println("❌ Failed to copy chunk:", err)
                finalWriter.CloseWithError(err)
                return
            }
            owncloud.DeleteFileTemp(chunkPath) // cleanup
        }

        finalHash := hex.EncodeToString(hasher.Sum(nil))
        log.Println("✅ Final merged file hash:", finalHash)

        // Update file hash and size in DB
        _, err = DB.Exec(`
            UPDATE files
            SET file_hash=$1, file_size=$2, cid=$3
            WHERE id=$4
        `, finalHash, countingWriter.Count,
            fmt.Sprintf("sent/%s", userID, sentFileID), sentFileID)
        if err != nil {
            log.Println("⚠️ Failed to update final file hash/size:", err)
        }

        // Insert into sent_files and received_files for tracking
        receivedID, err := metadata.InsertReceivedFile(
            DB,
            recipientID,
            userID,
            sentFileID,
            metadataJSON,
            time.Now().Add(48*time.Hour),
        )
        if err != nil {
            log.Println("⚠️ Failed to insert into received_files:", err)
        }

        if err := metadata.InsertSentFile(DB, userID, recipientID, sentFileID, metadataJSON); err != nil {
            log.Println("⚠️ Failed to insert into sent_files:", err)
        }

        log.Println("📦 File send DB tracking complete. receivedID:", receivedID)
    }()

    // 9️⃣ Stream merged file to OwnCloud "sent" folder
    sentPath := fmt.Sprintf("files/%s/sent", userID)
    if err := owncloud.UploadFileStream(sentPath, sentFileID, finalReader); err != nil {
        log.Println("❌ Failed to upload final file to OwnCloud:", err)
        http.Error(w, "File assembly failed", http.StatusInternalServerError)
        return
    }

    // 🔟 Respond success
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{
        "message": "File sent successfully",
        "fileId":  sentFileID,
    })
    log.Println("🎉 File sent successfully:", sentFileID)
}

