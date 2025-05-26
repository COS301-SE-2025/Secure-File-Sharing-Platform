package fileHandler

import (
	"fmt"
	"net/http"
	"os"
	//"github.com/joho/godotenv"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/crypto"
)

func DownloadHandler(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	filename := r.URL.Query().Get("filename")

	if path == "" || filename == "" {
		http.Error(w, "Missing 'path' or 'filename' parameter", http.StatusBadRequest)
		return
	}

	//download file from ownCloud
	data, err := owncloud.DownloadFile(path, filename)
	if err != nil {
		http.Error(w, fmt.Sprintf("❌ Download failed: %v", err), http.StatusInternalServerError)
		return
	}

	//get AES key
	key := os.Getenv("AES_KEY")
	if len(key) != 32 {
		http.Error(w, "Invalid AES_KEY length (must be 32 bytes)", http.StatusInternalServerError)
		return
	}

	//decrypt file
	decryptedData, err := crypto.DecryptBytes(data, key)
	if err != nil {
		http.Error(w, fmt.Sprintf("❌ Decryption failed: %v", err), http.StatusInternalServerError)
		return
	}

	//return to client
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	w.WriteHeader(http.StatusOK)
	w.Write(decryptedData)
}
