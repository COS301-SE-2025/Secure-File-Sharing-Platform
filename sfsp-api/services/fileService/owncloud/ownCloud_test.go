package owncloud_test

import (
	"errors"
	"io"
	"io/fs"
	"path"
	"strings"
	"testing"

	oc "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

type mockWebDAV struct{ mock.Mock }

func (m *mockWebDAV) MkdirAll(p string, perm fs.FileMode) error {
	return m.Called(p, perm).Error(0)
}
func (m *mockWebDAV) Write(name string, data []byte, perm fs.FileMode) error {
	return m.Called(name, data, perm).Error(0)
}
func (m *mockWebDAV) WriteStream(name string, src io.Reader, perm fs.FileMode) error {
	return m.Called(name, src, perm).Error(0)
}
func (m *mockWebDAV) Read(name string) ([]byte, error) {
	args := m.Called(name)
	b, _ := args.Get(0).([]byte)
	return b, args.Error(1)
}
func (m *mockWebDAV) ReadStream(name string) (io.ReadCloser, error) {
	args := m.Called(name)
	if rc, ok := args.Get(0).(io.ReadCloser); ok {
		return rc, args.Error(1)
	}
	return nil, args.Error(1)
}
func (m *mockWebDAV) Remove(p string) error {
	return m.Called(p).Error(0)
}

func setup(t *testing.T) *mockWebDAV {
	t.Helper()
	c := &mockWebDAV{}
	oc.SetClient(c)
	t.Cleanup(func() { oc.SetClient(nil) })
	return c
}

func drain(r io.Reader) bool {
	if r == nil {
		return false
	}
	_, err := io.Copy(io.Discard, r)
	return err == nil
}

func clean(p string) string { return strings.TrimLeft(p, "/") }
func norm(p string) string  { return strings.TrimLeft(path.Clean("/"+p), "/") }
func rc(s string) io.ReadCloser {
	return io.NopCloser(strings.NewReader(s))
}

func TestUploadFileStream_Success(t *testing.T) {
	c := setup(t)

	reader := strings.NewReader("test file content")

	c.On("MkdirAll",
		mock.MatchedBy(func(p string) bool { return clean(p) == "test/folder" }),
		mock.Anything,
	).Return(nil).Once()

	c.On("WriteStream",
		mock.MatchedBy(func(name string) bool { return clean(name) == "test/folder/test.txt" }),
		mock.MatchedBy(func(r io.Reader) bool { return drain(r) }),
		mock.Anything,
	).Return(nil).Once()

	err := oc.UploadFileStream("/test/folder", "test.txt", reader)
	require.NoError(t, err)
	c.AssertExpectations(t)
}

func TestUploadFileStream_MkdirFails(t *testing.T) {
	c := setup(t)
	reader := strings.NewReader("x")

	c.On("MkdirAll",
		mock.MatchedBy(func(p string) bool { return clean(p) == "test/folder" }),
		mock.Anything,
	).Return(errors.New("mkdir failed")).Once()

	err := oc.UploadFileStream("/test/folder", "test.txt", reader)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "mkdir failed")
	c.AssertExpectations(t)
}

func TestUploadFileStream_WriteStreamFails(t *testing.T) {
	c := setup(t)
	reader := strings.NewReader("x")

	c.On("MkdirAll",
		mock.MatchedBy(func(p string) bool { return clean(p) == "test/folder" }),
		mock.Anything,
	).Return(nil).Once()

	c.On("WriteStream",
		mock.MatchedBy(func(name string) bool { return clean(name) == "test/folder/test.txt" }),
		mock.MatchedBy(func(r io.Reader) bool { return drain(r) }),
		mock.Anything,
	).Return(errors.New("write failed")).Once()

	err := oc.UploadFileStream("/test/folder", "test.txt", reader)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "write failed")
	c.AssertExpectations(t)
}

func TestUploadFileStream_PathCleaning(t *testing.T) {
	c := setup(t)
	reader := strings.NewReader("x")

	c.On("MkdirAll",
		mock.MatchedBy(func(p string) bool { return norm(p) == "test/folder" }),
		mock.Anything,
	).Return(nil).Once()

	c.On("WriteStream",
		mock.MatchedBy(func(name string) bool { return norm(name) == "test/folder/test.txt" }),
		mock.MatchedBy(func(r io.Reader) bool { return drain(r) }),
		mock.Anything,
	).Return(nil).Once()

	err := oc.UploadFileStream("///test/folder///", "test.txt", reader)
	require.NoError(t, err)
	c.AssertExpectations(t)
}

func TestCreateFileStream_Success(t *testing.T) {
	c := setup(t)

	c.On("MkdirAll",
		mock.MatchedBy(func(p string) bool { return clean(p) == "test/folder" }),
		mock.Anything,
	).Return(nil).Once()

	done := make(chan struct{}, 1)
	c.On("WriteStream",
		mock.MatchedBy(func(name string) bool { return clean(name) == "test/folder/test.txt" }),
		mock.Anything,
		mock.Anything,
	).Run(func(args mock.Arguments) {
		if r, ok := args[1].(io.Reader); ok {
			_, _ = io.Copy(io.Discard, r)
		}
		done <- struct{}{}
	}).Return(nil).Once()

	w, err := oc.CreateFileStream("/test/folder", "test.txt")
	require.NoError(t, err)
	require.NotNil(t, w)

	_, err = w.Write([]byte("test content"))
	require.NoError(t, err)
	require.NoError(t, w.Close())

	<-done
	c.AssertNumberOfCalls(t, "MkdirAll", 1)
	c.AssertNumberOfCalls(t, "WriteStream", 1)
}

func TestCreateFileStream_MkdirFails(t *testing.T) {
	c := setup(t)

	c.On("MkdirAll",
		mock.MatchedBy(func(p string) bool { return clean(p) == "test/folder" }),
		mock.Anything,
	).Return(errors.New("mkdir failed")).Once()

	w, err := oc.CreateFileStream("/test/folder", "test.txt")
	require.Error(t, err)
	require.Nil(t, w)
	assert.Contains(t, err.Error(), "mkdir failed")
	c.AssertExpectations(t)
}

func TestDownloadFileStream_Success(t *testing.T) {
	c := setup(t)

	fileID := "test-file-123"
	exp := "files/test-file-123"

	c.On("ReadStream", exp).Return(rc("test file content"), nil).Once()

	r, err := oc.DownloadFileStream(fileID)
	require.NoError(t, err)

	b, err := io.ReadAll(r)
	require.NoError(t, err)
	assert.Equal(t, "test file content", string(b))
	c.AssertExpectations(t)
}

func TestDownloadFileStream_ReadStreamFails(t *testing.T) {
	c := setup(t)

	c.On("ReadStream", "files/nonexistent-file").Return(nil, errors.New("file not found")).Once()

	r, err := oc.DownloadFileStream("nonexistent-file")
	require.Error(t, err)
	require.Nil(t, r)
	c.AssertExpectations(t)
}

func TestDownloadSentFileStream_Success(t *testing.T) {
	c := setup(t)

	p := "sent/file.txt"
	c.On("ReadStream", p).Return(rc("sent file content"), nil).Once()

	r, err := oc.DownloadSentFileStream(p)
	require.NoError(t, err)

	b, err := io.ReadAll(r)
	require.NoError(t, err)
	assert.Equal(t, "sent file content", string(b))
	c.AssertExpectations(t)
}

func TestDownloadSentFileStream_ReadStreamFails(t *testing.T) {
	c := setup(t)

	c.On("ReadStream", "sent/missing.txt").Return(nil, errors.New("file not found")).Once()

	r, err := oc.DownloadSentFileStream("sent/missing.txt")
	require.Error(t, err)
	require.Nil(t, r)
	c.AssertExpectations(t)
}

func TestDeleteFile_Success(t *testing.T) {
	c := setup(t)

	c.On("Remove", "files/user-456/file-123").Return(nil).Once()

	err := oc.DeleteFile("file-123", "user-456")
	require.NoError(t, err)
	c.AssertExpectations(t)
}

func TestDeleteFile_RemoveFails(t *testing.T) {
	c := setup(t)

	c.On("Remove", "files/user-456/file-123").Return(errors.New("delete failed")).Once()

	err := oc.DeleteFile("file-123", "user-456")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to delete")
	c.AssertExpectations(t)
}

func TestDownloadFileStreamTemp_Success(t *testing.T) {
	c := setup(t)

	inputPath := "/temp/file.txt"
	expected := "temp/file.txt"

	c.On("ReadStream",
		mock.MatchedBy(func(p string) bool { return clean(p) == expected }),
	).Return(rc("chunk data"), nil).Once()

	r, err := oc.DownloadFileStreamTemp(inputPath)
	require.NoError(t, err)
	require.NotNil(t, r)

	b, err := io.ReadAll(r)
	require.NoError(t, err)
	assert.Equal(t, "chunk data", string(b))
	c.AssertExpectations(t)
}

func TestDownloadFileStreamTemp_PathCleaning(t *testing.T) {
	c := setup(t)

	inputPath := "///temp/file.txt"
	expected := "temp/file.txt"

	c.On("ReadStream",
		mock.MatchedBy(func(p string) bool { return clean(p) == expected }),
	).Return(rc("chunk data"), nil).Once()

	r, err := oc.DownloadFileStreamTemp(inputPath)
	require.NoError(t, err)
	require.NotNil(t, r)

	b, err := io.ReadAll(r)
	require.NoError(t, err)
	assert.Equal(t, "chunk data", string(b))
	c.AssertExpectations(t)
}

func TestDeleteFileTemp_Success(t *testing.T) {
	c := setup(t)

	input := "/temp/file.txt"
	expected := "temp/file.txt"

	c.On("Remove",
		mock.MatchedBy(func(p string) bool { return clean(p) == expected }),
	).Return(nil).Once()

	err := oc.DeleteFileTemp(input)
	require.NoError(t, err)
	c.AssertExpectations(t)
}

func TestDeleteFileTemp_RemoveFails(t *testing.T) {
	c := setup(t)

	input := "/temp/file.txt"
	expected := "temp/file.txt"

	c.On("Remove",
		mock.MatchedBy(func(p string) bool { return clean(p) == expected }),
	).Return(errors.New("delete failed")).Once()

	err := oc.DeleteFileTemp(input)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to delete temporary file")
	c.AssertExpectations(t)
}

func TestDeleteFileTemp_PathCleaning(t *testing.T) {
	c := setup(t)

	input := "///temp/file.txt"
	expected := "temp/file.txt"

	c.On("Remove",
		mock.MatchedBy(func(p string) bool { return clean(p) == expected }),
	).Return(nil).Once()

	err := oc.DeleteFileTemp(input)
	require.NoError(t, err)
	c.AssertExpectations(t)
}
