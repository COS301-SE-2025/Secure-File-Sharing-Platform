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
	"fmt"
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

func ListFileMetadataHandler(w http.ResponseWriter, r *http.Request) {
	type MetadataRequest struct {
		UserID string `json:"userId"`
	}

	var req MetadataRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.UserID == "" {
		http.Error(w, "Missing userId", http.StatusBadRequest)
		return
	}

	rows, err := DB.Query(`
		SELECT id, file_name, file_type, file_size, description, tags, created_at
		FROM files
		WHERE owner_id = $1
	`, req.UserID)
	if err != nil {
		log.Println("PostgreSQL query error:", err)
		http.Error(w, "Failed to fetch metadata", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type FileMetadata struct {
		FileID      string    `json:"fileId"`
		FileName    string    `json:"fileName"`
		FileType    string    `json:"fileType"`
		FileSize    int64     `json:"fileSize"`
		Description string    `json:"description"`
		Tags        []string  `json:"tags"`
		CreatedAt   time.Time `json:"createdAt"`
	}

	var files []FileMetadata

	for rows.Next() {
		var file FileMetadata
		if err := rows.Scan(
			&file.FileID,
			&file.FileName,
			&file.FileType,
			&file.FileSize,
			&file.Description,
			pq.Array(&file.Tags),
			&file.CreatedAt,
		); err != nil {
			log.Println("Row scan error:", err)
			continue
		}
		files = append(files, file)
	}

	if err = rows.Err(); err != nil {
		log.Println("Row iteration error:", err)
		http.Error(w, "Error reading file data", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files) // ✅ returns a proper array
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
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Println("JSON decode error:", err)
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.UserID == "" {
		http.Error(w, "Missing userId", http.StatusBadRequest)
		return
	}

	rows, err := DB.Query(`
		SELECT id, sender_id, file_id, received_at, expires_at, metadata
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
		var (
			id, senderID, fileID string
			receivedAt, expiresAt time.Time
			metadataJSON string
		)

		if err := rows.Scan(&id, &senderID, &fileID, &receivedAt, &expiresAt, &metadataJSON); err != nil {
			log.Println("Row scan error:", err)
			continue
		}

		// Parse metadata JSON string into map
		var metadata map[string]interface{}
		if err := json.Unmarshal([]byte(metadataJSON), &metadata); err != nil {
			log.Println("Failed to parse metadata:", err)
			metadata = map[string]interface{}{} // fallback
		}

		pendingFiles = append(pendingFiles, map[string]interface{}{
			"id":         id,
			"senderId":   senderID,
			"fileId":     fileID,
			"receivedAt": receivedAt,
			"expiresAt":  expiresAt,
			"metadata":   metadata,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data": pendingFiles,
	})
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

func DeleteFileMetadata(fileID string) error {
	tx, err := DB.Begin()
	if err != nil {
		log.Println("Failed to begin transaction:", err)
		return err
	}
	defer tx.Rollback() // safe rollback on error

	// Delete from received_files (optional, might cascade)
	_, err = tx.Exec(`DELETE FROM received_files WHERE file_id = $1`, fileID)
	if err != nil {
		log.Println("Error deleting from received_files:", err)
		return err
	}

	// Delete from sent_files (optional, might cascade)
	_, err = tx.Exec(`DELETE FROM sent_files WHERE file_id = $1`, fileID)
	if err != nil {
		log.Println("Error deleting from sent_files:", err)
		return err
	}

	// Delete from files table
	_, err = tx.Exec(`DELETE FROM files WHERE id = $1`, fileID)
	if err != nil {
		log.Println("Error deleting from files:", err)
		return err
	}

	if err := tx.Commit(); err != nil {
		log.Println("Transaction commit failed:", err)
		return err
	}

	log.Println("✅ File metadata deleted successfully for file ID:", fileID)
	return nil
}

func RemoveTagsFromFileHandler(w http.ResponseWriter, r *http.Request) {
	type TagRemoveRequest struct {
		FileID string   `json:"fileId"`
		Tags   []string `json:"tags"`
	}

	var req TagRemoveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.FileID == "" || len(req.Tags) == 0 {
		http.Error(w, "Missing fileId or tags", http.StatusBadRequest)
		return
	}

	_, err := DB.Exec(`
		UPDATE files
		SET tags = ARRAY(
			SELECT UNNEST(tags)
			EXCEPT SELECT UNNEST($1::text[])
		)
		WHERE id = $2
	`, pq.Array(req.Tags), req.FileID)

	if err != nil {
		log.Println("PostgreSQL remove tags error:", err)
		http.Error(w, "Failed to remove tags", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{
		"message": "Tags removed successfully",
	})
}

func GetRecipientIDFromOPK(opkID string) (string, error) {
	var userID string
	err := DB.QueryRow(`SELECT user_id FROM one_time_pre_keys WHERE id = $1`, opkID).Scan(&userID)
	if err != nil {
		return "", err
	}
	return userID, nil
}

func InsertReceivedFile(db *sql.DB, recipientId, senderId, fileId, metadataJson string, expiresAt time.Time) error {
	// Step 1: Ensure the recipient exists
	var exists bool
	err := db.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM users WHERE id = $1
		)
	`, recipientId).Scan(&exists)

	if err != nil {
		return fmt.Errorf("failed to check recipient existence: %w", err)
	}

	if !exists {
		return fmt.Errorf("recipient user with id %s does not exist", recipientId)
	}

	// Step 2: Insert the received file
	_, err = db.Exec(`
		INSERT INTO received_files (
			recipient_id, sender_id, file_id, received_at, expires_at, metadata
		) VALUES ($1, $2, $3, NOW(), $4, $5)
	`, recipientId, senderId, fileId, expiresAt, metadataJson)

	if err != nil {
		return fmt.Errorf("failed to insert received file: %w", err)
	}

	return nil
}


func InsertSentFile(db *sql.DB, senderId, recipientId, fileId, encryptedFileKey, x3dhEphemeralPubKey string) error {
	_, err := db.Exec(`
		INSERT INTO sent_files (
			sender_id, recipient_id, file_id, encrypted_file_key, x3dh_ephemeral_pubkey, sent_at
		) VALUES ($1, $2, $3, $4, $5, NOW())
	`, senderId, recipientId, fileId, encryptedFileKey, x3dhEphemeralPubKey)
	return err
}

type AddTagsRequest struct {
	FileID string   `json:"fileId"`
	Tags   []string `json:"tags"`
}

func AddTagsHandler(w http.ResponseWriter, r *http.Request) {
	var req AddTagsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Println("Failed to parse JSON:", err)
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if req.FileID == "" || len(req.Tags) == 0 {
		http.Error(w, "Missing fileId or tags", http.StatusBadRequest)
		return
	}

	_, err := DB.Exec(`
		UPDATE files
		SET tags = array_cat(COALESCE(tags, '{}'), $1::text[])
		WHERE id = $2
	`, pq.Array(req.Tags), req.FileID)
	if err != nil {
		log.Println("Failed to update tags:", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Tags added successfully",
	})
}

func AddUserHandler(w http.ResponseWriter, r *http.Request) {
	var req MetadataQueryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Println("Failed to parse JSON:", err)
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if req.UserID == "" {
		http.Error(w, "Missing userId", http.StatusBadRequest)
		return
	}

	_, err := DB.Exec(`
		INSERT INTO users (id)
		VALUES ($1)
		ON CONFLICT (id) DO NOTHING
	`, req.UserID)
	if err != nil {
		log.Println("Failed to insert user:", err)
		http.Error(w, "Failed to add user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "User added successfully",
	})
}
