package owncloud

import (
	"fmt"
	"log"
	"os"
	"io"
	"github.com/studio-b12/gowebdav"
)

type WebDavClient interface {
	MkdirAll(path string, perm os.FileMode) error
	Write(name string, data []byte, perm os.FileMode) error
	WriteStream(name string, src io.Reader, perm os.FileMode) error
	Read(name string) ([]byte, error)
	ReadStream(name string) (io.ReadCloser, error)
	Remove(path string) error
}

var client WebDavClient

func SetClient(c WebDavClient) {
	client = c
}

type OwnCloudClient struct {
	*gowebdav.Client
}

func (c *OwnCloudClient) MkdirAll(path string, perm os.FileMode) error {
	return c.Client.MkdirAll(path, perm)
}
func (c *OwnCloudClient) Write(name string, data []byte, perm os.FileMode) error {
	return c.Client.Write(name, data, perm)
}
func (c *OwnCloudClient) WriteStream(name string, src io.Reader, perm os.FileMode) error {
	return c.Client.WriteStream(name, src, perm)
}
func (c *OwnCloudClient) Read(name string) ([]byte, error) {
	return c.Client.Read(name)
}
func (c *OwnCloudClient) ReadStream(name string) (io.ReadCloser, error) {
	return c.Client.ReadStream(name)
}
func (c *OwnCloudClient) Remove(path string) error {
	return c.Client.Remove(path)
}

func InitOwnCloud(url, username, password string) {
	c := &OwnCloudClient{
		Client: gowebdav.NewClient(url, username, password),
	}
	client = c
	log.Println("✅ OwnCloud connected")
}

var UploadFileStream = func(path, filename string, reader io.Reader) error {
	fullPath := path + "/" + filename
	log.Println("Streaming upload to WebDAV:", fullPath)

	if err := client.MkdirAll(path, 0755); err != nil {
		return fmt.Errorf("mkdir failed: %w", err)
	}

	if err := client.WriteStream(fullPath, reader, 0644); err != nil {
		return fmt.Errorf("stream write failed: %w", err)
	}

	return nil
}

var DownloadFileStream = func(fileId, userID string) (io.ReadCloser, error) {
	path := fmt.Sprintf("files/%s/%s", userID, fileId)
	return client.ReadStream(path)
}

var DeleteFile = func(fileId, userID string) error {
	path := "files/" + userID
	fmt.Println("Path is: ", path)
	fullPath := fmt.Sprintf("%s/%s", path, fileId)
	err := client.Remove(fullPath)
	if err != nil {
		return fmt.Errorf("failed to delete the file: %w", err)
	}
	return nil
}

var DownloadSentFileStream = func(filePath string) (io.ReadCloser, error) {
	log.Println("Downloading (stream) from path:", filePath)

	stream, err := client.ReadStream(filePath)
	if err != nil {
		log.Println("Failed to stream file:", err)
		return nil, fmt.Errorf("failed to download file: %w", err)
	}

	return stream, nil
}