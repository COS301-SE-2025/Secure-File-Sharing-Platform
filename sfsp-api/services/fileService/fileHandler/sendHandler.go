package fileHandler

import (
	"encoding/json"
	//"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"time"
	"io"
	"os"
	"bytes"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/metadata"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)

func SendFileHandler(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(50 << 20) // 50 MB buffer, should match frontend config
	if err != nil {
		log.Println("Failed to parse multipart form:", err)
		http.Error(w, "Invalid multipart form", http.StatusBadRequest)
		return
	}

	fileID := r.FormValue("fileid")
	userID := r.FormValue("userId")
	recipientID := r.FormValue("recipientUserId")
	metadataJSON := r.FormValue("metadata")

	if fileID == "" || userID == "" || recipientID == "" || metadataJSON == "" {
		http.Error(w, "Missing required form fields", http.StatusBadRequest)
		return
	}

	// 🔹 Step 1: Get file part
	srcFile, _, err := r.FormFile("encryptedFile")
	if err != nil {
		log.Println("Failed to get encrypted file:", err)
		http.Error(w, "Missing encrypted file", http.StatusBadRequest)
		return
	}
	defer srcFile.Close()

	// 🔹 Step 2: Write to temporary buffer (avoids full in-memory)
	tmpFile, err := os.CreateTemp("", "send-*.bin")
	if err != nil {
		http.Error(w, "Failed to create temp file", http.StatusInternalServerError)
		return
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()

	written, err := io.Copy(tmpFile, srcFile)
	if err != nil {
		http.Error(w, "Failed to stream uploaded file", http.StatusInternalServerError)
		log.Println("Failed to copy to temp file:", err)
		return
	}
	log.Printf("Streamed %d bytes for sending\n", written)

	// 🔹 Step 3: Upload to ownCloud
	targetPath := fmt.Sprintf("files/%s/sent", userID)

	tmpFile.Seek(0, io.SeekStart)
	buf := &bytes.Buffer{}
	if _, err := io.Copy(buf, tmpFile); err != nil {
		log.Println("Failed to read temp file for final upload:", err)
		http.Error(w, "Internal file read error", http.StatusInternalServerError)
		return
	}

	if err := owncloud.UploadFile(targetPath, fileID, buf.Bytes()); err != nil {
		log.Println("OwnCloud upload failed:", err)
		http.Error(w, "Failed to store encrypted file", http.StatusInternalServerError)
		return
	}

	// 🔹 Step 4: DB metadata
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
		// Not fatal
	}

	// ✅ Respond
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message":        "File sent successfully",
		"receivedFileID": receivedID,
	})

	log.Println("File sent successfully")
}


