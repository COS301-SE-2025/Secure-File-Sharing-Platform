package fileHandler

import (
	//"encoding/base64"
	"encoding/json"
	//"fmt"
	"log"
	"net/http"

	//"os"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/metadata"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)

type deleteRequest struct {
	FileId string `json:"fileId"`
}

func DeleteFileHandler(w http.ResponseWriter, r *http.Request) {
	var req deleteRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.FileId == "" {
		log.Println("No fileId provided")
		http.Error(w, "Missing fileId", http.StatusBadRequest)
		return
	}

	err = owncloud.DeleteFile(req.FileId)
	if err != nil {
		log.Println("OwnCloud deletefailed failed:", err)
		http.Error(w, "File delete failed", http.StatusInternalServerError)
		return
	}

	err = metadata.DeleteFileMetadata(req.FileId)
	if err != nil {
		log.Println("Metadata failed to delete:", err)
		http.Error(w, "File delete failed", http.StatusInternalServerError)
		return
	}

	// Respond with success and fileID
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "File successfully deleted",
	})
}
func SoftDeleteFileHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		FileID string `json:"fileId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.FileID == "" {
		http.Error(w, "Invalid or missing fileId", http.StatusBadRequest)
		return
	}

	err := metadata.AddTagToFile(req.FileID, "deleted")
	if err != nil {
		http.Error(w, "Failed to soft delete (add tag)", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{
		"message": "File soft deleted (tagged as 'deleted')",
	})
}

func RestoreFileHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		FileID string `json:"fileId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.FileID == "" {
		http.Error(w, "Invalid or missing fileId", http.StatusBadRequest)
		return
	}

	err := metadata.RemoveTagFromFile(req.FileID, "deleted")
	if err != nil {
		http.Error(w, "Failed to restore (remove tag)", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{
		"message": "File restored (removed 'deleted' tag)",
	})
}
