package unitTests

import (
	"errors"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)

type MockWebDavClient struct {
	mock.Mock
}

func (m *MockWebDavClient) MkdirAll(path string, perm os.FileMode) error {
	args := m.Called(path, perm)
	return args.Error(0)
}

func (m *MockWebDavClient) Write(name string, data []byte, perm os.FileMode) error {
	args := m.Called(name, data, perm)
	return args.Error(0)
}

func (m *MockWebDavClient) Read(name string) ([]byte, error) {
	args := m.Called(name)
	return args.Get(0).([]byte), args.Error(1)
}

func (m *MockWebDavClient) Remove(path string) error {
	args := m.Called(path)
	return args.Error(0)
}

func TestUploadFile(t *testing.T) {
	originalClient := owncloud.GetClient()
	t.Cleanup(func() {
		owncloud.SetClient(originalClient)
	})

	t.Run("Success", func(t *testing.T) {
		mockClient := &MockWebDavClient{}
		owncloud.SetClient(mockClient)

		path := "files/testuser"
		filename := "testfile.txt"
		data := []byte("test data")
		fullPath := path + "/" + filename

		mockClient.On("MkdirAll", path, os.FileMode(0755)).Return(nil)
		mockClient.On("Write", fullPath, data, os.FileMode(0644)).Return(nil)

		err := owncloud.UploadFile(path, filename, data)
		assert.NoError(t, err)

		mockClient.AssertExpectations(t)
	})

	t.Run("MkdirAll fails", func(t *testing.T) {
		mockClient := &MockWebDavClient{}
		owncloud.SetClient(mockClient)

		path := "files/testuser"
		filename := "testfile.txt"
		data := []byte("test data")
		fullPath := path + "/" + filename

		mockClient.On("MkdirAll", path, os.FileMode(0755)).Return(errors.New("mkdir failed"))
		mockClient.On("Write", fullPath, data, os.FileMode(0644)).Return(nil).Maybe()

		t.Logf("Calling UploadFile with path=%s, filename=%s", path, filename)
		err := owncloud.UploadFile(path, filename, data)
		t.Logf("UploadFile returned error: %v", err)
		assert.Error(t, err)
		assert.Equal(t, "mkdir failed", err.Error())

		mockClient.AssertExpectations(t)
	})

	t.Run("Write fails", func(t *testing.T) {
		mockClient := &MockWebDavClient{}
		owncloud.SetClient(mockClient)

		path := "files/testuser"
		filename := "testfile.txt"
		data := []byte("test data")
		fullPath := path + "/" + filename

		mockClient.On("MkdirAll", path, os.FileMode(0755)).Return(nil)
		mockClient.On("Write", fullPath, data, os.FileMode(0644)).Return(errors.New("write failed"))

		err := owncloud.UploadFile(path, filename, data)
		assert.Error(t, err)
		assert.Equal(t, "write failed", err.Error())

		mockClient.AssertExpectations(t)
	})
}

func TestDownloadFile(t *testing.T) {
	originalClient := owncloud.GetClient()
	t.Cleanup(func() {
		owncloud.SetClient(originalClient)
	})

	t.Run("Success", func(t *testing.T) {
		mockClient := &MockWebDavClient{}
		owncloud.SetClient(mockClient)

		fileID := "testfile.txt"
		userID := "testuser"
		fullPath := "files/" + userID + "/" + fileID
		expectedData := []byte("test data")

		mockClient.On("Read", fullPath).Return(expectedData, nil)

		data, err := owncloud.DownloadFile(fileID, userID)
		assert.NoError(t, err)
		assert.Equal(t, expectedData, data)

		mockClient.AssertExpectations(t)
	})

	t.Run("Read fails", func(t *testing.T) {
		mockClient := &MockWebDavClient{}
		owncloud.SetClient(mockClient)

		fileID := "testfile.txt"
		userID := "testuser"
		fullPath := "files/" + userID + "/" + fileID

		mockClient.On("Read", fullPath).Return(([]byte)(nil), errors.New("file not found"))

		data, err := owncloud.DownloadFile(fileID, userID)
		assert.Error(t, err)
		assert.Nil(t, data)
		assert.Equal(t, "failed to download file: file not found", err.Error())

		mockClient.AssertExpectations(t)
	})
}

func TestDeleteFile(t *testing.T) {
	originalClient := owncloud.GetClient()
	t.Cleanup(func() {
		owncloud.SetClient(originalClient)
	})

	t.Run("Success", func(t *testing.T) {
		mockClient := &MockWebDavClient{}
		owncloud.SetClient(mockClient)

		fileID := "testfile.txt"
		userID := "testuser"
		fullPath := "files/" + userID + "/" + fileID

		mockClient.On("Remove", fullPath).Return(nil)

		err := owncloud.DeleteFile(fileID, userID)
		assert.NoError(t, err)

		mockClient.AssertExpectations(t)
	})

	t.Run("Remove fails", func(t *testing.T) {
		mockClient := &MockWebDavClient{}
		owncloud.SetClient(mockClient)

		fileID := "testfile.txt"
		userID := "testuser"
		fullPath := "files/" + userID + "/" + fileID

		mockClient.On("Remove", fullPath).Return(errors.New("file not found"))

		err := owncloud.DeleteFile(fileID, userID)
		assert.Error(t, err)
		assert.Equal(t, "failed to delete the file: file not found", err.Error())

		mockClient.AssertExpectations(t)
	})
}

func TestDownloadSentFile(t *testing.T) {
	originalClient := owncloud.GetClient()
	t.Cleanup(func() {
		owncloud.SetClient(originalClient)
	})

	t.Run("Success", func(t *testing.T) {
		mockClient := &MockWebDavClient{}
		owncloud.SetClient(mockClient)

		filePath := "sent/testfile.txt"
		expectedData := []byte("test data")

		mockClient.On("Read", filePath).Return(expectedData, nil)

		data, err := owncloud.DownloadSentFile(filePath)
		assert.NoError(t, err)
		assert.Equal(t, expectedData, data)

		mockClient.AssertExpectations(t)
	})

	t.Run("Read fails", func(t *testing.T) {
		mockClient := &MockWebDavClient{}
		owncloud.SetClient(mockClient)

		filePath := "sent/testfile.txt"

		mockClient.On("Read", filePath).Return(([]byte)(nil), errors.New("file not found"))

		data, err := owncloud.DownloadSentFile(filePath)
		assert.Error(t, err)
		assert.Nil(t, data)
		assert.Equal(t, "failed to download file: file not found", err.Error())

		mockClient.AssertExpectations(t)
	})
}

func TestInitOwnCloud(t *testing.T) {
	// Save original client and restore after test
	originalClient := owncloud.GetClient()
	t.Cleanup(func() {
		owncloud.SetClient(originalClient)
	})

	t.Run("Success", func(t *testing.T) {
		// No assertions needed; just verify it doesn't panic
		assert.NotPanics(t, func() {
			owncloud.InitOwnCloud("http://localhost:8080", "testuser", "testpass")
		})
	})

	t.Run("Client not nil after init", func(t *testing.T) {
		owncloud.InitOwnCloud("http://localhost:8080", "testuser", "testpass")
		assert.NotNil(t, owncloud.GetClient())
	})
}
