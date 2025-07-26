package fileHandler

import (
	"encoding/json"
	//"encoding/base64"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/metadata"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)

func SendFileHandler(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form data
	log.Println("The sending got here")
	err := r.ParseMultipartForm(50 << 20) // allow up to 50 MB
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

	// Retrieve binary file
	file, _, err := r.FormFile("encryptedFile")
	if err != nil {
		log.Println("Failed to get encrypted file from form:", err)
		http.Error(w, "Missing encrypted file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		log.Println("Failed to read encrypted file:", err)
		http.Error(w, "Failed to read uploaded file", http.StatusInternalServerError)
		return
	}

	log.Println("Received encrypted file, len:", len(fileBytes))
	log.Println("Metadata JSON:", metadataJSON)

	// Upload to OwnCloud
	targetPath := fmt.Sprintf("files/%s/sent", userID)
	if err := owncloud.UploadFile(targetPath, fileID, fileBytes); err != nil {
		log.Println("OwnCloud upload failed:", err)
		http.Error(w, "Failed to store encrypted file", http.StatusInternalServerError)
		return
	}

	// Insert into received_files
	if err := metadata.InsertReceivedFile(
		DB,
		recipientID,
		userID,
		fileID,
		metadataJSON,
		time.Now().Add(48*time.Hour),
	); err != nil {
		log.Println("Failed to insert received file:", err)
		http.Error(w, "Failed to track received file", http.StatusInternalServerError)
		return
	}

	// Insert into sent_files
	if err := metadata.InsertSentFile(
		DB,
		userID,
		recipientID,
		fileID,
		metadataJSON,
	); err != nil {
		log.Println("Failed to insert sent file:", err)
	}

	// Respond
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "File sent successfully",
	})
	log.Println("File sent successfully")
}
