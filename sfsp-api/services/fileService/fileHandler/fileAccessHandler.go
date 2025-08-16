package fileHandler

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
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

func GetUsersWithFileAccessHandler(w http.ResponseWriter, r *http.Request) {
	fileID := r.URL.Query().Get("fileId")
	if fileID == "" {
		http.Error(w, "fileId is required", http.StatusBadRequest)
		return
	}

	var ownerID string
	err := DB.QueryRow(`SELECT owner_id FROM files WHERE id = $1`, fileID).Scan(&ownerID)
	if err != nil {
		log.Println("Failed to get file owner:", err)
		http.Error(w, "Failed to get file owner", http.StatusInternalServerError)
		return
	}

	rows, err := DB.Query(`SELECT DISTINCT user_id FROM access_logs WHERE file_id = $1`, fileID)
	if err != nil {
		log.Println("Failed to query users with file access:", err)
		http.Error(w, "Failed to get users with file access", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	users := []string{}
	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			log.Println("Failed to scan user ID:", err)
			continue
		}
		users = append(users, userID)
	}

	var response = map[string]any{
		"owner": ownerID,
		"users": users,
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
