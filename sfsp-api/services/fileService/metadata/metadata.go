package metadata

import (
	//"context"
	"encoding/json"
	"net/http"
	//"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
	//"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/database"
	//"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
	//"go.mongodb.org/mongo-driver/bson"
	"log"
	//"fmt"
	"time"
	"database/sql"
	"github.com/lib/pq"
)

var DB *sql.DB

// SetPostgreClient sets the PostgreSQL client in the metadata package
func SetPostgreClient(db *sql.DB) {
	// This function is used to set the PostgreSQL client in the metadata package
	DB = db
}

type MetadataQueryRequest struct {
	UserID string `json:"userId"`
}

func GetUserFilesHandler(w http.ResponseWriter, r *http.Request) {
	var req MetadataQueryRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}
	userID := req.UserID
	if userID == "" {
		http.Error(w, "Missing userId parameter", http.StatusBadRequest)
		return
	}

	rows, err := DB.Query(`
		SELECT id, file_name, file_type, file_size, description, tags, created_at
		FROM files
		WHERE owner_id = $1
	`, userID)
	if err != nil {
		log.Println("PostgreSQL select error:", err)
		http.Error(w, "Failed to fetch metadata", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var files []map[string]interface{}

	for rows.Next() {
		var file map[string]interface{} = make(map[string]interface{})
		var (
			id, fileName, fileType, description, tags string
			fileSize                              int64
			createdAt                             time.Time
		)
		err := rows.Scan(&id, &fileName, &fileType, &fileSize, &description, &tags, &createdAt)
		if err != nil {
			log.Println("Row scan error:", err)
			continue
		}
		file["fileId"] = id
		file["fileName"] = fileName
		file["fileType"] = fileType
		file["fileSize"] = fileSize
		file["description"] = description
		file["tags"] = tags
		file["createdAt"] = createdAt

		files = append(files, file)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files)
}

func GetFileMetadataHandler(w http.ResponseWriter, r *http.Request) {
	type FileMetadataRequest struct {
		FileID string `json:"fileId"`
	}

	var req FileMetadataRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.FileID == "" {
		http.Error(w, "Missing fileId", http.StatusBadRequest)
		return
	}

	var (
		fileName, fileType, description string
		fileSize                        int64
		tags                            []string
		createdAt                       time.Time
	)

	err := DB.QueryRow(`
		SELECT file_name, file_type, file_size, description, tags, created_at
		FROM files
		WHERE id = $1
	`, req.FileID).Scan(&fileName, &fileType, &fileSize, &description, pq.Array(&tags), &createdAt)

	if err != nil {
		log.Println("PostgreSQL select error:", err)
		http.Error(w, "Metadata not found", http.StatusNotFound)
		return
	}

	// Build the response
	response := map[string]interface{}{
		"fileId":      req.FileID,
		"fileName":    fileName,
		"fileType":    fileType,
		"fileSize":    fileSize,
		"description": description,
		"tags":        tags,
		"createdAt":   createdAt,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func GetUserFileCountHandler(w http.ResponseWriter, r *http.Request) {
	var req MetadataQueryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.UserID == "" {
		http.Error(w, "Missing userId", http.StatusBadRequest)
		return
	}

	var count int
	err := DB.QueryRow(`SELECT COUNT(*) FROM files WHERE owner_id = $1`, req.UserID).Scan(&count)
	if err != nil {
		log.Println("PostgreSQL user count error:", err)
		http.Error(w, "Failed to retrieve file count", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]int{
		"userFileCount": count,
	})
}

type AddReceivedFileRequest struct {
	SenderID            string                 `json:"senderId"`
	RecipientID         string                 `json:"recipientId"`
	FileID              string                 `json:"fileId"`
	EncryptedFileKey    string                 `json:"encryptedFileKey"`
	X3DHEphemeralPubKey string                 `json:"x3dhEphemeralPubKey"`
	IdentityKeyPublic   string                 `json:"identityKeyPublic"`
	Metadata            map[string]interface{} `json:"metadata"` // optional
}


func AddReceivedFileHandler(w http.ResponseWriter, r *http.Request) {
	var req AddReceivedFileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.SenderID == "" || req.RecipientID == "" || req.FileID == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	metadataJSON, err := json.Marshal(req.Metadata)
	if err != nil {
		http.Error(w, "Failed to encode metadata", http.StatusInternalServerError)
		return
	}

	// Insert into received_files
	_, err = DB.Exec(`
		INSERT INTO received_files (
			sender_id, recipient_id, file_id, received_at, expires_at, metadata
		) VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '7 days', $4)
	`,
		req.SenderID,
		req.RecipientID,
		req.FileID,
		metadataJSON,
	)

	if err != nil {
		log.Println("PostgreSQL insert received_files error:", err)
		http.Error(w, "Failed to insert received file record", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "File shared with recipient",
	})
}

func GetPendingFilesHandler(w http.ResponseWriter, r *http.Request) {
	var req MetadataQueryRequest
	err := json.NewDecoder(r.Body).Decode(&req)
    if err != nil {
	log.Println("JSON decode error:", err)
	http.Error(w, "Invalid JSON payload, uswweiw", http.StatusBadRequest)
	return
    }


	if req.UserID == "" {
		http.Error(w, "Missing userId", http.StatusBadRequest)
		return
	}

	rows, err := DB.Query(`
		SELECT id, sender_id, file_id, received_at, expires_at
		FROM received_files
		WHERE recipient_id = $1 AND expires_at > NOW() AND accepted = FALSE
	`, req.UserID)
	if err != nil {
		log.Println("PostgreSQL select pending files error:", err)
		http.Error(w, "Failed to fetch pending files", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var pendingFiles []map[string]interface{}

	for rows.Next() {
		var file map[string]interface{} = make(map[string]interface{})
		var (
			id, senderID, fileID string
			receivedAt, expiresAt time.Time
		)
		err := rows.Scan(&id, &senderID, &fileID, &receivedAt, &expiresAt)
		if err != nil {
			log.Println("Row scan error:", err)
			continue
		}
		
		file["id"] = id
		file["senderId"] = senderID
		file["fileId"] = fileID
		file["receivedAt"] = receivedAt
		file["expiresAt"] = expiresAt

		pendingFiles = append(pendingFiles, file)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(pendingFiles)
}

func AddSentFileHandler(w http.ResponseWriter, r *http.Request) {
	type SentFileRequest struct {
		SenderID    string `json:"senderId"`
		RecipientID string `json:"recipientId"`
		FileID      string `json:"fileId"`
	}

	var req SentFileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.SenderID == "" || req.RecipientID == "" || req.FileID == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	_, err := DB.Exec(`
		INSERT INTO sent_files (sender_id, recipient_id, file_id, sent_at)
		VALUES ($1, $2, $3, NOW())
	`, req.SenderID, req.RecipientID, req.FileID)

	if err != nil {
		log.Println("PostgreSQL insert sent_files error:", err)
		http.Error(w, "Failed to insert sent file record", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "File sent successfully",
	})
}

func AcceptReceivedFileHandler(w http.ResponseWriter, r *http.Request) {
	type AcceptRequest struct {
		RecipientID string `json:"recipientId"`
		FileID      string `json:"fileId"`
	}

	var req AcceptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.RecipientID == "" || req.FileID == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	result, err := DB.Exec(`
		UPDATE received_files
		SET accepted = TRUE
		WHERE recipient_id = $1 AND file_id = $2
	`, req.RecipientID, req.FileID)

	if err != nil {
		log.Println("PostgreSQL accept update error:", err)
		http.Error(w, "Failed to update received file record", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "No matching record found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "File accepted successfully",
	})
}

func RejectReceivedFileHandler(w http.ResponseWriter, r *http.Request) {
	type RejectRequest struct {
		RecipientID string `json:"recipientId"`
		FileID      string `json:"fileId"`
	}

	var req RejectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.RecipientID == "" || req.FileID == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	if req.RecipientID == "" || req.FileID == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	result, err := DB.Exec(`
		DELETE FROM received_files
		WHERE recipient_id = $1 AND file_id = $2
	`, req.RecipientID, req.FileID)

	if err != nil {
		log.Println("PostgreSQL reject delete error:", err)
		http.Error(w, "Failed to delete received file record", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "No matching record found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "File rejected and removed",
	})
}

func GetSentFilesHandler(w http.ResponseWriter, r *http.Request) {
	var req MetadataQueryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.UserID == "" {
		http.Error(w, "Missing userId", http.StatusBadRequest)
		return
	}

	rows, err := DB.Query(`
		SELECT id, recipient_id, file_id, sent_at
		FROM sent_files
		WHERE sender_id = $1
	`, req.UserID)
	if err != nil {
		log.Println("PostgreSQL select sent_files error:", err)
		http.Error(w, "Failed to fetch sent files", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var sentFiles []map[string]interface{}

	for rows.Next() {
		var (
			id, recipientID, fileID string
			sentAt                  time.Time
		)

		err := rows.Scan(&id, &recipientID, &fileID, &sentAt)
		if err != nil {
			log.Println("Row scan error:", err)
			continue
		}

		sentFile := map[string]interface{}{
			"id":        id,
			"recipientId":          recipientID,
			"fileId":               fileID,
			"sentAt":               sentAt,
		}

		sentFiles = append(sentFiles, sentFile)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sentFiles)
}

