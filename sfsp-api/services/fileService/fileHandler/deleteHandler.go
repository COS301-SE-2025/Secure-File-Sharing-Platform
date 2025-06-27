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

type DeleteRequest struct {
	FileId string `json:"fileId"`
	UserID string `json:"userId"`
}

func DeleteFileHandler(w http.ResponseWriter, r *http.Request) {
	var req DeleteRequest
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

	if req.UserID == "" {
		log.Println("No UserId provided")
		http.Error(w, "Missing UserID", http.StatusBadRequest)
		return
	}

	err = owncloud.DeleteFile(req.FileId, req.UserID)
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
