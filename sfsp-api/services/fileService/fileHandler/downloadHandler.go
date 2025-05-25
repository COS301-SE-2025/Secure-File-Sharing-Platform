package fileHandler

import (
	"fmt"
	"net/http"

	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)

func DownloadHandler(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	filename := r.URL.Query().Get("filename")

	if path == "" || filename == "" {
		http.Error(w, "Missing 'path' or 'filename' parameter", http.StatusBadRequest)
		return
	}

	data, err := owncloud.DownloadFile(path, filename)
	if err != nil {
		http.Error(w, fmt.Sprintf("❌ Download failed: %v", err), http.StatusInternalServerError)
		return
	}

	// Set download headers
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}
