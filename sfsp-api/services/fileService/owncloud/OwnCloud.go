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
	if err := client.MkdirAll(path, 0755); err != nil {
		return err
	}
	return client.Write(fullPath, data, 0644)
}

var DownloadFile = func(path, filename string) ([]byte, error) {
	fullPath := fmt.Sprintf("%s/%s", path, filename)
	data, err := client.Read(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to download file: %w", err)
	}
	return data, nil
}
