package unitTests

import (
    "errors"
    "os"    
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"

    "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)

type MockClient struct {
    mock.Mock
}

func (m *MockClient) MkdirAll(path string, perm os.FileMode) error {
    args := m.Called(path, perm)
    return args.Error(0)
}

func (m *MockClient) Write(name string, data []byte, perm os.FileMode) error {
    args := m.Called(name, data, perm)
    return args.Error(0)
}

func (m *MockClient) Read(name string) ([]byte, error) {
    args := m.Called(name)
    var b []byte
    if raw := args.Get(0); raw != nil {
        b = raw.([]byte)
    }
    return b, args.Error(1)
}

func TestUploadFile_Success(t *testing.T) {
    mockClient := new(MockClient)
    owncloud.SetClient(mockClient)

    path := "/testpath"
    filename := "file.txt"
    data := []byte("file data")
    fullPath := path + "/" + filename

    mockClient.On("MkdirAll", path, os.FileMode(0755)).Return(nil)
    mockClient.On("Write", fullPath, data, os.FileMode(0644)).Return(nil)

    err := owncloud.UploadFile(path, filename, data)

    assert.NoError(t, err)
    mockClient.AssertExpectations(t)
}

func TestUploadFile_MkdirAllFail(t *testing.T) {
    mockClient := new(MockClient)
    owncloud.SetClient(mockClient)

    path := "/failpath"
    filename := "file.txt"
    data := []byte("file data")

    mockClient.On("MkdirAll", path, os.FileMode(0755)).Return(errors.New("mkdir error"))

    err := owncloud.UploadFile(path, filename, data)

    assert.Error(t, err)
    assert.EqualError(t, err, "mkdir error")
    mockClient.AssertExpectations(t)
}

func TestDownloadFile_Success(t *testing.T) {
    mockClient := new(MockClient)
    owncloud.SetClient(mockClient)

    path := "/testpath"
    filename := "file.txt"
    fullPath := path + "/" + filename
    fileData := []byte("file content")

    mockClient.On("Read", fullPath).Return(fileData, nil)

    data, err := owncloud.DownloadFile(path, filename)

    assert.NoError(t, err)
    assert.Equal(t, fileData, data)
    mockClient.AssertExpectations(t)
}

func TestDownloadFile_Failure(t *testing.T) {
    mockClient := new(MockClient)
    owncloud.SetClient(mockClient)

    path := "/failpath"
    filename := "file.txt"
    fullPath := path + "/" + filename

    mockClient.On("Read", fullPath).Return(nil, errors.New("read error"))

    data, err := owncloud.DownloadFile(path, filename)

    assert.Nil(t, data)
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "failed to download file: read error")
    mockClient.AssertExpectations(t)
}
