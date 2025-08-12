package unitTests

import (
	"bytes"
	//"errors"
	"os"
	"testing"
	"io"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	ow "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)

// Mock WebDavClient for testing
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
	return args.Get(0).(io.ReadCloser), args.Error(1)
}

func (m *MockWebDavClient) Remove(path string) error {
	args := m.Called(path)
	return args.Error(0)
}

// Test InitOwnCloud function
// Test InitOwnCloud function
func TestInitOwnCloud(t *testing.T) {
	// Create a new MockWebDavClient
	client := new(MockWebDavClient)
	ow.SetClient(client)
	assert.IsType(t, &MockWebDavClient{}, client)
	client.AssertExpectations(t)
}

// Test UploadFileStream function
func TestUploadFileStream(t *testing.T) {
	client := new(MockWebDavClient)
	ow.SetClient(client)

	// Adjust the mock to expect the correct path and os.FileMode type for permissions
	client.On("MkdirAll", "/test/path", mock.AnythingOfType("os.FileMode")).Return(nil)
	client.On("WriteStream", "/test/path/filename", mock.Anything, mock.Anything).Return(nil)

	// Call the function to test
	err := ow.UploadFileStream("/test/path", "filename", bytes.NewReader([]byte("file content")))

	// Assert that there is no error
	assert.NoError(t, err)

	// Verify that the mock expectations were met
	client.AssertExpectations(t)
}

// func TestUploadFileStream_Error(t *testing.T) {
// 	client := new(MockWebDavClient)
// 	ow.SetClient(client)

// 	// Adjust the mock to expect the correct path and os.FileMode type for permissions
// 	client.On("MkdirAll", "/test/path", mock.AnythingOfType("os.FileMode")).Return(errors.New("mkdir failed"))

// 	// Call the function to test
// 	err := ow.UploadFileStream("/test/path", "filename", bytes.NewReader([]byte("file content")))

// 	// Assert that there is an error
// 	assert.Error(t, err)

// 	// Verify that the mock expectations were met
// 	client.AssertExpectations(t)
// }

// // Test CreateFileStream function
// func TestCreateFileStream(t *testing.T) {
// 	client := new(MockWebDavClient)
// 	ow.SetClient(client)

// 	client.On("MkdirAll", "/test/path", mock.Anything).Return(nil)
// 	client.On("WriteStream", "/test/path/filename", mock.Anything, mock.Anything).Return(nil)

// 	writer, err := ow.CreateFileStream("/test/path", "filename")
// 	assert.NoError(t, err)
// 	assert.NotNil(t, writer)

// 	// Simulate closing the writer
// 	writer.Close()
// 	client.AssertExpectations(t)
// }

// func TestCreateFileStream_Error(t *testing.T) {
// 	client := new(MockWebDavClient)
// 	ow.SetClient(client)

// 	client.On("MkdirAll", "/test/path", mock.Anything).Return(errors.New("mkdir failed"))
// 	writer, err := ow.CreateFileStream("/test/path", "filename")
// 	assert.Error(t, err)
// 	assert.Nil(t, writer)
// 	client.AssertExpectations(t)
// }

// // Test DownloadFileStream function
// func TestDownloadFileStream(t *testing.T) {
// 	client := new(MockWebDavClient)
// 	ow.SetClient(client)

// 	client.On("ReadStream", "files/123").Return(io.NopCloser(bytes.NewReader([]byte("file content"))), nil)

// 	stream, err := ow.DownloadFileStream("123")
// 	assert.NoError(t, err)
// 	assert.NotNil(t, stream)

// 	content, err := io.ReadAll(stream)
// 	assert.NoError(t, err)
// 	assert.Equal(t, "file content", string(content))
// 	client.AssertExpectations(t)
// }

// func TestDownloadFileStream_Error(t *testing.T) {
// 	client := new(MockWebDavClient)
// 	ow.SetClient(client)

// 	client.On("ReadStream", "files/123").Return(nil, errors.New("read stream failed"))

// 	stream, err := ow.DownloadFileStream("123")
// 	assert.Error(t, err)
// 	assert.Nil(t, stream)
// 	client.AssertExpectations(t)
// }

// // Test DeleteFile function
// func TestDeleteFile(t *testing.T) {
// 	client := new(MockWebDavClient)
// 	ow.SetClient(client)

// 	client.On("Remove", "/files/user123/123").Return(nil)

// 	err := ow.DeleteFile("123", "user123")
// 	assert.NoError(t, err)
// 	client.AssertExpectations(t)
// }

// func TestDeleteFile_Error(t *testing.T) {
// 	client := new(MockWebDavClient)
// 	ow.SetClient(client)

// 	client.On("Remove", "/files/user123/123").Return(errors.New("remove failed"))

// 	err := ow.DeleteFile("123", "user123")
// 	assert.Error(t, err)
// 	client.AssertExpectations(t)
// }

// // Test DeleteFileTemp function
// func TestDeleteFileTemp(t *testing.T) {
// 	client := new(MockWebDavClient)
// 	ow.SetClient(client)

// 	client.On("Remove", "/temp/path/123").Return(nil)

// 	err := ow.DeleteFileTemp("/temp/path/123")
// 	assert.NoError(t, err)
// 	client.AssertExpectations(t)
// }

// func TestDeleteFileTemp_Error(t *testing.T) {
// 	client := new(MockWebDavClient)
// 	ow.SetClient(client)

// 	client.On("Remove", "/temp/path/123").Return(errors.New("remove failed"))

// 	err := ow.DeleteFileTemp("/temp/path/123")
// 	assert.Error(t, err)
// 	client.AssertExpectations(t)
// }