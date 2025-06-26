package fileHandler

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
)

// Exported database interface variable for use in main and tests
// var DB DBInterface

type DBInterface interface {
	Exec(query string, args ...any) (sql.Result, error)
	Query(query string, args ...any) (*sql.Rows, error)
}

// func SetPostgreClient(db DBInterface) {
// 	DB = db
// }

// --- Request Types ---
type addAccessLogRequest struct {
	FileID  string `json:"file_id"`
	UserID  string `json:"user_id"`
	Action  string `json:"action"`
	MESSAGE string `json:"message"`
}

type accessLog struct {
	ID        string `json:"id"`
	FileID    string `json:"file_id"`
	UserID    string `json:"user_id"`
	Action    string `json:"action"`
	Message   string `json:"message"`
	Timestamp string `json:"timestamp"`
}

// --- Handlers ---

func AddAccesslogHandler(w http.ResponseWriter, r *http.Request) {
	var req addAccessLogRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.FileID == "" || req.UserID == "" || req.Action == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	_, err := DB.Exec(`INSERT INTO access_logs (file_id, user_id, action, message) VALUES ($1, $2, $3, $4)`,
		req.FileID, req.UserID, req.Action, req.MESSAGE)
	if err != nil {
		log.Println("Failed to insert access log:", err)
		http.Error(w, "Failed to add access log", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
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

	var logs []accessLog

	for rows.Next() {
		var logRow accessLog
		if err := rows.Scan(&logRow.ID, &logRow.FileID, &logRow.UserID, &logRow.Action, &logRow.Message, &logRow.Timestamp); err != nil {
			log.Println("Failed to scan access log row:", err)
			continue
		}
		logs = append(logs, logRow)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(logs)
}
