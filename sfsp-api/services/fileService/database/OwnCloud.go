package ownCloud

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/studio-b12/gowebdav"
)

const (
	ownCloudURL      = "http://localhost:8080/remote.php/webdav/"
	ownCloudUsername = "admin"
	ownCloudPassword = "admin"
)

// UploadFileToOwnCloud uploads the given file bytes to OwnCloud under the specified path
func UploadFileToOwnCloud(remotePath string, fileName string, fileBytes []byte) error {
	client := gowebdav.NewClient(ownCloudURL, ownCloudUsername, ownCloudPassword)

	// Ensure directory exists
	err := client.MkdirAll(remotePath, 0755)
	if err != nil {
		return fmt.Errorf("failed to create remote directory: %w", err)
	}

	// Full remote path
	remoteFullPath := fmt.Sprintf("%s/%s", strings.TrimSuffix(remotePath, "/"), fileName)

	// Upload the file
	err = client.Write(remoteFullPath, fileBytes, 0644)
	if err != nil {
		return fmt.Errorf("failed to upload file to OwnCloud: %w", err)
	}

	return nil
}

// Optional: Serve as a simple HTTP handler for upload testing
func UploadHandler(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(10 << 20) // 10 MB max

	if err != nil {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	file, handler, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "File missing", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Read file into memory
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Failed to read file", http.StatusInternalServerError)
		return
	}

	remotePath := r.FormValue("path")
	if remotePath == "" {
		remotePath = "uploads"
	}

	err = UploadFileToOwnCloud(remotePath, handler.Filename, fileBytes)
	if err != nil {
		http.Error(w, fmt.Sprintf("Upload failed: %v", err), http.StatusInternalServerError)
		return
	}

	fmt.Fprintf(w, "✅ File %s uploaded to /%s/", handler.Filename, remotePath)
}


//downloadHandler is a placeholder for a download handler
func DownloadHandler(w http.ResponseWriter, r *http.Request) {
	// This function would handle downloading files from OwnCloud
	// Implementation would be similar to UploadFileToOwnCloud but using client.Read
	http.Error(w, "Download handler not implemented", http.StatusNotImplemented)
}