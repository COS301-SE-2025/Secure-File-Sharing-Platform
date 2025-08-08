package fileHandler

import (
	"encoding/json"
	"log"
	"net/http"
)

type ChangeMethodRequest struct {
	FileID      string `json:"fileId"`
	UserID      string `json:"userId"`
	RecipientID string `json:"recipientId"`
	NewMethod   string `json:"newMethod"`
}

func ChangeShareMethod(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req ChangeMethodRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.FileID == "" || req.UserID == "" || req.RecipientID == "" || req.NewMethod == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	if req.NewMethod != "view" && req.NewMethod != "download" {
		http.Error(w, "Invalid method. Must be 'view' or 'download'", http.StatusBadRequest)
		return
	}

	var fileOwner string
	err := DB.QueryRow("SELECT user_id FROM files WHERE file_id = ?", req.FileID).Scan(&fileOwner)
	if err != nil {
		log.Printf("Error checking file ownership: %v", err)
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	if fileOwner != req.UserID {
		http.Error(w, "Unauthorized: You don't own this file", http.StatusForbidden)
		return
	}

	if req.NewMethod == "view" {
		err = ChangeToView(req.FileID, req.UserID, req.RecipientID)
	} else {
		err = ChangeToDownload(req.FileID, req.UserID, req.RecipientID)
	}

	if err != nil {
		log.Printf("Error changing share method: %v", err)
		http.Error(w, "Failed to change sharing method", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"success":   true,
		"message":   "Sharing method changed successfully",
		"newMethod": req.NewMethod,
	}

	json.NewEncoder(w).Encode(response)
}

func ChangeToView(fileID, userID, recipientID string) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.Exec("DELETE FROM shared_files WHERE file_id = ? AND shared_by = ? AND shared_with = ?",
		fileID, userID, recipientID)
	if err != nil {
		return err
	}

	_, err = tx.Exec(`INSERT INTO view_access (file_id, owner_id, recipient_id, granted_at, expires_at) 
		VALUES (?, ?, ?, CURRENT_TIMESTAMP, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 30 DAY))`,
		fileID, userID, recipientID)
	if err != nil {
		return err
	}

	_, err = tx.Exec(`UPDATE files SET tags = CASE 
		WHEN tags IS NULL OR tags = '' THEN '{view-only}' 
		WHEN tags NOT LIKE '%view-only%' THEN CONCAT(SUBSTRING(tags, 1, LENGTH(tags)-1), ',view-only}')
		ELSE tags 
		END WHERE file_id = ?`, fileID)
	if err != nil {
		return err
	}

	_, err = tx.Exec(`INSERT INTO access_logs (file_id, user_id, action, message, timestamp) 
		VALUES (?, ?, 'method_changed', 'Sharing method changed from download to view-only', CURRENT_TIMESTAMP)`,
		fileID, userID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func ChangeToDownload(fileID, userID, recipientID string) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.Exec("DELETE FROM view_access WHERE file_id = ? AND owner_id = ? AND recipient_id = ?",
		fileID, userID, recipientID)
	if err != nil {
		return err
	}

	_, err = tx.Exec(`INSERT INTO shared_files (file_id, shared_by, shared_with, shared_at) 
		VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
		fileID, userID, recipientID)
	if err != nil {
		return err
	}

	_, err = tx.Exec(`UPDATE files SET tags = CASE 
		WHEN tags LIKE '{view-only}' THEN NULL
		WHEN tags LIKE '%,view-only}' THEN REPLACE(tags, ',view-only', '')
		WHEN tags LIKE '{view-only,%' THEN REPLACE(tags, 'view-only,', '')
		ELSE tags 
		END WHERE file_id = ?`, fileID)
	if err != nil {
		return err
	}

	_, err = tx.Exec(`INSERT INTO access_logs (file_id, user_id, action, message, timestamp) 
		VALUES (?, ?, 'method_changed', 'Sharing method changed from view-only to download', CURRENT_TIMESTAMP)`,
		fileID, userID)
	if err != nil {
		return err
	}

	return tx.Commit()
}
