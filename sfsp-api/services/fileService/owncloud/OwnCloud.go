package owncloud

import (
	"github.com/studio-b12/gowebdav"
	"fmt"
	"log"
	"os"
)

type WebDavClient interface {
    MkdirAll(path string, perm os.FileMode) error
    Write(name string, data []byte, perm os.FileMode) error
    Read(name string) ([]byte, error)
	Remove(path string) error
}

var client WebDavClient

func SetClient(c WebDavClient) {
    client = c
}

func InitOwnCloud(url, username, password string) {
    c := gowebdav.NewClient(url, username, password)
    client = c
    log.Println("✅ OwnCloud connected")
}

var UploadFile = func(path, filename string, data []byte) error {
	fullPath := path + "/" + filename
	log.Println("Uploading to WebDAV path:", fullPath)

	if err := client.MkdirAll(path, 0755); err != nil {
		log.Println("MkdirAll failed:", err)
		fmt.Println("Failed to make directory")
		return err
	}

	err := client.Write(fullPath, data, 0644)
	if err != nil {
		log.Println("Write failed:", err)
		fmt.Println("Write failed")
	}
	return err
}

var DownloadFile = func(fileId, UserID string) ([]byte, error) {
	path := "files/" + UserID
	fullPath := fmt.Sprintf("%s/%s", path, fileId)
	fmt.Println("Path is: ", fullPath)
	data, err := client.Read(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to download file: %w", err)
		fmt.Println("Faled to download file")

	}
	return data, nil
}

func DeleteFile(fileId, UserID string) error {
	path := "files/"+UserID
	fmt.Println("Paht is: ", path)
	fullPath := fmt.Sprintf("%s/%s", path, fileId)
	err := client.Remove(fullPath)
	if err != nil {
		return fmt.Errorf("failed to delete the file: %w", err)
	}
	return nil
}