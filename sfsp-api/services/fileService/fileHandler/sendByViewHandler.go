package fileHandler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)

func SendByViewHandler(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form data
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

	// Verify user owns the file
	var ownerID string
	err = DB.QueryRow("SELECT owner_id FROM files WHERE id = $1", fileID).Scan(&ownerID)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "File not found", http.StatusNotFound)
			return
		}
		log.Println("Database error:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if ownerID != userID {
		http.Error(w, "Unauthorized: You don't own this file", http.StatusForbidden)
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

	log.Println("Received encrypted file for view sharing, len:", len(fileBytes))

	// Upload to OwnCloud in a view-only specific path
	targetPath := fmt.Sprintf("files/%s/shared_view", userID)
	sharedFileKey := fmt.Sprintf("%s_%s", fileID, recipientID)
	if err := owncloud.UploadFile(targetPath, sharedFileKey, fileBytes); err != nil {
		log.Println("OwnCloud upload failed:", err)
		http.Error(w, "Failed to store encrypted file", http.StatusInternalServerError)
		return
	}

	// Check if already shared with this recipient
	var existingID string
	err = DB.QueryRow(`
		SELECT id FROM shared_files_view 
		WHERE sender_id = $1 AND recipient_id = $2 AND file_id = $3 AND revoked = FALSE
	`, userID, recipientID, fileID).Scan(&existingID)

	switch err {
	case nil:
		// Already shared, update the metadata
		_, err = DB.Exec(`
			UPDATE shared_files_view 
			SET metadata = $1, shared_at = CURRENT_TIMESTAMP, expires_at = $2
			WHERE id = $3
		`, metadataJSON, time.Now().Add(48*time.Hour), existingID)
		if err != nil {
			log.Println("Failed to update shared file:", err)
			http.Error(w, "Failed to update shared file", http.StatusInternalServerError)
			return
		}
	case sql.ErrNoRows:
		// Insert new shared file record
		_, err = DB.Exec(`
			INSERT INTO shared_files_view (sender_id, recipient_id, file_id, metadata, expires_at)
			VALUES ($1, $2, $3, $4, $5)
		`, userID, recipientID, fileID, metadataJSON, time.Now().Add(48*time.Hour))
		if err != nil {
			log.Println("Failed to insert shared file view:", err)
			http.Error(w, "Failed to track shared file", http.StatusInternalServerError)
			return
		}
	default:
		log.Println("Database error:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Mark file as allowing view sharing
	_, err = DB.Exec("UPDATE files SET allow_view_sharing = TRUE WHERE id = $1", fileID)
	if err != nil {
		log.Println("Failed to update file view sharing flag:", err)
	}

	// Add access log for sharing action
	_, err = DB.Exec(`
		INSERT INTO access_logs (file_id, user_id, action, message, view_only)
		VALUES ($1, $2, $3, $4, $5)
	`, fileID, userID, "shared_view", fmt.Sprintf("File shared with user %s for view-only access", recipientID), true)
	if err != nil {
		log.Println("Failed to log sharing action:", err)
	}

	// Respond
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "File shared for view-only access successfully",
	})
	log.Println("File shared for view-only access successfully")
}

func RevokeViewAccessHandler(w http.ResponseWriter, r *http.Request) {
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

	// Verify user owns the file
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

	// Revoke access
	result, err := DB.Exec(`
		UPDATE shared_files_view 
		SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP, access_granted = FALSE
		WHERE sender_id = $1 AND recipient_id = $2 AND file_id = $3 AND revoked = FALSE
	`, req.UserID, req.RecipientID, req.FileID)

	if err != nil {
		log.Println("Failed to revoke access:", err)
		http.Error(w, "Failed to revoke access", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "No active sharing found to revoke", http.StatusNotFound)
		return
	}

	// Add access log
	_, err = DB.Exec(`
		INSERT INTO access_logs (file_id, user_id, action, message, view_only)
		VALUES ($1, $2, $3, $4, $5)
	`, req.FileID, req.UserID, "revoked_view", fmt.Sprintf("View access revoked for user %s", req.RecipientID), true)
	if err != nil {
		log.Println("Failed to log revoke action:", err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "View access revoked successfully",
	})
}

func GetSharedViewFilesHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID string `json:"userId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.UserID == "" {
		http.Error(w, "Missing userId", http.StatusBadRequest)
		return
	}

	rows, err := DB.Query(`
		SELECT svf.id, svf.sender_id, svf.file_id, svf.metadata, svf.shared_at, svf.expires_at,
			   f.file_name, f.file_type, f.file_size, f.description
		FROM shared_files_view svf
		JOIN files f ON svf.file_id = f.id
		WHERE svf.recipient_id = $1 OR svf.sender_id = $1 AND svf.revoked = FALSE AND svf.access_granted = TRUE
		AND (svf.expires_at IS NULL OR svf.expires_at > CURRENT_TIMESTAMP)
		ORDER BY svf.shared_at DESC
	`, req.UserID)

	if err != nil {
		log.Println("Failed to get shared view files:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var files []map[string]interface{}
	for rows.Next() {
		var (
			shareID, senderID, fileID, fileName, fileType, description string
			fileSize                                                   int64
			metadata                                                   string
			sharedAt                                                   time.Time
			expiresAtPtr                                               *time.Time
		)
		err := rows.Scan(
			&shareID, &senderID, &fileID, &metadata,
			&sharedAt, &expiresAtPtr, &fileName, &fileType,
			&fileSize, &description,
		)
		if err != nil {
			log.Println("Failed to scan row:", err)
			continue
		}

		file := map[string]interface{}{
			"share_id":    shareID,
			"sender_id":   senderID,
			"file_id":     fileID,
			"metadata":    metadata,
			"shared_at":   sharedAt,
			"file_name":   fileName,
			"file_type":   fileType,
			"file_size":   fileSize,
			"description": description,
			"view_only":   true,
		}
		if expiresAtPtr != nil {
			file["expires_at"] = *expiresAtPtr
		}

		files = append(files, file)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files)
}

func GetViewFileAccessLogs(w http.ResponseWriter, r *http.Request) {
	var req struct {
		FileID string `json:"fileId"`
		UserID string `json:"userId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	rows, err := DB.Query(`
		SELECT id, action, message, timestamp
		FROM access_logs
		WHERE file_id = $1 AND user_id = $2 AND view_only = TRUE
		ORDER BY timestamp DESC
		`, req.FileID, req.UserID)

	if err != nil {
		log.Println("Failed to query access logs", err)
		http.Error(w, "Database Error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var logs []map[string]interface{}
	for rows.Next() {
		var id, action, message string
		var timestamp time.Time

		if err := rows.Scan(&id, &action, &message, &timestamp); err != nil {
			log.Println("Failed to scan access log:", err)
			continue
		}

		logs = append(logs, map[string]interface{}{
			"id":        id,
			"action":    action,
			"message":   message,
			"timestamp": timestamp,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(logs)
}
