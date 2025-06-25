package fileHandler

import (
	"encoding/json"
	"log"
	"net/http"
)

// Notification represents a notification object based on the database schema
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

// GET /notifications
// Retrieves notifications for a user based on their ID
func NotificationHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	// Get user ID from query params
	userID := r.URL.Query().Get("id")
	if userID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Missing user ID",
		})
		return
	}

	// Check if DB client is initialized
	if DB == nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Database not initialized",
		})
		return
	}

	// Query the database for notifications where the user is the recipient
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

// POST /notifications/markAsRead
// Marks a notification as read
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

// POST /notifications/respond
// Responds to a share request notification
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

	// Validate status
	if req.Status != "accepted" && req.Status != "declined" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid status. Must be 'accepted' or 'declined'",
		})
		return
	}

	// Check if DB client is initialized
	if DB == nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Database not initialized",
		})
		return
	}

	// Update the notification status
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

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Notification status updated",
	})
}

// POST /notifications/clear
// Deletes a notification
func ClearNotificationHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	// Parse request body
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

	// Check if DB client is initialized
	if DB == nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Database not initialized",
		})
		return
	}

	// Delete the notification
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

// AddNotificationHandler - helper function to add a notification
func AddNotificationHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	// Parse request body
	var notification struct {
		Type     string `json:"type"`
		From     string `json:"from"`
		To       string `json:"to"`
		FileName string `json:"file_name"`
		FileID   string `json:"file_id"`
		Message  string `json:"message"`
	}

	if err := json.NewDecoder(r.Body).Decode(&notification); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid request body",
		})
		return
	}

	// Validate required fields
	if notification.Type == "" || notification.From == "" || notification.To == "" ||
		notification.FileName == "" || notification.FileID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Missing required fields",
		})
		return
	}

	// Check if DB client is initialized
	if DB == nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Database not initialized",
		})
		return
	}

	var notificationID string
	err := DB.QueryRow(`INSERT INTO notifications 
		(type, "from", "to", file_name, file_id, message, status) 
		VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING id`,
		notification.Type, notification.From, notification.To,
		notification.FileName, notification.FileID, notification.Message).Scan(&notificationID)

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
