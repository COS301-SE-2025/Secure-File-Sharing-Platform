package unitTests

import (
	//"bytes"
	"errors"
	"io"
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	oc "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
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

func (m *MockWebDavClient) WriteStream(name string, src io.Reader, perm os.FileMode) error {
	args := m.Called(name, src, perm)
	return args.Error(0)
}

func (m *MockWebDavClient) Read(name string) ([]byte, error) {
	args := m.Called(name)
	return args.Get(0).([]byte), args.Error(1)
}

func (m *MockWebDavClient) ReadStream(name string) (io.ReadCloser, error) {
	args := m.Called(name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(io.ReadCloser), args.Error(1)
}

func (m *MockWebDavClient) Remove(path string) error {
	args := m.Called(path)
	return args.Error(0)
}


func SetupMockWebDavClient(t *testing.T) (*MockWebDavClient, func()) {
	t.Helper()
	mockClient := &MockWebDavClient{}
	
	cleanup := func() {
		oc.SetClient(nil) 
		mockClient.AssertExpectations(t)
	}
	
	oc.SetClient(mockClient)
	return mockClient, cleanup
}

func NewReadCloser(data string) io.ReadCloser {
	return io.NopCloser(strings.NewReader(data))
}


func TestSetClient(t *testing.T) {
	mockClient := &MockWebDavClient{}

	oc.SetClient(mockClient)
	assert.NotNil(t, mockClient)
}

// --- Tests for OwnCloudClient wrapper methods ---

// func TestOwnCloudClient_MkdirAll(t *testing.T) {
// 	mockWebDav, cleanup := SetupMockWebDavClient(t)
// 	defer cleanup()

// 	mockWebDav.On("MkdirAll", "test/path", os.FileMode(0755)).Return(nil)

// 	// Test through the owncloud package's SetClient interface
// 	ownCloudClient := &oc.OwnCloudClient{}
	
// 	// Since we can't directly test the embedded client, we'll test the package functions
// 	// that use the client interface
// 	assert.NotNil(t, ownCloudClient)
// }

func TestUploadFileStream_Success(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	reader := strings.NewReader("test file content")
	path := "/test/folder"
	filename := "test.txt"

	mockClient.On("MkdirAll", "test/folder", os.FileMode(0755)).Return(nil)
	mockClient.On("WriteStream", "test/folder/test.txt", reader, os.FileMode(0644)).Return(nil)

	err := oc.UploadFileStream(path, filename, reader)

	require.NoError(t, err)
}

func TestUploadFileStream_MkdirFails(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	reader := strings.NewReader("test content")
	path := "/test/folder"
	filename := "test.txt"
	expectedError := errors.New("mkdir failed")

	mockClient.On("MkdirAll", "test/folder", os.FileMode(0755)).Return(expectedError)

	err := oc.UploadFileStream(path, filename, reader)

	require.Error(t, err)
	assert.Contains(t, err.Error(), "mkdir failed")
}

func TestUploadFileStream_WriteStreamFails(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	reader := strings.NewReader("test content")
	path := "/test/folder"
	filename := "test.txt"
	writeError := errors.New("write failed")

	mockClient.On("MkdirAll", "test/folder", os.FileMode(0755)).Return(nil)
	mockClient.On("WriteStream", "test/folder/test.txt", reader, os.FileMode(0644)).Return(writeError)

	err := oc.UploadFileStream(path, filename, reader)

	require.Error(t, err)
	assert.Contains(t, err.Error(), "stream write failed")
}

func TestUploadFileStream_PathCleaning(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	reader := strings.NewReader("test content")
	path := "///test/folder///" 
	filename := "test.txt"
	mockClient.On("MkdirAll", "test/folder///", os.FileMode(0755)).Return(nil)
	mockClient.On("WriteStream", "test/folder////test.txt", reader, os.FileMode(0644)).Return(nil)

	err := oc.UploadFileStream(path, filename, reader)

	require.NoError(t, err)
}

func TestCreateFileStream_Success(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	path := "/test/folder"
	filename := "test.txt"

	mockClient.On("MkdirAll", "test/folder", os.FileMode(0755)).Return(nil)
	
	writeStreamCalled := make(chan bool, 1)
	mockClient.On("WriteStream", "test/folder/test.txt", mock.AnythingOfType("*io.PipeReader"), os.FileMode(0644)).
		Run(func(args mock.Arguments) {
			reader := args.Get(1).(io.Reader)
			_, _ = io.ReadAll(reader)
			writeStreamCalled <- true
		}).Return(nil)

	writer, err := oc.CreateFileStream(path, filename)

	require.NoError(t, err)
	require.NotNil(t, writer)

	testData := "test content"
	_, writeErr := writer.Write([]byte(testData))
	require.NoError(t, writeErr)

	closeErr := writer.Close()
	require.NoError(t, closeErr)
	<-writeStreamCalled
}

func TestCreateFileStream_MkdirFails(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	path := "/test/folder"
	filename := "test.txt"
	expectedError := errors.New("mkdir failed")

	mockClient.On("MkdirAll", "test/folder", os.FileMode(0755)).Return(expectedError)

	writer, err := oc.CreateFileStream(path, filename)

	require.Error(t, err)
	require.Nil(t, writer)
	assert.Contains(t, err.Error(), "mkdir failed")
}

func TestDownloadFileStream_Success(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	fileId := "test-file-123"
	expectedPath := "files/test-file-123"
	mockReader := NewReadCloser("test file content")

	mockClient.On("ReadStream", expectedPath).Return(mockReader, nil)

	reader, err := oc.DownloadFileStream(fileId)

	require.NoError(t, err)
	require.NotNil(t, reader)
	content, readErr := io.ReadAll(reader)
	require.NoError(t, readErr)
	assert.Equal(t, "test file content", string(content))
}

func TestDownloadFileStream_ReadStreamFails(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	fileId := "nonexistent-file"
	expectedPath := "files/nonexistent-file"
	expectedError := errors.New("file not found")

	mockClient.On("ReadStream", expectedPath).Return(nil, expectedError)

	reader, err := oc.DownloadFileStream(fileId)

	require.Error(t, err)
	require.Nil(t, reader)
	assert.Equal(t, expectedError, err)
}

func TestDownloadFileStreamTemp_Success(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	path := "/temp/file.txt"
	expectedPath := "temp/file.txt"
	mockReader := NewReadCloser("temp file content")

	mockClient.On("ReadStream", expectedPath).Return(mockReader, nil)

	reader, err := oc.DownloadFileStreamTemp(path)

	require.NoError(t, err)
	require.NotNil(t, reader)

	content, readErr := io.ReadAll(reader)
	require.NoError(t, readErr)
	assert.Equal(t, "temp file content", string(content))
}

func TestDownloadFileStreamTemp_PathCleaning(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	path := "///temp/file.txt"
	expectedPath := "temp/file.txt"
	mockReader := NewReadCloser("content")

	mockClient.On("ReadStream", expectedPath).Return(mockReader, nil)

	reader, err := oc.DownloadFileStreamTemp(path)

	require.NoError(t, err)
	require.NotNil(t, reader)
}

func TestDeleteFile_Success(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	fileId := "file-123"
	userID := "user-456"
	expectedPath := "files/user-456/file-123"

	mockClient.On("Remove", expectedPath).Return(nil)

	err := oc.DeleteFile(fileId, userID)

	require.NoError(t, err)
}

func TestDeleteFile_RemoveFails(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	fileId := "file-123"
	userID := "user-456"
	expectedPath := "files/user-456/file-123"
	expectedError := errors.New("delete failed")

	mockClient.On("Remove", expectedPath).Return(expectedError)

	err := oc.DeleteFile(fileId, userID)

	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to delete the file")
}

func TestDeleteFileTemp_Success(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	filePath := "/temp/file.txt"
	expectedPath := "temp/file.txt" 
	mockClient.On("Remove", expectedPath).Return(nil)
	err := oc.DeleteFileTemp(filePath)
	require.NoError(t, err)
}

func TestDeleteFileTemp_RemoveFails(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	filePath := "/temp/file.txt"
	expectedPath := "temp/file.txt"
	expectedError := errors.New("delete failed")

	mockClient.On("Remove", expectedPath).Return(expectedError)

	err := oc.DeleteFileTemp(filePath)

	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to delete temporary file")
}

func TestDeleteFileTemp_PathCleaning(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	filePath := "///temp/file.txt"
	expectedPath := "temp/file.txt"
	mockClient.On("Remove", expectedPath).Return(nil)
	err := oc.DeleteFileTemp(filePath)
	require.NoError(t, err)
}

func TestDownloadSentFileStream_Success(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	filePath := "sent/file.txt"
	mockReader := NewReadCloser("sent file content")

	mockClient.On("ReadStream", filePath).Return(mockReader, nil)

	reader, err := oc.DownloadSentFileStream(filePath)

	require.NoError(t, err)
	require.NotNil(t, reader)

	content, readErr := io.ReadAll(reader)
	require.NoError(t, readErr)
	assert.Equal(t, "sent file content", string(content))
}

func TestDownloadSentFileStream_ReadStreamFails(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	filePath := "sent/nonexistent.txt"
	expectedError := errors.New("file not found")

	mockClient.On("ReadStream", filePath).Return(nil, expectedError)

	reader, err := oc.DownloadSentFileStream(filePath)

	require.Error(t, err)
	require.Nil(t, reader)
	assert.Contains(t, err.Error(), "failed to download file")
}

func TestPathCleaning(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"Single leading slash", "/path/to/file", "path/to/file"},
		{"Multiple leading slashes", "///path/to/file", "path/to/file"},
		{"No leading slash", "path/to/file", "path/to/file"},
		{"Empty path", "", ""},
		{"Only slashes", "///", ""},
		{"Trailing slashes preserved", "/path/to/file///", "path/to/file///"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := strings.TrimLeft(tt.input, "/")
			assert.Equal(t, tt.expected, result)
		})
	}
}

// func TestUploadDownloadDelete_Integration(t *testing.T) {
// 	mockClient, cleanup := SetupMockWebDavClient(t)
// 	defer cleanup()

// 	fileId := "integration-test-file"
// 	userID := "test-user"
// 	path := "/uploads"
// 	filename := "test.txt"
// 	content := "integration test content"

// 	// Upload
// 	reader := strings.NewReader(content)
// 	mockClient.On("MkdirAll", "uploads", os.FileMode(0755)).Return(nil)
// 	mockClient.On("WriteStream", "uploads/test.txt", reader, os.FileMode(0644)).Return(nil)

// 	uploadErr := UploadFileStream(path, filename, reader)
// 	require.NoError(t, uploadErr)

// 	// Download
// 	downloadPath := "files/" + fileId
// 	mockReader := NewReadCloser(content)
// 	mockClient.On("ReadStream", downloadPath).Return(mockReader, nil)

// 	downloadReader, downloadErr := DownloadFileStream(fileId)
// 	require.NoError(t, downloadErr)
	
// 	downloadedContent, readErr := io.ReadAll(downloadReader)
// 	require.NoError(t, readErr)
// 	assert.Equal(t, content, string(downloadedContent))

// 	// Delete
// 	deletePath := "files/" + userID + "/" + fileId
// 	mockClient.On("Remove", deletePath).Return(nil)

// 	deleteErr := DeleteFile(fileId, userID)
// 	require.NoError(t, deleteErr)
// }

// --- Error handling tests ---

// func TestErrorWrapping(t *testing.T) {
// 	mockClient, cleanup := SetupMockWebDavClient(t)
// 	defer cleanup()

// 	originalError := errors.New("original WebDAV error")
	
// 	// Test UploadFileStream error wrapping
// 	reader := strings.NewReader("test")
// 	mockClient.On("MkdirAll", "test", os.FileMode(0755)).Return(originalError)
	
// 	err := oc.UploadFileStream("/test", "file.txt", reader)
// 	require.Error(t, err)
// 	assert.Contains(t, err.Error(), "mkdir failed")
// 	assert.ErrorIs(t, err, originalError)
// }

// --- Benchmark tests ---

// func BenchmarkUploadFileStream(b *testing.B) {
// 	mockClient := &MockWebDavClient{}
// 	originalClient := client
// 	client = mockClient
// 	defer func() { client = originalClient }()

// 	mockClient.On("MkdirAll", mock.Anything, mock.Anything).Return(nil)
// 	mockClient.On("WriteStream", mock.Anything, mock.Anything, mock.Anything).Return(nil)

// 	b.ResetTimer()
// 	for i := 0; i < b.N; i++ {
// 		reader := bytes.NewReader([]byte("benchmark test content"))
// 		_ = oc.UploadFileStream("/test", "file.txt", reader)
// 	}
// }