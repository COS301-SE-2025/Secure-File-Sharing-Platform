package fileHandler

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
)

//var DB DBInterface = nil

func AddAccesslogHandler(w http.ResponseWriter, r *http.Request) {
	type reqBody struct {
		FileID  string `json:"file_id"`
		UserID  string `json:"user_id"`
		Action  string `json:"action"`
		MESSAGE string `json:"message"`
	}
	var req reqBody
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}
	if req.FileID == "" || req.UserID == "" || req.Action == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}
	_, err := DB.Exec(`INSERT INTO access_logs (file_id, user_id, action, message) VALUES ($1, $2, $3, $4)`, req.FileID, req.UserID, req.Action, req.MESSAGE)
	if err != nil {
		log.Println("Failed to insert access log:", err)
		http.Error(w, "Failed to add access log", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Access log added successfully"})
}

func GetAccessLogsHandler(w http.ResponseWriter, r *http.Request) {
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

	if req.FileID == "" || req.UserID == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	fileID, err := uuid.Parse(req.FileID)
	if err != nil {
		http.Error(w, "Invalid file ID format", http.StatusBadRequest)
		return
	}

	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		http.Error(w, "Invalid user ID format", http.StatusBadRequest)
		return
	}

	var hasAccess bool
	err = DB.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM files WHERE id = $1 AND owner_id = $2
			UNION
			SELECT 1 FROM view_only_shares WHERE file_id = $1 AND recipient_id = $2 AND is_active = true
		)`, fileID, userID).Scan(&hasAccess)
	if err != nil {
		log.Printf("Error checking file access: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if !hasAccess {
		http.Error(w, "Unauthorized: You don't have access to this file", http.StatusForbidden)
		return
	}

	var accessLogs []map[string]interface{}

	var isOwner bool
	err = DB.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM files WHERE id = $1 AND owner_id = $2)`, fileID, userID).Scan(&isOwner)
	if err != nil {
		log.Printf("Error checking ownership: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	var rows *sql.Rows
	if isOwner {
		rows, err = DB.Query(`
			SELECT al.id, al.user_id, al.action, al.message, al.timestamp, u.id as user_id
			FROM access_logs al
			LEFT JOIN users u ON al.user_id = u.id
			WHERE al.file_id = $1
			ORDER BY al.timestamp DESC`, fileID)
	} else {
		rows, err = DB.Query(`
			SELECT al.id, al.user_id, al.action, al.message, al.timestamp, u.id as user_id
			FROM access_logs al
			LEFT JOIN users u ON al.user_id = u.id
			INNER JOIN shared_access_logs sal ON al.id = sal.access_log_id
			INNER JOIN view_only_shares vos ON sal.view_share_id = vos.id
			WHERE vos.file_id = $1 AND vos.recipient_id = $2 AND vos.is_active = true
			ORDER BY al.timestamp DESC`, fileID, userID)
	}

	if err != nil {
		log.Printf("Error fetching access logs: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var logID, logUserID, action, message string
		var timestamp time.Time
		var userIDPtr *string

		err := rows.Scan(&logID, &logUserID, &action, &message, &timestamp, &userIDPtr)
		if err != nil {
			log.Printf("Error scanning access log: %v", err)
			continue
		}

		accessLog := map[string]interface{}{
			"id":        logID,
			"user_id":   logUserID,
			"action":    action,
			"message":   message,
			"timestamp": timestamp,
		}

		accessLogs = append(accessLogs, accessLog)
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error iterating access logs: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"accessLogs": accessLogs,
		"isOwner":    isOwner,
	})
}

func GetAccesslogHandler(w http.ResponseWriter, r *http.Request) {
	fileID := r.URL.Query().Get("file_id")
	var rows *sql.Rows
	var err error
	if fileID != "" {
		rows, err = DB.Query(`SELECT id, file_id, user_id, action, message, timestamp FROM access_logs WHERE file_id = $1 ORDER BY timestamp DESC`, fileID)
	} else {
		rows, err = DB.Query(`SELECT id, file_id, user_id, action, message, timestamp FROM access_logs ORDER BY timestamp DESC`)
	}
	if err != nil {
		log.Println("Failed to query access logs:", err)
		http.Error(w, "Failed to get access logs", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	logs := []map[string]any{}
	for rows.Next() {
		var id, fileID, userID, action, message string
		var timestamp string
		if err := rows.Scan(&id, &fileID, &userID, &action, &message, &timestamp); err != nil {
			log.Println("Failed to scan access log row:", err)
			continue
		}
		logs = append(logs, map[string]any{
			"id":        id,
			"file_id":   fileID,
			"user_id":   userID,
			"action":    action,
			"message":   message,
			"timestamp": timestamp,
		})
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(logs)
}
