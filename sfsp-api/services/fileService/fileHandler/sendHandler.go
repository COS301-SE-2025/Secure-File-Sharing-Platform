package fileHandler

import (
	"encoding/json"
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/metadata"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)

type SendFilePayload struct {
	FileID           string                 `json:"fileid"`
	FilePath         string                 `json:"filePath"`
	UserID           string                 `json:"userId"`
	RecipientID      string                 `json:"recipientUserId"`
	EncryptedFile    string                 `json:"encryptedFile"`       // base64
	EncryptedAESKey  string                 `json:"encryptedAesKey"`
	EKPublicKey      string                 `json:"ekPublicKey"`
	Metadata         map[string]interface{} `json:"metadata"`            // includes nonce, ikPub, etc.
}

func SendFileHandler(w http.ResponseWriter, r *http.Request) {
	var req SendFilePayload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	// Decode base64 file content
	fileBytes, err := base64.StdEncoding.DecodeString(req.EncryptedFile)
	if err != nil {
		log.Println("Failed to decode encrypted file:", err)
		http.Error(w, "Invalid encrypted file format", http.StatusBadRequest)
		return
	}

	// Upload to OwnCloud
	targetPath := fmt.Sprintf("files/%s/sent", req.UserID)
	if err := owncloud.UploadFile(targetPath, req.FileID, fileBytes); err != nil {
		log.Println("OwnCloud upload failed:", err)
		http.Error(w, "Failed to store encrypted file", http.StatusInternalServerError)
		return
	}

	metadataJSON, err := json.Marshal(req.Metadata)
    if err != nil {
	   log.Println("Failed to serialize metadata:", err)
	   http.Error(w, "Invalid metadata format", http.StatusBadRequest)
	   return
    }

	// Insert into received_files
	if err := metadata.InsertReceivedFile(
		DB,
		req.RecipientID,
		req.UserID,
		req.FileID,
		string(metadataJSON),   
		time.Now().Add(48*time.Hour),
	); err != nil {
		log.Println("Failed to insert received file:", err)
		http.Error(w, "Failed to track received file", http.StatusInternalServerError)
		return
	}

	fmt.Println("Metadata is: ",metadataJSON)

	// Insert into sent_files
	if err := metadata.InsertSentFile(
		DB,
		req.UserID,
		req.RecipientID,
		req.FileID,
		req.EncryptedAESKey,
		req.EKPublicKey,
	); err != nil {
		log.Println("Failed to insert sent file:", err)
	}

	// Respond
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "File sent successfully",
	})
	fmt.Println("File sent successfully")
}