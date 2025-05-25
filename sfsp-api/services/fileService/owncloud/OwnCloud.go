package owncloud

import (
	"github.com/studio-b12/gowebdav"
	"fmt"
)

var client *gowebdav.Client

func InitOwnCloud(url, username, password string) {
	client = gowebdav.NewClient(url, username, password)
}

func UploadFile(path, filename string, data []byte) error {
	fullPath := path + "/" + filename
	if err := client.MkdirAll(path, 0755); err != nil {
		return err
	}
	return client.Write(fullPath, data, 0644)
}

func DownloadFile(path, filename string) ([]byte, error) {
	fullPath := fmt.Sprintf("%s/%s", path, filename)
	data, err := client.Read(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to download file: %w", err)
	}
	return data, nil
}
