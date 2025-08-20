package fileHandler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

type Notification struct {
	ID        string `json:"id"`
	Type      string `json:"type"`
	From      string `json:"from"`
	To        string `json:"to"`
	FileName  string `json:"file_name"`
	FileID    string `json:"file_id"`
	Message   string `json:"message"`
	Timestamp string `json:"timestamp"`
	Status    string `json:"status"`
	Read      bool   `json:"read"`
}

func NotificationHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	userID := r.URL.Query().Get("id")
	if userID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Missing user ID",
		})
		return
	}

	if DB == nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Database not initialized",
		})
		return
	}

	rows, err := DB.Query(`SELECT id, type, "from", "to", file_name, file_id, message, timestamp, status, read 
		FROM notifications WHERE "to" = $1`, userID)
	if err != nil {
		log.Printf("Error querying notifications: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Failed to fetch notifications",
		})
		return
	}
	defer rows.Close()

	notifications := []Notification{}
	for rows.Next() {
		var n Notification
		if err := rows.Scan(&n.ID, &n.Type, &n.From, &n.To, &n.FileName, &n.FileID, &n.Message, &n.Timestamp, &n.Status, &n.Read); err != nil {
			log.Printf("Error scanning notification row: %v", err)
			continue
		}
		notifications = append(notifications, n)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":       true,
		"notifications": notifications,
	})
}

func MarkAsReadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	var req struct {
		ID string `json:"id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid request body",
		})
		return
	}

	if req.ID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Missing notification ID",
		})
		return
	}

	if DB == nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Database not initialized",
		})
		return
	}

	result, err := DB.Exec("UPDATE notifications SET read = TRUE WHERE id = $1", req.ID)
	if err != nil {
		log.Printf("Error updating notification read status: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Failed to update notification",
		})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Notification not found",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Notification marked as read",
	})
}

func RespondToShareRequestHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	var req struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid request body",
		})
		return
	}

	if req.ID == "" || req.Status == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Missing ID or status",
		})
		return
	}

	if req.Status != "accepted" && req.Status != "declined" && req.Status != "pending" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid status. Must be 'accepted' or 'declined' or 'pending'",
		})
		return
	}

	if DB == nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Database not initialized",
		})
		return
	}

	// ✅ Update notification status
	result, err := DB.Exec("UPDATE notifications SET status = $1, read = TRUE WHERE id = $2", req.Status, req.ID)
	if err != nil {
		log.Printf("Error updating notification status: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Failed to update notification",
		})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Notification not found",
		})
		return
	}

	//fetch the file id from the god damn notifications table
	if req.Status == "accepted" {
		var fileID, metadata, senderId, recipientId string
		var receivedFileId sql.NullString
		var isViewOnly = false

		// Step 1: Get notification info
		err := DB.QueryRow(`
		SELECT n.file_id, n."from", n."to", n."received_file_id"
		FROM notifications n
		WHERE n.id = $1
	`, req.ID).Scan(&fileID, &senderId, &recipientId, &receivedFileId)

		if err != nil {
			log.Printf("Error fetching notification info: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   "Failed to retrieve notification info",
			})
			return
		}

		if receivedFileId.Valid {
			err = DB.QueryRow(`
				SELECT metadata
				FROM received_files
				WHERE file_id = $1 AND recipient_id = $2 AND id = $3
			`, fileID, recipientId, receivedFileId.String).Scan(&metadata)
		} else {
			isViewOnly = true
			err = DB.QueryRow(`
			SELECT metadata 
			FROM shared_files_view
			WHERE sender_id = $1 AND recipient_id = $2 AND file_id = $3
		`, senderId, recipientId, fileID).Scan(&metadata)
		}

		if err != nil {
			log.Printf("Error fetching received file metadata: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   "Failed to retrieve file metadata",
			})
			return
		}

		// Step 3: Get file info from files table
		var fileName, fileType, fileCID string
		var fileSize int64

		err = DB.QueryRow(`
		SELECT file_name, file_type, cid, file_size
		FROM files
		WHERE id = $1
	`, fileID).Scan(&fileName, &fileType, &fileCID, &fileSize)

		if err != nil {
			log.Printf("Error fetching file details: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   "Failed to retrieve file details",
			})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Notification status updated",
			"fileData": map[string]interface{}{
				"file_id":      fileID,
				"sender_id":    senderId,
				"recipient_id": recipientId,
				"file_name":    fileName,
				"file_type":    fileType,
				"cid":          fileCID,
				"file_size":    fileSize,
				"metadata":     metadata,
				"viewOnly":     isViewOnly,
			},
		})
		return
	}
}

func ClearNotificationHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	var req struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid request body",
		})
		return
	}

	if req.ID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Missing notification ID",
		})
		return
	}

	if DB == nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Database not initialized",
		})
		return
	}

	result, err := DB.Exec("DELETE FROM notifications WHERE id = $1", req.ID)
	if err != nil {
		log.Printf("Error deleting notification: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Failed to delete notification",
		})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Notification not found",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Notification deleted",
	})
}

func AddNotificationHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	var notification struct {
		Type           string `json:"type"`
		From           string `json:"from"`
		To             string `json:"to"`
		FileName       string `json:"file_name"`
		FileID         string `json:"file_id"`
		Message        string `json:"message"`
		ReceivedFileID string `json:"receivedFileID"`
		ViewOnly       bool   `json:"viewOnly"`
	}

	if err := json.NewDecoder(r.Body).Decode(&notification); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid request body",
		})
		return
	}

	if notification.Type == "" || notification.From == "" || notification.To == "" ||
		notification.FileName == "" || notification.FileID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Missing required fields",
		})
		fmt.Println("Notification details:", notification)
		return
	}

	if DB == nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Database not initialized",
		})
		return
	}

	var notificationID string
	var err error

	if notification.ViewOnly || notification.ReceivedFileID == "" {
		err = DB.QueryRow(`INSERT INTO notifications 
			(type, "from", "to", file_name, file_id, message, status) 
			VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING id`,
			notification.Type, notification.From, notification.To,
			notification.FileName, notification.FileID, notification.Message).Scan(&notificationID)
	} else {
		err = DB.QueryRow(`INSERT INTO notifications 
			(type, "from", "to", file_name, file_id, received_file_id, message, status) 
			VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING id`,
			notification.Type, notification.From, notification.To,
			notification.FileName, notification.FileID, notification.ReceivedFileID, notification.Message).Scan(&notificationID)
	}

	if err != nil {
		log.Printf("Error adding notification: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Failed to add notification",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Notification added",
		"id":      notificationID,
	})
}
