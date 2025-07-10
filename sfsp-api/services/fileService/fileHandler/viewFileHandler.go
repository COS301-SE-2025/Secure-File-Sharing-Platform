package fileHandler

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/crypto"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)

type RowScanner interface {
	Scan(dest ...any) error
}

var QueryRowFunc = func(query string, args ...any) RowScanner {
	return DB.QueryRow(query, args...)
}

var OwnCloudDownloader = owncloud.DownloadFile

var DecryptFunc = crypto.DecryptBytes

type ViewRequest struct {
	UserID   string `json:"userId"`
	FileName string `json:"fileName"`
}

type ViewResponse struct {
	FileName    string `json:"fileName"`
	FileContent string `json:"fileContent"`
	FileType    string `json:"fileType"`
	Preview     bool   `json:"preview"`
	Nonce       string `json:"nonce"`
}

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

	// Download the file (encrypted)
	data, err := OwnCloudDownloader(fileID, req.UserID)
	if err != nil {
		http.Error(w, fmt.Sprintf("View failed: %v", err), http.StatusInternalServerError)
		log.Println("View Failed:", err)
		return
	}

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

	// Return encrypted file content and nonce
	base64Data := base64.StdEncoding.EncodeToString(data)
	res := ViewResponse{
		FileName:    req.FileName,
		FileContent: base64Data,
		FileType:    fileType,
		Preview:     isPreviewable,
		Nonce:       nonce,
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

	if !canPreview(fileType) {
		http.Error(w, "Preview not available for this file type", http.StatusBadRequest)
		return
	}

	// Download the file (encrypted)
	data, err := OwnCloudDownloader(fileID, req.UserID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Preview generation failed: %v", err), http.StatusInternalServerError)
		log.Println("Preview generation failed:", err)
		return
	}

	// Generate preview of encrypted data (first 1000 bytes or full for images)
	var previewData []byte
	if strings.HasPrefix(fileType, "text/") || strings.HasPrefix(fileType, "application/") {
		if len(data) > 1000 {
			previewData = data[:1000]
		} else {
			previewData = data
		}
	} else if strings.HasPrefix(fileType, "image/") {
		previewData = data
	} else {
		if len(data) > 500 {
			previewData = data[:500]
		} else {
			previewData = data
		}
	}

	// Record access log
	_, err = DB.Exec(`
		INSERT INTO access_logs (file_id, user_id, action, message)
		VALUES ($1, $2, $3, $4)
	`, fileID, req.UserID, "preview", fmt.Sprintf("User %s previewed the file", req.UserID))

	if err != nil {
		log.Println("Failed to log file access:", err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"preview":  base64.StdEncoding.EncodeToString(previewData),
		"fileType": fileType,
		"nonce":    nonce,
	})
}

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
