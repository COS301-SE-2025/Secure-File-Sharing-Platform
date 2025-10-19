package fileHandler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/metadata"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)

func ChangeShareMethodHandler(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(50 << 20) // 50 MB memory buffer (adjust as needed)
	if err != nil {
		log.Println("Failed to parse multipart form:", err)
		http.Error(w, "Invalid multipart form", http.StatusBadRequest)
		return
	}

	FileID := r.FormValue("fileid")
	UserID := r.FormValue("userId")
	RecipientID := r.FormValue("recipientId")
	NewShareMethod := r.FormValue("newShareMethod")
	metadataJSON := r.FormValue("metadata")

	if FileID == "" || UserID == "" || RecipientID == "" || NewShareMethod == "" || metadataJSON == "" {
		http.Error(w, "Missing required form fields", http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("encryptedFile")
	if err != nil {
		log.Println("Failed to get encrypted file:", err)
		http.Error(w, "Missing encrypted file", http.StatusBadRequest)
		return
	}
	defer func() {
		if err := file.Close(); err != nil {
			log.Println("error closing file:", err)
		}
	}()

	if NewShareMethod != "view" && NewShareMethod != "download" {
		http.Error(w, "Invalid share method. Use 'view' or 'download'", http.StatusBadRequest)
		return
	}

	var ownerID string
	err = DB.QueryRow("SELECT owner_id FROM files WHERE id = $1", FileID).Scan(&ownerID)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "File not found", http.StatusNotFound)
			return
		}
		log.Println("Database error:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if ownerID != UserID {
		http.Error(w, "Unauthorized: You don't own this file", http.StatusForbidden)
		return
	}

	currentMethod, err := getCurrentShareMethod(FileID, UserID, RecipientID)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "No active sharing found between these users", http.StatusNotFound)
			return
		}
		log.Println("Error checking current share method:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if currentMethod == NewShareMethod {
		http.Error(w, fmt.Sprintf("File is already shared using %s method", NewShareMethod), http.StatusBadRequest)
		return
	}

	var responseMessage string
	switch NewShareMethod {
	case "view":
		if err := convertToViewShare(FileID, UserID, RecipientID, metadataJSON); err != nil {
			log.Println("Failed to convert to view share:", err)
			http.Error(w, "Failed to convert to view sharing", http.StatusInternalServerError)
			return
		}
		responseMessage = "Successfully converted to view-only sharing"
	case "download":
		if err := convertToDownloadShare(FileID, UserID, RecipientID, metadataJSON); err != nil {
			log.Println("Failed to convert to download share:", err)
			http.Error(w, "Failed to convert to download sharing", http.StatusInternalServerError)
			return
		}
		responseMessage = "Successfully converted to download sharing"
	}

	_, err = DB.Exec(`
		INSERT INTO access_logs (file_id, user_id, action, message, view_only)
		VALUES ($1, $2, $3, $4, $5)
	`, FileID, UserID, "share_method_changed",
		fmt.Sprintf("Share method changed from %s to %s for user %s", currentMethod, NewShareMethod, RecipientID),
		NewShareMethod == "view")
	if err != nil {
		log.Println("Failed to log share method change:", err)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]string{
		"message":        responseMessage,
		"previousMethod": currentMethod,
		"newMethod":      NewShareMethod,
	}); err != nil {
		log.Println("Failed to encode response:", err)
	}
}

func getCurrentShareMethod(fileID, userID, recipientID string) (string, error) {

	var viewShareID string
	err := DB.QueryRow(`
		SELECT id FROM shared_files_view 
		WHERE sender_id = $1 AND recipient_id = $2 AND file_id = $3 AND revoked = FALSE
	`, userID, recipientID, fileID).Scan(&viewShareID)

	if err == nil {
		return "view", nil
	} else if err != sql.ErrNoRows {
		return "", err
	}

	var receivedFileID string
	err = DB.QueryRow(`
		SELECT id FROM received_files 
		WHERE receiver_id = $1 AND sender_id = $2 AND file_id = $3
	`, recipientID, userID, fileID).Scan(&receivedFileID)

	if err == nil {
		return "download", nil
	} else if err != sql.ErrNoRows {
		return "", err
	}

	return "", sql.ErrNoRows
}

func convertToViewShare(fileID, userID, recipientID, metadataJSON string) error {
	tx, err := DB.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		if err := tx.Rollback(); err != nil {
			log.Println("Rollback error (may be expected if already committed):", err)
		}
	}()

	sourcePath := fmt.Sprintf("files/%s/sent/%s", userID, fileID)
	stream, err := owncloud.DownloadSentFileStream(sourcePath)
	if err != nil {
		return fmt.Errorf("failed to download file for conversion: %w", err)
	}
	defer func() {
		if err := stream.Close(); err != nil {
			log.Println("error closing stream:", err)
		}
	}()

	targetPath := fmt.Sprintf("files/%s/shared_view", userID)
	sharedFileKey := fmt.Sprintf("%s_%s", fileID, recipientID)
	if err := owncloud.UploadFileStream(targetPath, sharedFileKey, stream); err != nil {
		return fmt.Errorf("failed to upload to view directory: %w", err)
	}

	_, err = tx.Exec(`
		DELETE FROM received_files 
		WHERE receiver_id = $1 AND sender_id = $2 AND file_id = $3
	`, recipientID, userID, fileID)
	if err != nil {
		return fmt.Errorf("failed to remove from received_files: %w", err)
	}

	_, err = tx.Exec(`
		DELETE FROM sent_files 
		WHERE sender_id = $1 AND recipient_id = $2 AND file_id = $3
	`, userID, recipientID, fileID)
	if err != nil {
		return fmt.Errorf("failed to remove from sent_files: %w", err)
	}

	_, err = tx.Exec(`
		INSERT INTO shared_files_view (sender_id, recipient_id, file_id, metadata, expires_at, access_granted)
		VALUES ($1, $2, $3, $4, $5, TRUE)
	`, userID, recipientID, fileID, metadataJSON, time.Now().Add(48*time.Hour))
	if err != nil {
		return fmt.Errorf("failed to insert into shared_files_view: %w", err)
	}

	_, err = tx.Exec("UPDATE files SET allow_view_sharing = TRUE WHERE id = $1", fileID)
	if err != nil {
		return fmt.Errorf("failed to update file view sharing flag: %w", err)
	}

	return tx.Commit()
}

func convertToDownloadShare(fileID, userID, recipientID, metadataJSON string) error {
	tx, err := DB.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		if err := tx.Rollback(); err != nil {
			log.Println("Rollback error (may be expected if already committed):", err)
		}
	}()

	sourcePath := fmt.Sprintf("files/%s/shared_view/%s_%s", userID, fileID, recipientID)
	stream, err := owncloud.DownloadSentFileStream(sourcePath)
	if err != nil {
		return fmt.Errorf("failed to download file for conversion: %w", err)
	}
	defer func() {
		if err := stream.Close(); err != nil {
			log.Println("error closing stream:", err)
		}
	}()

	targetPath := fmt.Sprintf("files/%s/sent", userID)
	if err := owncloud.UploadFileStream(targetPath, fileID, stream); err != nil {
		return fmt.Errorf("failed to upload to sent directory: %w", err)
	}

	_, err = tx.Exec(`
		UPDATE shared_files_view 
		SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP, access_granted = FALSE
		WHERE sender_id = $1 AND recipient_id = $2 AND file_id = $3 AND revoked = FALSE
	`, userID, recipientID, fileID)
	if err != nil {
		return fmt.Errorf("failed to revoke view access: %w", err)
	}

	receivedID, err := metadata.InsertReceivedFile(
		DB,
		recipientID,
		userID,
		fileID,
		metadataJSON,
		time.Now().Add(48*time.Hour),
	)
	if err != nil {
		return fmt.Errorf("failed to insert received file: %w", err)
	}

	if err := metadata.InsertSentFile(DB, userID, recipientID, fileID, metadataJSON); err != nil {
		return fmt.Errorf("failed to insert sent file: %w", err)
	}

	log.Printf("Converted to download share, receivedID: %s", receivedID)

	sharePath := fmt.Sprintf("files/%s/shared_view/%s_%s", userID, fileID, recipientID)
	log.Printf("Deleting view file from storage: %s", sharePath)
	if err := owncloud.DeleteFile(fmt.Sprintf("%s_%s", fileID, recipientID), fmt.Sprintf("files/%s/shared_view", userID)); err != nil {
		log.Printf("Warning: Failed to delete view file from storage: %v", err)

	}

	return tx.Commit()
}

func GetShareMethodHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		FileID      string `json:"fileId"`
		UserID      string `json:"userId"`
		RecipientID string `json:"recipientId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.FileID == "" || req.UserID == "" || req.RecipientID == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	var ownerID string
	err := DB.QueryRow("SELECT owner_id FROM files WHERE id = $1", req.FileID).Scan(&ownerID)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "File not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if ownerID != req.UserID {
		http.Error(w, "Unauthorized", http.StatusForbidden)
		return
	}

	currentMethod, err := getCurrentShareMethod(req.FileID, req.UserID, req.RecipientID)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "No active sharing found", http.StatusNotFound)
			return
		}
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]string{
		"fileId":      req.FileID,
		"shareMethod": currentMethod,
		"canConvert":  "true",
	}); err != nil {
		log.Println("Failed to encode response:", err)
	}
}
