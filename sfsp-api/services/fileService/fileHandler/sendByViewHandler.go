package fileHandler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
)

func SendByViewHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		FileID          string                 `json:"fileId"`
		UserID          string                 `json:"userId"`
		RecipientUserID string                 `json:"recipientUserId"`
		EncryptedFile   string                 `json:"encryptedFile"`
		EncryptedAESKey string                 `json:"encryptedAesKey"`
		EKPublicKey     string                 `json:"ekPublicKey"`
		Metadata        map[string]interface{} `json:"metadata"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding request: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.FileID == "" || req.UserID == "" || req.RecipientUserID == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	fileID, err := uuid.Parse(req.FileID)
	if err != nil {
		http.Error(w, "Invalid file ID format", http.StatusBadRequest)
		return
	}
	senderID, err := uuid.Parse(req.UserID)
	if err != nil {
		http.Error(w, "Invalid sender ID format", http.StatusBadRequest)
		return
	}
	recipientID, err := uuid.Parse(req.RecipientUserID)
	if err != nil {
		http.Error(w, "Invalid recipient ID format", http.StatusBadRequest)
		return
	}

	tx, err := DB.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	var ownerID, fileName string
	err = tx.QueryRow("SELECT owner_id, file_name FROM files WHERE file_id = $1", fileID).Scan(&ownerID, &fileName)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "File Not Found", http.StatusNotFound)
			return
		}
		log.Printf("Error checking file ownership: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	if ownerID != req.UserID {
		http.Error(w, "Unauthorized: You can only share files you own", http.StatusForbidden)
		return
	}

	var recipientExists bool
	err = tx.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)", recipientID).Scan(&recipientExists)
	if err != nil {
		log.Printf("Error checking recipient existence: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	if !recipientExists {
		http.Error(w, "Recipient not found", http.StatusNotFound)
		return
	}

	metadataJSON, err := json.Marshal(req.Metadata)
	if err != nil {
		log.Printf("Error marshalling metadata: %v", err)
		http.Error(w, "Invalid metadata format", http.StatusBadRequest)
		return
	}

	viewSharedID := uuid.New()
	expiresAt := time.Now().Add(30 * 24 * time.Hour)

	_, err = tx.Exec(`INSERT INTO view_only_shares (id, sender_id, recipient_id, file_id, encrypted_file_key, x3dh_epheral_pubkey, expires_at, metadata)
			   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		viewSharedID, senderID, recipientID, fileID, req.EncryptedFile, req.EncryptedAESKey, expiresAt, metadataJSON)
	if err != nil {
		log.Printf("Error inserting view-only share: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	_, err = tx.Exec(`INSERT INTO received_files (recipient_id, sender_id, file_id, expires_at, metadata, permission_type)
			   VALUES ($1, $2, $3, $4, $5, $6)`,
		recipientID, senderID, fileID, expiresAt, metadataJSON, "view_only")
	if err != nil {
		log.Printf("Error inserting received file: %v", err)
		http.Error(w, "Failed to add to received files", http.StatusInternalServerError)
		return
	}

	if err = shareAccessLogsWithRecipient(tx, fileID, viewSharedID); err != nil {
		log.Printf("Error sharing access logs: %v", err)
		http.Error(w, "Failed to share access logs", http.StatusInternalServerError)
		return
	}

	if err = createNotification(tx, senderID, recipientID, fileName, fileID); err != nil {
		log.Printf("Error inserting notification: %v", err)
		http.Error(w, "Failed to create notification", http.StatusInternalServerError)
		return
	}

	if err = addAccessLog(tx, fileID, senderID, "shared_view_only", fmt.Sprintf("File shared with view-only access to user %s", recipientID)); err != nil {
		log.Printf("Error adding access log: %v", err)
		http.Error(w, "Failed to add access log", http.StatusInternalServerError)
		return
	}

	if err = tx.Commit(); err != nil {
		log.Printf("Error committing transaction: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message":  "File shared with view-only access successfully",
		"sharedId": viewSharedID.String(),
	})
}

func createNotification(tx *sql.Tx, senderID, recipientID uuid.UUID, fileName string, fileID uuid.UUID) error {
	notificationID := uuid.New()
	_, err := tx.Exec(`INSERT INTO notifications (id, type, "from", "to", file_name, file_id, message, status)
			   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		notificationID, "view_share_request", senderID, recipientID, fileName, fileID,
		"You have received a view-only file share", "pending")
	return err
}

func addAccessLog(tx *sql.Tx, fileID, userID uuid.UUID, action, message string) error {
	_, err := tx.Exec(`INSERT INTO access_logs (file_id, user_id, action, message)
			   VALUES ($1, $2, $3, $4)`,
		fileID, userID, action, message)
	return err
}

func shareAccessLogsWithRecipient(tx *sql.Tx, fileID uuid.UUID, viewShareID uuid.UUID) error {
	rows, err := tx.Query(`
		SELECT id FROM access_logs 
		WHERE file_id = $1 
		ORDER BY timestamp DESC`, fileID)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var accessLogID uuid.UUID
		if err := rows.Scan(&accessLogID); err != nil {
			return err
		}

		_, err = tx.Exec(`
			INSERT INTO shared_access_logs (view_share_id, access_log_id)
			VALUES ($1, $2)`,
			viewShareID, accessLogID)
		if err != nil {
			return err
		}
	}

	return rows.Err()
}

func ViewOnlyDownloadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		FileID string `json:"fileId"`
		UserID string `json:"userId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding request: %v", err)
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	var isViewOnly bool
	err := DB.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM view_only_shares 
			WHERE file_id = $1 AND recipient_id = $2 AND is_active = true
		)`, req.FileID, req.UserID).Scan(&isViewOnly)
	if err != nil {
		log.Printf("Error checking view-only status: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if isViewOnly {
		fileID, _ := uuid.Parse(req.FileID)
		userID, _ := uuid.Parse(req.UserID)

		_, err = DB.Exec(`
			INSERT INTO access_logs (file_id, user_id, action, message)
			VALUES ($1, $2, $3, $4)`,
			fileID, userID, "download_blocked", "Download blocked - view-only access")
		if err != nil {
			log.Printf("Error adding access log: %v", err)
		}

		http.Error(w, "Download not allowed for view-only files", http.StatusForbidden)
		return
	}

	http.Error(w, "Please use the regular download endpoint for full-access files", http.StatusBadRequest)
}
