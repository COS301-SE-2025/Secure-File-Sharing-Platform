package fileHandler

import (
	"encoding/json"
	//"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/metadata"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)

func SendFileHandler(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(50 << 20) // 50 MB memory buffer (adjust as needed)
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

	// 🔹 Step 1: Stream file directly from form
	file, _, err := r.FormFile("encryptedFile")
	if err != nil {
		log.Println("Failed to get encrypted file:", err)
		http.Error(w, "Missing encrypted file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// 🔹 Step 2: Upload via stream (no buffering in memory)
	targetPath := fmt.Sprintf("files/%s/sent", userID)
	log.Println("Streaming file to ownCloud path:", targetPath)

	if err := owncloud.UploadFileStream(targetPath, fileID, file); err != nil {
		log.Println("OwnCloud stream upload failed:", err)
		http.Error(w, "Failed to store encrypted file", http.StatusInternalServerError)
		return
	}

	// 🔹 Step 3: Track in database
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

	// ✅ Final response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message":        "File sent successfully",
		"receivedFileID": receivedID,
	})
	log.Println("File sent successfully")
}
