package unitTests

import (
	"errors"
	"io"
	"os"
	"path"
	"strings"
	"sync" // Import the sync package for the mutex
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

type MockWebDavClient struct{ mock.Mock }

func norm(p string) string { return strings.TrimLeft(path.Clean("/"+p), "/") }

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

// SetupMockWebDavClient now uses a mutex to safely set and clean up the global client.
func SetupMockWebDavClient(t *testing.T) (*MockWebDavClient, func()) {
	t.Helper()

	// Lock the mutex before touching the global state. This ensures
	// that no other test can interfere until this one is done.
	clientMutex.Lock()

	mockClient := &MockWebDavClient{}
	oc.SetClient(mockClient)

	// The returned cleanup function will be deferred by the caller.
	// It's crucial that it unlocks the mutex.
	return mockClient, func() {
		oc.SetClient(nil)
		clientMutex.Unlock()
	}
}

func clean(p string) string { return strings.TrimLeft(p, "/") }
func NewReadCloser(s string) io.ReadCloser { return io.NopCloser(strings.NewReader(s)) }
func consume(r io.Reader) bool {
	_, _ = io.Copy(io.Discard, r)
	return true
}

/* ---------------- Tests ---------------- */

/* UploadFileStream */

func TestUploadFileStream_Success(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()
	t.Cleanup(func() { mockClient.AssertExpectations(t) })

	reader := strings.NewReader("test file content")
	path := "/test/folder"
	filename := "test.txt"

	mockClient.On("MkdirAll",
		mock.MatchedBy(func(p string) bool { return clean(p) == "test/folder" }),
		mock.AnythingOfType("fs.FileMode"),
	).Return(nil).Once()

	mockClient.On("WriteStream",
		mock.MatchedBy(func(name string) bool { return clean(name) == "test/folder/test.txt" }),
		mock.MatchedBy(func(r io.Reader) bool { return consume(r) }),
		mock.AnythingOfType("fs.FileMode"),
	).Return(nil).Once()

	// If implementation falls back to Write in some cases, allow it without failing the test.
	mockClient.On("Write",
		mock.MatchedBy(func(name string) bool { return clean(name) == "test/folder/test.txt" }),
		mock.Anything, mock.Anything,
	).Return(nil).Maybe()

	err := oc.UploadFileStream(path, filename, reader)
	require.NoError(t, err)
}

func TestUploadFileStream_MkdirFails(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()
	t.Cleanup(func() { mockClient.AssertExpectations(t) })

	reader := strings.NewReader("test content")

	mockClient.On("MkdirAll",
		mock.MatchedBy(func(p string) bool { return clean(p) == "test/folder" }),
		mock.AnythingOfType("fs.FileMode"),
	).Return(errors.New("mkdir failed")).Once()

	err := oc.UploadFileStream("/test/folder", "test.txt", reader)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "mkdir failed")
}

func TestUploadFileStream_WriteStreamFails(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()
	t.Cleanup(func() { mockClient.AssertExpectations(t) })

	reader := strings.NewReader("test content")

	mockClient.On("MkdirAll",
		mock.MatchedBy(func(p string) bool { return clean(p) == "test/folder" }),
		mock.AnythingOfType("fs.FileMode"),
	).Return(nil).Once()

	mockClient.On("WriteStream",
		mock.MatchedBy(func(name string) bool { return clean(name) == "test/folder/test.txt" }),
		mock.MatchedBy(func(r io.Reader) bool { return consume(r) }),
		mock.AnythingOfType("fs.FileMode"),
	).Return(errors.New("write failed")).Once()

	err := oc.UploadFileStream("/test/folder", "test.txt", reader)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "stream write failed")
}

func TestUploadFileStream_PathCleaning(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()
	t.Cleanup(func() { mockClient.AssertExpectations(t) })

	reader := strings.NewReader("test content")
	pathIn := "///test/folder///"
	filename := "test.txt"

	mockClient.On("MkdirAll",
		mock.MatchedBy(func(p string) bool { return norm(p) == "test/folder" }),
		mock.AnythingOfType("fs.FileMode"),
	).Return(nil).Once()

	mockClient.On("WriteStream",
		mock.MatchedBy(func(name string) bool { return norm(name) == "test/folder/test.txt" }),
		// drain so writers don't hit "read/write on closed pipe"
		mock.MatchedBy(func(r io.Reader) bool { _, _ = io.Copy(io.Discard, r); return true }),
		mock.AnythingOfType("fs.FileMode"),
	).Return(nil).Once()

	err := oc.UploadFileStream(pathIn, filename, reader)
	require.NoError(t, err)
}

/* CreateFileStream */

func TestCreateFileStream_Success(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()
	t.Cleanup(func() { mockClient.AssertExpectations(t) })

	mockClient.On("MkdirAll",
		mock.MatchedBy(func(p string) bool { return clean(p) == "test/folder" }),
		mock.AnythingOfType("fs.FileMode"),
	).Return(nil).Once()

	done := make(chan struct{}, 1)
	mockClient.On("WriteStream",
		mock.MatchedBy(func(name string) bool { return clean(name) == "test/folder/test.txt" }),
		mock.MatchedBy(func(r io.Reader) bool { return consume(r) }),
		mock.AnythingOfType("fs.FileMode"),
	).Run(func(mock.Arguments) { done <- struct{}{} }).Return(nil).Once()

	w, err := oc.CreateFileStream("/test/folder", "test.txt")
	require.NoError(t, err)
	require.NotNil(t, w)

	_, err = w.Write([]byte("test content"))
	require.NoError(t, err)
	require.NoError(t, w.Close())
	<-done
}

func TestCreateFileStream_MkdirFails(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()
	t.Cleanup(func() { mockClient.AssertExpectations(t) })

	mockClient.On("MkdirAll",
		mock.MatchedBy(func(p string) bool { return clean(p) == "test/folder" }),
		mock.AnythingOfType("fs.FileMode"),
	).Return(errors.New("mkdir failed")).Once()

	w, err := oc.CreateFileStream("/test/folder", "test.txt")
	require.Error(t, err)
	require.Nil(t, w)
	assert.Contains(t, err.Error(), "mkdir failed")
}

/* DownloadFileStream */

func TestDownloadFileStream_Success(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()
	t.Cleanup(func() { mockClient.AssertExpectations(t) })

	fileID := "test-file-123"
	exp := "files/test-file-123"
	rc := NewReadCloser("test file content")

	mockClient.On("ReadStream", exp).Return(rc, nil).Once()

	r, err := oc.DownloadFileStream(fileID)
	require.NoError(t, err)
	b, err := io.ReadAll(r)
	require.NoError(t, err)
	assert.Equal(t, "test file content", string(b))
}

func TestDownloadFileStream_ReadStreamFails(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()
	t.Cleanup(func() { mockClient.AssertExpectations(t) })

	mockClient.On("ReadStream", "files/nonexistent-file").Return(nil, errors.New("file not found")).Once()

	r, err := oc.DownloadFileStream("nonexistent-file")
	require.Error(t, err)
	require.Nil(t, r)
}

/* DownloadSentFileStream */

func TestDownloadSentFileStream_Success(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()
	t.Cleanup(func() { mockClient.AssertExpectations(t) })

	path := "sent/file.txt"
	rc := NewReadCloser("sent file content")
	mockClient.On("ReadStream", path).Return(rc, nil).Once()

	r, err := oc.DownloadSentFileStream(path)
	require.NoError(t, err)
	b, err := io.ReadAll(r)
	require.NoError(t, err)
	assert.Equal(t, "sent file content", string(b))
}

func TestDownloadSentFileStream_ReadStreamFails(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()
	t.Cleanup(func() { mockClient.AssertExpectations(t) })

	mockClient.On("ReadStream", "sent/missing.txt").Return(nil, errors.New("file not found")).Once()

	r, err := oc.DownloadSentFileStream("sent/missing.txt")
	require.Error(t, err)
	require.Nil(t, r)
}

/* DeleteFile */

func TestDeleteFile_Success(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()
	t.Cleanup(func() { mockClient.AssertExpectations(t) })

	// expected path: files/<userID>/<fileID>
	mockClient.On("Remove", "files/user-456/file-123").Return(nil).Once()

	err := oc.DeleteFile("file-123", "user-456")
	require.NoError(t, err)
}

func TestDeleteFile_RemoveFails(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()
	t.Cleanup(func() { mockClient.AssertExpectations(t) })

	mockClient.On("Remove", "files/user-456/file-123").Return(errors.New("delete failed")).Once()

	err := oc.DeleteFile("file-123", "user-456")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to delete")
}

/* Temp helpers — align with current behavior (no client calls) */

func TestDownloadFileStreamTemp_Success(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()
	t.Cleanup(func() { mockClient.AssertExpectations(t) })

	// Input may have a leading slash; impl cleans to "temp/file.txt"
	inputPath := "/temp/file.txt"
	expectedClean := "temp/file.txt"

	// Return what your impl ultimately streams back
	mockClient.
		On("ReadStream",
			mock.MatchedBy(func(p string) bool {
				// if you added norm(), use: return norm(p) == expectedClean
				return strings.TrimLeft(p, "/") == expectedClean
			}),
		).
		Return(NewReadCloser("chunk data"), nil).
		Once()

	r, err := oc.DownloadFileStreamTemp(inputPath)
	require.NoError(t, err)
	require.NotNil(t, r)

	b, err := io.ReadAll(r)
	require.NoError(t, err)
	assert.Equal(t, "chunk data", string(b))
}

func TestDownloadFileStreamTemp_PathCleaning(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()
	t.Cleanup(func() { mockClient.AssertExpectations(t) })

	inputPath := "///temp/file.txt"
	expectedClean := "temp/file.txt"

	mockClient.
		On("ReadStream",
			mock.MatchedBy(func(p string) bool {
				// if you added norm(), use: return norm(p) == expectedClean
				return strings.TrimLeft(p, "/") == expectedClean
			}),
		).
		Return(NewReadCloser("chunk data"), nil).
		Once()

	r, err := oc.DownloadFileStreamTemp(inputPath)
	require.NoError(t, err)
	require.NotNil(t, r)

	// Optional: verify content again
	b, err := io.ReadAll(r)
	require.NoError(t, err)
	assert.Equal(t, "chunk data", string(b))
}

func TestDeleteFileTemp_Success(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()
	t.Cleanup(func() { mockClient.AssertExpectations(t) })

	input := "/temp/file.txt"
	expected := "temp/file.txt"

	mockClient.
		On("Remove",
			mock.MatchedBy(func(p string) bool {
				// if you added norm(), prefer: return norm(p) == expected
				return strings.TrimLeft(p, "/") == expected
			}),
		).
		Return(nil).
		Once()

	err := oc.DeleteFileTemp(input)
	require.NoError(t, err)
}

func TestDeleteFileTemp_RemoveFails(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()
	t.Cleanup(func() { mockClient.AssertExpectations(t) })

	input := "/temp/file.txt"
	expected := "temp/file.txt"

	mockClient.
		On("Remove",
			mock.MatchedBy(func(p string) bool {
				return strings.TrimLeft(p, "/") == expected
			}),
		).
		Return(errors.New("delete failed")).
		Once()

	err := oc.DeleteFileTemp(input)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to delete temporary file")
}

func TestDeleteFileTemp_PathCleaning(t *testing.T) {
	mockClient, cleanup := SetupMockWebDavClient(t)
	defer cleanup()
	t.Cleanup(func() { mockClient.AssertExpectations(t) })

	input := "///temp/file.txt"
	expected := "temp/file.txt"

	mockClient.
		On("Remove",
			mock.MatchedBy(func(p string) bool {
				return strings.TrimLeft(p, "/") == expected
			}),
		).
		Return(nil).
		Once()

	err := oc.DeleteFileTemp(input)
	require.NoError(t, err)
}