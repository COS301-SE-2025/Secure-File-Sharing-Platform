package owncloud

import (
	"github.com/studio-b12/gowebdav"
	"fmt"
	"log"
	"os"
)

// WebDavClient defines the interface for interacting with a WebDAV server
type WebDavClient interface {
    MkdirAll(path string, perm os.FileMode) error
    Write(name string, data []byte, perm os.FileMode) error
    Read(name string) ([]byte, error)
}

// Client sets the global WebDavClient instance
var client WebDavClient

// SetClient allows setting a custom WebDavClient instance
func SetClient(c WebDavClient) {
    client = c
}

// InitOwnCloud initializes the OwnCloud client with the provided URL, username, and password
func InitOwnCloud(url, username, password string) {
    c := gowebdav.NewClient(url, username, password)
    client = c
    log.Println("✅ OwnCloud connected")
}

// UploadFile uploads a file to the specified path with the given filename and data
var UploadFile = func(path, filename string, data []byte) error {
	fullPath := path + "/" + filename
	if err := client.MkdirAll(path, 0755); err != nil {
		return err
	}
	return client.Write(fullPath, data, 0644)
}

// DownloadFile downloads a file from the specified path with the given filename
var DownloadFile = func(path, filename string) ([]byte, error) {
	fullPath := fmt.Sprintf("%s/%s", path, filename)
	data, err := client.Read(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to download file: %w", err)
	}
	return data, nil
}
