package fileHandler

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/crypto"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)

// Define interfaces for dependency injection in tests
type RowScanner interface {
	Scan(dest ...any) error
}

// QueryRowFunc allows mocking the database query row in tests
var QueryRowFunc = func(query string, args ...any) RowScanner {
	return DB.QueryRow(query, args...)
}

// OwnCloudDownloader allows mocking the OwnCloud download function in tests
var OwnCloudDownloader = owncloud.DownloadFile

// DecryptFunc allows mocking the decryption function in tests
var DecryptFunc = crypto.DecryptBytes

// ViewRequest is the request structure for viewing a file
type ViewRequest struct {
	UserID   string `json:"userId"`
	FileName string `json:"fileName"`
}

// ViewResponse is the response structure for viewing a file
type ViewResponse struct {
	FileName    string `json:"fileName"`
	FileContent string `json:"fileContent"`
	FileType    string `json:"fileType"`
	Preview     bool   `json:"preview"`
}

// ViewFileHandler handles requests to view files without downloading them
func ViewFileHandler(w http.ResponseWriter, r *http.Request) {
	var req ViewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.UserID == "" || req.FileName == "" {
		http.Error(w, "Missing userId or fileName", http.StatusBadRequest)
		return
	}

	// Get file metadata
	var fileID, nonce, fileType string
	row := QueryRowFunc(`
		SELECT id, nonce, file_type FROM files
		WHERE owner_id = $1 AND file_name = $2
	`, req.UserID, req.FileName)

	err := row.Scan(&fileID, &nonce, &fileType)
	if err != nil {
		log.Println("Failed to retrieve file metadata:", err)
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	// Download the file
	data, err := OwnCloudDownloader(fileID, req.UserID)
	if err != nil {
		http.Error(w, fmt.Sprintf("View failed: %v", err), http.StatusInternalServerError)
		log.Println("View Failed:", err)
		return
	}

	// Decrypt the file
	aesKey := os.Getenv("AES_KEY")
	if len(aesKey) != 32 {
		http.Error(w, "Invalid AES key", http.StatusInternalServerError)
		return
	}

	plain, err := DecryptFunc(data, aesKey)
	if err != nil {
		http.Error(w, fmt.Sprintf("Decryption failed: %v", err), http.StatusInternalServerError)
		return
	}

	// Create a preview based on file type
	isPreviewable := canPreview(fileType)

	// Record access log
	_, err = DB.Exec(`
		INSERT INTO access_logs (file_id, user_id, action, message)
		VALUES ($1, $2, $3, $4)
	`, fileID, req.UserID, "view", fmt.Sprintf("User %s viewed the file", req.UserID))

	if err != nil {
		log.Println("Failed to log file access:", err)
		// Don't return an error to the client, just log it
	}

	// Convert file content to base64
	base64Data := base64.StdEncoding.EncodeToString(plain)

	// Create response
	res := ViewResponse{
		FileName:    req.FileName,
		FileContent: base64Data,
		FileType:    fileType,
		Preview:     isPreviewable,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

// GetPreviewHandler generates a preview for a file
func GetPreviewHandler(w http.ResponseWriter, r *http.Request) {
	var req ViewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.UserID == "" || req.FileName == "" {
		http.Error(w, "Missing userId or fileName", http.StatusBadRequest)
		return
	}

	// Get file metadata
	var fileID, fileType string
	row := QueryRowFunc(`
		SELECT id, file_type FROM files
		WHERE owner_id = $1 AND file_name = $2
	`, req.UserID, req.FileName)

	err := row.Scan(&fileID, &fileType)

	if err != nil {
		log.Println("Failed to retrieve file metadata:", err)
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	// Check if preview is possible
	if !canPreview(fileType) {
		http.Error(w, "Preview not available for this file type", http.StatusBadRequest)
		return
	}

	// Download the file
	data, err := OwnCloudDownloader(fileID, req.UserID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Preview generation failed: %v", err), http.StatusInternalServerError)
		log.Println("Preview generation failed:", err)
		return
	}

	// Decrypt the file
	aesKey := os.Getenv("AES_KEY")
	if len(aesKey) != 32 {
		http.Error(w, "Invalid AES key", http.StatusInternalServerError)
		return
	}

	plain, err := DecryptFunc(data, aesKey)
	if err != nil {
		http.Error(w, fmt.Sprintf("Decryption failed: %v", err), http.StatusInternalServerError)
		return
	}

	// Generate preview
	preview := generatePreview(plain, fileType)

	// Record access log
	_, err = DB.Exec(`
		INSERT INTO access_logs (file_id, user_id, action, message)
		VALUES ($1, $2, $3, $4)
	`, fileID, req.UserID, "preview", fmt.Sprintf("User %s previewed the file", req.UserID))

	if err != nil {
		log.Println("Failed to log file access:", err)
		// Don't return an error to the client, just log it
	}

	// Return preview data
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"preview":  base64.StdEncoding.EncodeToString(preview),
		"fileType": fileType,
	})
}

// Helper function to check if a file can be previewed
func canPreview(fileType string) bool {
	previewableTypes := []string{
		"text/", "image/", "application/pdf",
		"application/msword", "application/vnd.openxmlformats-officedocument",
		"application/vnd.ms-excel", "application/vnd.ms-powerpoint",
	}

	for _, pType := range previewableTypes {
		if strings.HasPrefix(fileType, pType) {
			return true
		}
	}

	return false
}

// Helper function to generate a preview based on file type
// For this implementation, we'll generate a simple preview:
// - For text files: first 1000 characters
// - For images: return the same content (full preview)
// - For documents: first 1000 characters (simplified)
func generatePreview(data []byte, fileType string) []byte {
	// Text files
	if strings.HasPrefix(fileType, "text/") {
		if len(data) > 1000 {
			return data[:1000]
		}
		return data
	}

	// Images - return as is (browser can handle display)
	if strings.HasPrefix(fileType, "image/") {
		return data
	}

	// PDF and office documents - simplified preview (first 1000 bytes)
	// In a real implementation, you might use a library to extract text or render thumbnails
	if strings.HasPrefix(fileType, "application/") {
		previewSize := 1000
		if len(data) > previewSize {
			return data[:previewSize]
		}
		return data
	}

	// Default preview
	if len(data) > 500 {
		return data[:500]
	}
	return data
}
