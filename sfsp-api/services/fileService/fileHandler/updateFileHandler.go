// updateFileHandler.go
package fileHandler

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)

// UpdateFileRequest represents the request to update a file during password reset
type UpdateFileRequest struct {
	UserID      string `json:"userId"`
	FileID      string `json:"fileId"`
	Nonce       string `json:"nonce"`        // New nonce for the re-encrypted file
	FileContent string `json:"fileContent"`  // Base64 encoded re-encrypted file content
}

// UpdateFileResponse represents the response after updating a file
type UpdateFileResponse struct {
	Message     string `json:"message"`
	FileID      string `json:"fileId"`
	FileName    string `json:"fileName"`
	NewHash     string `json:"newHash"`
	BytesWritten int64  `json:"bytesWritten"`
}

// UpdateFileHandler handles file updates during password reset
// Updates both the file content in ownCloud and the nonce + hash in PostgreSQL
func UpdateFileHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("==== Update File Request (Password Reset) ====")

	// 1️⃣ Parse JSON request
	var req UpdateFileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Println("❌ Failed to parse JSON:", err)
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	// 2️⃣ Validate required fields
	if req.UserID == "" || req.FileID == "" || req.Nonce == "" || req.FileContent == "" {
		log.Println("❌ Missing required fields")
		http.Error(w, "Missing required fields: userId, fileId, nonce, and fileContent are required", http.StatusBadRequest)
		return
	}

	log.Printf("📦 Update request: userId=%s, fileId=%s, nonce=%s, contentLength=%d",
		req.UserID, req.FileID, req.Nonce[:20]+"...", len(req.FileContent))

	// 3️⃣ Verify file exists and belongs to user
	var fileName, currentNonce string
	err := DB.QueryRow(`
		SELECT file_name, nonce FROM files
		WHERE owner_id = $1 AND id = $2
	`, req.UserID, req.FileID).Scan(&fileName, &currentNonce)

	if err != nil {
		log.Println("❌ File not found or access denied:", err)
		http.Error(w, "File not found or you don't have permission to update it", http.StatusNotFound)
		return
	}

	log.Printf("✅ Found file: %s (current nonce: %s)", fileName, currentNonce[:20]+"...")

	// 4️⃣ Decode base64 file content
	fileBytes, err := base64.StdEncoding.DecodeString(req.FileContent)
	if err != nil {
		log.Println("❌ Failed to decode base64 content:", err)
		http.Error(w, "Invalid base64 file content", http.StatusBadRequest)
		return
	}

	log.Printf("✅ Decoded file content: %d bytes", len(fileBytes))

	// 5️⃣ Calculate new file hash
	hasher := sha256.New()
	hasher.Write(fileBytes)
	newFileHash := hex.EncodeToString(hasher.Sum(nil))

	log.Printf("✅ Calculated new file hash: %s", newFileHash)

	// 6️⃣ Upload re-encrypted file to ownCloud (replaces old file)
	fileReader := strings.NewReader(string(fileBytes))
	err = owncloud.UploadFileStream("files", req.FileID, fileReader)
	if err != nil {
		log.Println("❌ OwnCloud upload failed:", err)
		http.Error(w, "Failed to upload re-encrypted file to storage", http.StatusInternalServerError)
		return
	}

	log.Printf("✅ Uploaded %d bytes to ownCloud for file %s", len(fileBytes), req.FileID)

	// 7️⃣ Update database with new nonce, hash, and file size
	_, err = DB.Exec(`
		UPDATE files
		SET nonce = $1, file_hash = $2, file_size = $3
		WHERE owner_id = $4 AND id = $5
	`, req.Nonce, newFileHash, len(fileBytes), req.UserID, req.FileID)

	if err != nil {
		log.Println("❌ Failed to update file metadata in database:", err)
		http.Error(w, "Failed to update file metadata", http.StatusInternalServerError)
		return
	}

	log.Printf("✅ Updated database: nonce=%s, hash=%s", req.Nonce[:20]+"...", newFileHash)

	// 8️⃣ Handle shared_files_view updates if this file is shared via view-only
	// Check if this file has any active view-only shares where it's the newfile_id
	_, err = DB.Exec(`
		UPDATE shared_files_view
		SET newfile_id = $1
		WHERE newfile_id = $1
		  AND revoked = FALSE
		  AND access_granted = TRUE
	`, req.FileID)

	if err != nil {
		log.Println("⚠️  Warning: Failed to update shared_files_view references:", err)
		// Don't fail the request, just log the warning
	} else {
		log.Println("✅ Updated shared_files_view references if any existed")
	}

	// 9️⃣ Return success response
	response := UpdateFileResponse{
		Message:      "File re-encrypted and updated successfully",
		FileID:       req.FileID,
		FileName:     fileName,
		NewHash:      newFileHash,
		BytesWritten: int64(len(fileBytes)),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)

	log.Printf("✅ File update complete: %s (%d bytes)", fileName, len(fileBytes))
}
