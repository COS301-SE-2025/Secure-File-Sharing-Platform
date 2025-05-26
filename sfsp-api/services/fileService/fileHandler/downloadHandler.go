package fileHandler

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"log"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)

type DownloadRequest struct {
	Path     string `json:"path"`
	FileName string `json:"filename"`
}

type DownloadResponse struct {
	FileName    string `json:"fileName"`
	FileContent string `json:"fileContent"`
}

func DownloadHandler(w http.ResponseWriter, r *http.Request) {
	var req DownloadRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.Path == "" || req.FileName == "" {
		log.Println("Path is: "+ req.Path + " and filename is: " + req.FileName)
		http.Error(w, "Missing path or filename", http.StatusBadRequest)
		return
	}

	// Get file bytes from OwnCloud
	data, err := owncloud.DownloadFile(req.Path, req.FileName)
	if err != nil {
		http.Error(w, fmt.Sprintf("Download failed: %v", err), http.StatusInternalServerError)
		return
	}

	// Encode file to base64
	base64Data := base64.StdEncoding.EncodeToString(data)

	res := DownloadResponse{
		FileName:    req.FileName,
		FileContent: base64Data,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}
