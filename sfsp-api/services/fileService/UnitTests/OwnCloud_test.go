package unitTests

import (
	"errors"
	"io"
	"io/fs"
	"path"
	"strings"
	"sync"
	"testing"

	oc "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

/* ---------------- Helpers & Mock ---------------- */

// clientMutex is a package-level mutex to control access to the global mock client.
// This prevents race conditions when tests are run in parallel.
var clientMutex = &sync.Mutex{}

type MockWebDavClient struct{ 
	mock.Mock 
}

func norm(p string) string { return strings.TrimLeft(path.Clean("/"+p), "/") }

func (m *MockWebDavClient) MkdirAll(path string, perm fs.FileMode) error {
	args := m.Called(path, perm)
	return args.Error(0)
}
func (m *MockWebDavClient) Write(name string, data []byte, perm fs.FileMode) error {
	args := m.Called(name, data, perm)
	return args.Error(0)
}
func (m *MockWebDavClient) WriteStream(name string, src io.Reader, perm fs.FileMode) error {
	args := m.Called(name, src, perm)
	return args.Error(0)
}
func (m *MockWebDavClient) Read(name string) ([]byte, error) {
	args := m.Called(name)
	b, _ := args.Get(0).([]byte)
	return b, args.Error(1)
}
func (m *MockWebDavClient) ReadStream(name string) (io.ReadCloser, error) {
	args := m.Called(name)
	if rc, ok := args.Get(0).(io.ReadCloser); ok {
		return rc, args.Error(1)
	}
	return nil, args.Error(1)
}
func (m *MockWebDavClient) Remove(path string) error {
	args := m.Called(path)
	return args.Error(0)
}

// SetupMockWebDavClient with improved cleanup and isolation
func SetupMockWebDavClient(t *testing.T) (*MockWebDavClient, func()) {
	t.Helper()

	// Lock the mutex before touching the global state
	clientMutex.Lock()

	// Create a fresh mock client for this test
	mockClient := &MockWebDavClient{}
	
	// Reset any previous state and set the new client
	oc.SetClient(nil) // Clear first
	oc.SetClient(mockClient)

	// The returned cleanup function will be deferred by the caller
	return mockClient, func() {
		// Clear all expectations and reset the mock
		mockClient.ExpectedCalls = nil
		mockClient.Calls = nil
		
		// Clear the global client
		oc.SetClient(nil)
		
		// Unlock the mutex
		clientMutex.Unlock()
	}
}

func clean(p string) string { return strings.TrimLeft(p, "/") }
func NewReadCloser(s string) io.ReadCloser { return io.NopCloser(strings.NewReader(s)) }

// Updated consume function that properly drains the reader
func consume(r io.Reader) bool {
	if r == nil {
		return false
	}
	_, err := io.Copy(io.Discard, r)
	return err == nil
}

/* ---------------- Tests ---------------- */

/* UploadFileStream */

func TestUploadFileStream_Success(t *testing.T) {
	// Disable parallel execution to avoid race conditions
	// t.Parallel() // Remove this if you had it
	
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	reader := strings.NewReader("test file content")
	path := "/test/folder"
	filename := "test.txt"

	// Set up expectations with more precise matchers
	mockClient.On("MkdirAll",
		mock.MatchedBy(func(p string) bool { 
			normalized := clean(p)
			t.Logf("MkdirAll called with path: %q, normalized: %q", p, normalized)
			return normalized == "test/folder" 
		}),
		mock.AnythingOfType("fs.FileMode"),
	).Return(nil).Once()

	mockClient.On("WriteStream",
		mock.MatchedBy(func(name string) bool { 
			normalized := clean(name)
			t.Logf("WriteStream called with name: %q, normalized: %q", name, normalized)
			return normalized == "test/folder/test.txt" 
		}),
		mock.MatchedBy(func(r io.Reader) bool { 
			result := consume(r)
			t.Logf("WriteStream reader consumption result: %v", result)
			return result
		}),
		mock.AnythingOfType("fs.FileMode"),
	).Return(nil).Once()

	// Call the function under test
	err := oc.UploadFileStream(path, filename, reader)
	
	// Assert results
	require.NoError(t, err)
	
	// Verify all expectations were met
	mockClient.AssertExpectations(t)
}

func TestUploadFileStream_MkdirFails(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	reader := strings.NewReader("test content")

	mockClient.On("MkdirAll",
		mock.MatchedBy(func(p string) bool { 
			normalized := clean(p)
			t.Logf("MkdirAll called with path: %q, normalized: %q", p, normalized)
			return normalized == "test/folder" 
		}),
		mock.AnythingOfType("fs.FileMode"),
	).Return(errors.New("mkdir failed")).Once()

	err := oc.UploadFileStream("/test/folder", "test.txt", reader)
	
	require.Error(t, err)
	assert.Contains(t, err.Error(), "mkdir failed")
	
	mockClient.AssertExpectations(t)
}

func TestUploadFileStream_WriteStreamFails(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	reader := strings.NewReader("test content")

	mockClient.On("MkdirAll",
		mock.MatchedBy(func(p string) bool { 
			normalized := clean(p)
			return normalized == "test/folder" 
		}),
		mock.AnythingOfType("fs.FileMode"),
	).Return(nil).Once()

	mockClient.On("WriteStream",
		mock.MatchedBy(func(name string) bool { 
			normalized := clean(name)
			return normalized == "test/folder/test.txt" 
		}),
		mock.MatchedBy(func(r io.Reader) bool { 
			return consume(r)
		}),
		mock.AnythingOfType("fs.FileMode"),
	).Return(errors.New("write failed")).Once()

	err := oc.UploadFileStream("/test/folder", "test.txt", reader)
	
	require.Error(t, err)
	assert.Contains(t, err.Error(), "write failed")
	
	mockClient.AssertExpectations(t)
}

func TestUploadFileStream_PathCleaning(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	reader := strings.NewReader("test content")
	pathIn := "///test/folder///"
	filename := "test.txt"

	mockClient.On("MkdirAll",
		mock.MatchedBy(func(p string) bool { 
			normalized := norm(p)
			t.Logf("MkdirAll path cleaning - input: %q, normalized: %q", p, normalized)
			return normalized == "test/folder" 
		}),
		mock.AnythingOfType("fs.FileMode"),
	).Return(nil).Once()

	mockClient.On("WriteStream",
		mock.MatchedBy(func(name string) bool { 
			normalized := norm(name)
			t.Logf("WriteStream path cleaning - input: %q, normalized: %q", name, normalized)
			return normalized == "test/folder/test.txt" 
		}),
		mock.MatchedBy(func(r io.Reader) bool { 
			return consume(r)
		}),
		mock.AnythingOfType("fs.FileMode"),
	).Return(nil).Once()

	err := oc.UploadFileStream(pathIn, filename, reader)
	
	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

/* CreateFileStream */

func TestCreateFileStream_Success(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	mockClient.On("MkdirAll",
		mock.MatchedBy(func(p string) bool { 
			return clean(p) == "test/folder" 
		}),
		mock.AnythingOfType("fs.FileMode"),
	).Return(nil).Once()

	done := make(chan struct{}, 1)
	mockClient.On("WriteStream",
		mock.MatchedBy(func(name string) bool { 
			return clean(name) == "test/folder/test.txt" 
		}),
		mock.MatchedBy(func(r io.Reader) bool { 
			return consume(r)
		}),
		mock.AnythingOfType("fs.FileMode"),
	).Run(func(mock.Arguments) { 
		done <- struct{}{} 
	}).Return(nil).Once()

	w, err := oc.CreateFileStream("/test/folder", "test.txt")
	require.NoError(t, err)
	require.NotNil(t, w)

	_, err = w.Write([]byte("test content"))
	require.NoError(t, err)
	require.NoError(t, w.Close())
	
	<-done
	mockClient.AssertExpectations(t)
}

func TestCreateFileStream_MkdirFails(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	mockClient.On("MkdirAll",
		mock.MatchedBy(func(p string) bool { 
			return clean(p) == "test/folder" 
		}),
		mock.AnythingOfType("fs.FileMode"),
	).Return(errors.New("mkdir failed")).Once()

	w, err := oc.CreateFileStream("/test/folder", "test.txt")
	
	require.Error(t, err)
	require.Nil(t, w)
	assert.Contains(t, err.Error(), "mkdir failed")
	
	mockClient.AssertExpectations(t)
}

/* DownloadFileStream */

func TestDownloadFileStream_Success(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	fileID := "test-file-123"
	exp := "files/test-file-123"
	rc := NewReadCloser("test file content")

	mockClient.On("ReadStream", exp).Return(rc, nil).Once()

	r, err := oc.DownloadFileStream(fileID)
	require.NoError(t, err)
	
	b, err := io.ReadAll(r)
	require.NoError(t, err)
	assert.Equal(t, "test file content", string(b))
	
	mockClient.AssertExpectations(t)
}

func TestDownloadFileStream_ReadStreamFails(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	mockClient.On("ReadStream", "files/nonexistent-file").Return(nil, errors.New("file not found")).Once()

	r, err := oc.DownloadFileStream("nonexistent-file")
	
	require.Error(t, err)
	require.Nil(t, r)
	
	mockClient.AssertExpectations(t)
}

/* DownloadSentFileStream */

func TestDownloadSentFileStream_Success(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	path := "sent/file.txt"
	rc := NewReadCloser("sent file content")
	mockClient.On("ReadStream", path).Return(rc, nil).Once()

	r, err := oc.DownloadSentFileStream(path)
	require.NoError(t, err)
	
	b, err := io.ReadAll(r)
	require.NoError(t, err)
	assert.Equal(t, "sent file content", string(b))
	
	mockClient.AssertExpectations(t)
}

func TestDownloadSentFileStream_ReadStreamFails(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	mockClient.On("ReadStream", "sent/missing.txt").Return(nil, errors.New("file not found")).Once()

	r, err := oc.DownloadSentFileStream("sent/missing.txt")
	
	require.Error(t, err)
	require.Nil(t, r)
	
	mockClient.AssertExpectations(t)
}

/* DeleteFile */

func TestDeleteFile_Success(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	// expected path: files/<userID>/<fileID>
	mockClient.On("Remove", "files/user-456/file-123").Return(nil).Once()

	err := oc.DeleteFile("file-123", "user-456")
	require.NoError(t, err)
	
	mockClient.AssertExpectations(t)
}

func TestDeleteFile_RemoveFails(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	mockClient.On("Remove", "files/user-456/file-123").Return(errors.New("delete failed")).Once()

	err := oc.DeleteFile("file-123", "user-456")
	
	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to delete")
	
	mockClient.AssertExpectations(t)
}

/* Temp helpers */

func TestDownloadFileStreamTemp_Success(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	inputPath := "/temp/file.txt"
	expectedClean := "temp/file.txt"

	mockClient.On("ReadStream",
		mock.MatchedBy(func(p string) bool {
			normalized := strings.TrimLeft(p, "/")
			return normalized == expectedClean
		}),
	).Return(NewReadCloser("chunk data"), nil).Once()

	r, err := oc.DownloadFileStreamTemp(inputPath)
	require.NoError(t, err)
	require.NotNil(t, r)

	b, err := io.ReadAll(r)
	require.NoError(t, err)
	assert.Equal(t, "chunk data", string(b))
	
	mockClient.AssertExpectations(t)
}

func TestDownloadFileStreamTemp_PathCleaning(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	inputPath := "///temp/file.txt"
	expectedClean := "temp/file.txt"

	mockClient.On("ReadStream",
		mock.MatchedBy(func(p string) bool {
			normalized := strings.TrimLeft(p, "/")
			return normalized == expectedClean
		}),
	).Return(NewReadCloser("chunk data"), nil).Once()

	r, err := oc.DownloadFileStreamTemp(inputPath)
	require.NoError(t, err)
	require.NotNil(t, r)

	b, err := io.ReadAll(r)
	require.NoError(t, err)
	assert.Equal(t, "chunk data", string(b))
	
	mockClient.AssertExpectations(t)
}

func TestDeleteFileTemp_Success(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	input := "/temp/file.txt"
	expected := "temp/file.txt"

	mockClient.On("Remove",
		mock.MatchedBy(func(p string) bool {
			normalized := strings.TrimLeft(p, "/")
			return normalized == expected
		}),
	).Return(nil).Once()

	err := oc.DeleteFileTemp(input)
	require.NoError(t, err)
	
	mockClient.AssertExpectations(t)
}

func TestDeleteFileTemp_RemoveFails(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	input := "/temp/file.txt"
	expected := "temp/file.txt"

	mockClient.On("Remove",
		mock.MatchedBy(func(p string) bool {
			normalized := strings.TrimLeft(p, "/")
			return normalized == expected
		}),
	).Return(errors.New("delete failed")).Once()

	err := oc.DeleteFileTemp(input)
	
	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to delete temporary file")
	
	mockClient.AssertExpectations(t)
}

func TestDeleteFileTemp_PathCleaning(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()

	input := "///temp/file.txt"
	expected := "temp/file.txt"

	mockClient.On("Remove",
		mock.MatchedBy(func(p string) bool {
			normalized := strings.TrimLeft(p, "/")
			return normalized == expected
		}),
	).Return(nil).Once()

	err := oc.DeleteFileTemp(input)
	require.NoError(t, err)
	
	mockClient.AssertExpectations(t)
}