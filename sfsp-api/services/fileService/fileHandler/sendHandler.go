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
        //"crypto/sha256"
        //"encoding/hex"

	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/metadata"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)




func SendFileHandler(w http.ResponseWriter, r *http.Request) {
    log.Println("==== New SendFile Request ====")

    err := r.ParseMultipartForm(50 << 20) // 50 MB buffer
    if err != nil {
        log.Println("Failed to parse multipart form:", err)
        http.Error(w, "Invalid multipart form", http.StatusBadRequest)
        return
    }

    fileID := r.FormValue("fileid")
    userID := r.FormValue("userId")
    recipientID := r.FormValue("recipientUserId")
    metadataJSON := r.FormValue("metadata")
    chunkIndexStr := r.FormValue("chunkIndex")
    totalChunksStr := r.FormValue("totalChunks")

    if fileID == "" || userID == "" || recipientID == "" || metadataJSON == "" {
        http.Error(w, "Missing required form fields", http.StatusBadRequest)
        return
    }

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

    // 🔹 Step 1: Get encrypted chunk
    file, _, err := r.FormFile("encryptedFile")
    if err != nil {
        log.Println("Failed to get encrypted file chunk:", err)
        http.Error(w, "Missing encrypted file chunk", http.StatusBadRequest)
        return
    }
    defer func() {
        if err := file.Close(); err != nil {
            log.Println("error closing file:", err)
        }
    }()

    // 🔹 Step 2: Upload chunk to OwnCloud temp folder
    tempChunkName := fmt.Sprintf("%s_chunk_%d", fileID, chunkIndex)
    if err := owncloud.UploadFileStream("temp", tempChunkName, file); err != nil {
        log.Println("OwnCloud temp chunk upload failed:", err)
        http.Error(w, "Chunk upload failed", http.StatusInternalServerError)
        return
    }

    // 🔹 Step 3: If not last chunk → ACK only
    if chunkIndex != totalChunks-1 {
        w.Header().Set("Content-Type", "application/json")
        if err := json.NewEncoder(w).Encode(map[string]string{
            "message": fmt.Sprintf("Chunk %d uploaded", chunkIndex),
            "fileId":  fileID,
        }); err != nil {
            log.Println("Failed to encode response:", err)
        }
        return
    }

    // 🔹 Step 4: Merge chunks to final sent path
    log.Println("🔗 Merging chunks for file:", fileID)
    finalReader, finalWriter := io.Pipe()

    go func() {
        defer func() {
            if err := finalWriter.Close(); err != nil {
                log.Println("error closing final writer:", err)
            }
        }()

        for i := 0; i < totalChunks; i++ {
            chunkPath := fmt.Sprintf("temp/%s_chunk_%d", fileID, i)
            reader, err := owncloud.DownloadFileStreamTemp(chunkPath)
            if err != nil {
                log.Println("Failed to download temp chunk:", err)
                finalWriter.CloseWithError(err)
                return
            }

            if _, err := io.Copy(finalWriter, reader); err != nil {
                log.Println("Failed to copy chunk to writer:", err)
                if err := reader.Close(); err != nil {
                    log.Println("error closing reader:", err)
                }
                finalWriter.CloseWithError(err)
                return
            }
            if err := reader.Close(); err != nil {
                log.Println("error closing reader:", err)
            }
            if err := owncloud.DeleteFileTemp(chunkPath); err != nil {
                log.Println("Failed to cleanup chunk:", err)
            }
        }

        log.Println("✅ Finished merging chunks for file:", fileID)
    }()

    // 🔹 Step 5: Stream merged file to final sent folder
    sentPath := fmt.Sprintf("files/%s/sent", userID)
    if err := owncloud.UploadFileStream(sentPath, fileID, finalReader); err != nil {
        log.Println("OwnCloud final upload failed:", err)
        http.Error(w, "Failed to store encrypted file", http.StatusInternalServerError)
        return
    }

    // 🔹 Step 6: Track in DB (sent_files + received_files)
    receivedID, err := metadata.InsertReceivedFile(
        DB,
        recipientID,
        userID,
        fileID,
        metadataJSON,
        time.Now().Add(48*time.Hour),
    )
    if err != nil {
        log.Println("Failed to insert received file:", err)
        http.Error(w, "Failed to track received file", http.StatusInternalServerError)
        return
    }

    if err := metadata.InsertSentFile(
        DB,
        userID,
        recipientID,
        fileID,
        metadataJSON,
    ); err != nil {
        log.Println("Failed to insert sent file:", err)
    }

    // ✅ Final response
    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(map[string]string{
        "message":        "File sent successfully",
        "receivedFileID": receivedID,
    }); err != nil {
        log.Println("Failed to encode response:", err)
    }
    log.Println("🎉 File sent successfully:", fileID)
}
