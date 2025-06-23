package fileHandler

import (
	//"encoding/base64"
	"encoding/json"
	//"fmt"
	"net/http"
	"log"
	//"os"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/metadata"
)

type deleteRequest struct{
	FileId string `json:"fileId"`
}

func DeleteFileHandler(w http.ResponseWriter, r *http.Request){
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