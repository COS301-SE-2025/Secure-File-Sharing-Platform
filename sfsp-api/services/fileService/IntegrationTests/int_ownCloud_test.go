//go:build integration
// +build integration

package integration_test

import (
	"bytes"
	"errors"
	"io"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
	"os"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	oc "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)

type memDAV struct {
	mu       sync.Mutex
	files    map[string][]byte
	mkdirs   map[string]bool
	errMkdir map[string]error
	errWrite map[string]error
	errWStrm map[string]error
	errRead  map[string]error
	errRStrm map[string]error
	errRem   map[string]error
	lastRm   string
}

func newMemDAV() *memDAV {
	return &memDAV{
		files:    map[string][]byte{},
		mkdirs:   map[string]bool{},
		errMkdir: map[string]error{},
		errWrite: map[string]error{},
		errWStrm: map[string]error{},
		errRead:  map[string]error{},
		errRStrm: map[string]error{},
		errRem:   map[string]error{},
	}
}

func (m *memDAV) MkdirAll(path string, _ os.FileMode) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if err := m.errMkdir[path]; err != nil {
		return err
	}
	path = strings.TrimLeft(path, "/")
	m.mkdirs[path] = true
	return nil
}
func (m *memDAV) Write(name string, data []byte, _ os.FileMode) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if err := m.errWrite[name]; err != nil {
		return err
	}
	cp := append([]byte(nil), data...)
	m.files[name] = cp
	return nil
}
func (m *memDAV) WriteStream(name string, src io.Reader, _ os.FileMode) error {
	m.mu.Lock()
	err := m.errWStrm[name]
	m.mu.Unlock()

	buf, _ := io.ReadAll(src)

	if err != nil {
		return err
	}

	m.mu.Lock()
	m.files[name] = append([]byte(nil), buf...)
	m.mu.Unlock()
	return nil
}
func (m *memDAV) Read(name string) ([]byte, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if err := m.errRead[name]; err != nil {
		return nil, err
	}
	b, ok := m.files[name]
	if !ok {
		return nil, errors.New("not found")
	}
	return append([]byte(nil), b...), nil
}
func (m *memDAV) ReadStream(name string) (io.ReadCloser, error) {
	m.mu.Lock()
	err := m.errRStrm[name]
	b, ok := m.files[name]
	m.mu.Unlock()
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, errors.New("not found")
	}
	return io.NopCloser(bytes.NewReader(append([]byte(nil), b...))), nil
}
func (m *memDAV) Remove(path string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if err := m.errRem[path]; err != nil {
		return err
	}
	delete(m.files, path)
	m.lastRm = path
	return nil
}

type fsMode = uint32

func TestUploadFileStream_Success_TrimsLeadingSlash(t *testing.T) {
	mem := newMemDAV()
	oc.SetClient(mem)
	t.Cleanup(func() { oc.SetClient(nil) })

	err := oc.UploadFileStream("/temp", "a.txt", bytes.NewBufferString("PAYLOAD"))
	require.NoError(t, err)

	mem.mu.Lock()
	defer mem.mu.Unlock()
	require.Equal(t, true, mem.mkdirs["temp"])
	assert.Equal(t, "PAYLOAD", string(mem.files["temp/a.txt"]))
}

func TestUploadFileStream_MkdirFail_And_WriteFail(t *testing.T) {
	mem := newMemDAV()
	oc.SetClient(mem)
	t.Cleanup(func() { oc.SetClient(nil) })

	mem.errMkdir["temp"] = errors.New("mkfail")
	err := oc.UploadFileStream("temp", "f.bin", bytes.NewBufferString("X"))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "mkdir failed")
	delete(mem.errMkdir, "temp")

	mem.errWStrm["temp/f.bin"] = errors.New("wserr")
	err = oc.UploadFileStream("temp", "f.bin", bytes.NewBufferString("X"))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "stream write failed")
}

func TestCreateFileStream_Success_WritesAndCloses(t *testing.T) {
	mem := newMemDAV()
	oc.SetClient(mem)
	t.Cleanup(func() { oc.SetClient(nil) })

	w, err := oc.CreateFileStream("/files", "doc")
	require.NoError(t, err)

	_, err = w.Write([]byte("HELLO "))
	require.NoError(t, err)
	_, err = w.Write([]byte("WORLD"))
	require.NoError(t, err)
	require.NoError(t, w.Close())

	time.Sleep(20 * time.Millisecond)

	mem.mu.Lock()
	defer mem.mu.Unlock()
	assert.Equal(t, true, mem.mkdirs["files"])
	assert.Equal(t, "HELLO WORLD", string(mem.files["files/doc"]))
}

func TestCreateFileStream_WriteStreamError_Drained_NoDeadlock(t *testing.T) {
	mem := newMemDAV()
	oc.SetClient(mem)
	t.Cleanup(func() { oc.SetClient(nil) })

	mem.errWStrm["files/bad"] = errors.New("boom")

	w, err := oc.CreateFileStream("files", "bad")
	require.NoError(t, err)

	_, err = w.Write([]byte("SOME DATA"))
	require.NoError(t, err)
	require.NoError(t, w.Close())

	time.Sleep(20 * time.Millisecond)

	mem.mu.Lock()
	defer mem.mu.Unlock()
	_, exists := mem.files["files/bad"]
	assert.False(t, exists, "file should not be stored on stream error")
}

func TestDownloadFileStream_And_Temp(t *testing.T) {
	mem := newMemDAV()
	oc.SetClient(mem)
	t.Cleanup(func() { oc.SetClient(nil) })

	mem.mu.Lock()
	mem.files["files/ID123"] = []byte("MAIN")
	mem.files["temp/chunk_0"] = []byte("C0")
	mem.mu.Unlock()

	rc, err := oc.DownloadFileStream("ID123")
	require.NoError(t, err)
	b, _ := io.ReadAll(rc)
	_ = rc.Close()
	assert.Equal(t, "MAIN", string(b))

	rc2, err := oc.DownloadFileStreamTemp("/temp/chunk_0")
	require.NoError(t, err)
	b2, _ := io.ReadAll(rc2)
	_ = rc2.Close()
	assert.Equal(t, "C0", string(b2))
}

func TestDeleteFile_Success_And_Error(t *testing.T) {
	mem := newMemDAV()
	oc.SetClient(mem)
	t.Cleanup(func() { oc.SetClient(nil) })

	mem.mu.Lock()
	mem.files["files/uX/fY"] = []byte("DATA")
	mem.mu.Unlock()

	require.NoError(t, oc.DeleteFile("fY", "uX"))

	mem.mu.Lock()
	_, ok := mem.files["files/uX/fY"]
	last := mem.lastRm
	mem.mu.Unlock()
	assert.False(t, ok)
	assert.Equal(t, "files/uX/fY", last)

	mem.errRem["files/uZ/fA"] = errors.New("remove failed")
	err := oc.DeleteFile("fA", "uZ")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to delete the file")
}

func TestDeleteFileTemp_Success_TrimsLeadingSlash(t *testing.T) {
	mem := newMemDAV()
	oc.SetClient(mem)
	t.Cleanup(func() { oc.SetClient(nil) })

	mem.mu.Lock()
	mem.files["temp/x"] = []byte("TMP")
	mem.mu.Unlock()

	require.NoError(t, oc.DeleteFileTemp("/temp/x"))

	mem.mu.Lock()
	_, ok := mem.files["temp/x"]
	last := mem.lastRm
	mem.mu.Unlock()

	assert.False(t, ok)
	assert.Equal(t, "temp/x", last)
}

func TestDownloadSentFileStream_Success_And_Error(t *testing.T) {
	mem := newMemDAV()
	oc.SetClient(mem)
	t.Cleanup(func() { oc.SetClient(nil) })

	mem.mu.Lock()
	mem.files["files/U/sent/F"] = []byte("PAY")
	mem.mu.Unlock()

	rc, err := oc.DownloadSentFileStream("files/U/sent/F")
	require.NoError(t, err)
	p, _ := io.ReadAll(rc)
	_ = rc.Close()
	assert.Equal(t, "PAY", string(p))

	mem.errRStrm["files/U/sent/bad"] = errors.New("nope")
	_, err = oc.DownloadSentFileStream("files/U/sent/bad")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to download file")
}

func TestNoHTTPDependency(t *testing.T) {
	_ = httptest.NewRecorder() 
}
