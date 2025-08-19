//go:build integration
// +build integration

package integration_test

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	nat "github.com/docker/go-connections/nat"
	monkey "bou.ke/monkey"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"

	fh "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"

	_ "github.com/lib/pq"
)

type startedDBUp struct {
	container testcontainers.Container
	dsn       string
}

func startPostgresUp(t *testing.T) startedDBUp {
	t.Helper()

	if dsn := os.Getenv("POSTGRES_TEST_DSN"); dsn != "" {
		return startedDBUp{dsn: dsn}
	}

	ctx := context.Background()
	const (
		user = "testuser"
		pass = "testpass"
		db   = "testdb"
	)
	req := testcontainers.ContainerRequest{
		Image:        "postgres:16-alpine",
		ExposedPorts: []string{"5432/tcp"},
		Env: map[string]string{
			"POSTGRES_USER":     user,
			"POSTGRES_PASSWORD": pass,
			"POSTGRES_DB":       db,
		},
		WaitingFor: wait.ForSQL("5432/tcp", "postgres",
			func(host string, port nat.Port) string {
				return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
					user, pass, host, port.Port(), db)
			}).WithStartupTimeout(120 * time.Second),
	}

	c, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil && strings.Contains(err.Error(), "permission denied while trying to connect to the Docker daemon socket") {
		t.Skipf("Skipping DB-backed tests: Docker not accessible (%v). Set POSTGRES_TEST_DSN to reuse an existing DB.", err)
	}
	require.NoError(t, err, "failed to start postgres container")

	host, err := c.Host(ctx)
	require.NoError(t, err)
	mp, err := c.MappedPort(ctx, "5432/tcp")
	require.NoError(t, err)

	return startedDBUp{
		container: c,
		dsn:       fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, pass, host, mp.Port(), db),
	}
}

func openDBUp(t *testing.T, dsn string) *sql.DB {
	t.Helper()
	db, err := sql.Open("postgres", dsn)
	require.NoError(t, err)
	require.NoError(t, db.Ping())
	return db
}

func seedFilesSchemaUp(t *testing.T, db *sql.DB) {
	t.Helper()
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS files (
			id TEXT PRIMARY KEY DEFAULT md5(random()::text),
			owner_id TEXT NOT NULL,
			file_name TEXT NOT NULL,
			file_type TEXT DEFAULT 'file',
			file_hash TEXT DEFAULT '',
			nonce TEXT DEFAULT '',
			description TEXT DEFAULT '',
			tags TEXT[] DEFAULT '{}',
			cid TEXT DEFAULT '',
			file_size BIGINT DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`)
	require.NoError(t, err)
}

type memStoreUp struct{ m map[string][]byte }

func (s *memStoreUp) put(key string, data []byte) { s.m[key] = append([]byte(nil), data...) }
func (s *memStoreUp) get(key string) ([]byte, bool) {
	b, ok := s.m[key]
	if !ok {
		return nil, false
	}
	return append([]byte(nil), b...), true
}
func (s *memStoreUp) del(key string) { delete(s.m, key) }

type memWCUp struct {
	key   string
	store *memStoreUp
	buf   bytes.Buffer
}
func (w *memWCUp) Write(p []byte) (int, error) { return w.buf.Write(p) }
func (w *memWCUp) Close() error {
	w.store.put(w.key, w.buf.Bytes())
	return nil
}

type ocHooksUp struct {
	uploadHook func(path, name string, r io.Reader) error
	createHook func(path, name string) (io.WriteCloser, error)
	downloadHook func(path string) (io.ReadCloser, error)
}

func patchOwncloudUp(t *testing.T, s *memStoreUp, hooks *ocHooksUp) {
	t.Helper()

	monkey.Patch(owncloud.UploadFileStream, func(path, name string, r io.Reader) error {
		if hooks != nil && hooks.uploadHook != nil {
			if err := hooks.uploadHook(path, name, r); err != nil {
				return err
			}
		}
		data, _ := io.ReadAll(r)
		key := strings.TrimSuffix(path, "/") + "/" + name
		s.put(key, data)
		return nil
	})

	monkey.Patch(owncloud.DownloadFileStreamTemp, func(chunkPath string) (io.ReadCloser, error) {
		if hooks != nil && hooks.downloadHook != nil {
			if rc, err := hooks.downloadHook(chunkPath); err != nil || rc != nil {
				return rc, err
			}
		}
		if b, ok := s.get(chunkPath); ok {
			return io.NopCloser(bytes.NewReader(b)), nil
		}
		return nil, fmt.Errorf("temp chunk not found: %s", chunkPath)
	})

	monkey.Patch(owncloud.DeleteFileTemp, func(chunkPath string) error {
		s.del(chunkPath)
		return nil
	})

	monkey.Patch(owncloud.CreateFileStream, func(path, name string) (io.WriteCloser, error) {
		if hooks != nil && hooks.createHook != nil {
			return hooks.createHook(path, name)
		}
		key := strings.TrimSuffix(path, "/") + "/" + name
		return &memWCUp{key: key, store: s}, nil
	})
}

func makeMultipartUp(t *testing.T, fields map[string]string, fileField, fileName string, fileBytes []byte) (*bytes.Buffer, string) {
	t.Helper()
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	for k, v := range fields {
		require.NoError(t, w.WriteField(k, v))
	}
	if fileField != "" {
		fw, err := w.CreateFormFile(fileField, fileName)
		require.NoError(t, err)
		_, _ = fw.Write(fileBytes)
	}
	require.NoError(t, w.Close())
	return &buf, w.FormDataContentType()
}

func TestUpload_InvalidContentType(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)
	req := httptest.NewRequest(http.MethodPost, "/upload", bytes.NewBufferString(`{}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	fh.UploadHandler(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestUpload_MissingRequiredFields(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)
	s := &memStoreUp{m: map[string][]byte{}}
	patchOwncloudUp(t, s, nil)

	body, ctype := makeMultipartUp(t, map[string]string{
		"userId": "u1",
		"chunkIndex":  "0",
		"totalChunks": "1",
	}, "encryptedFile", "c0.bin", []byte("x"))
	req := httptest.NewRequest(http.MethodPost, "/upload", body)
	req.Header.Set("Content-Type", ctype)
	rr := httptest.NewRecorder()

	fh.UploadHandler(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestUpload_InvalidIndices_AndMissingFile(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)
	s := &memStoreUp{m: map[string][]byte{}}
	patchOwncloudUp(t, s, nil)

	body1, ctype1 := makeMultipartUp(t, map[string]string{
		"userId":      "u1",
		"fileName":    "doc",
		"fileType":    "application/octet-stream",
		"fileHash":    "deadbeef",
		"nonce":       "n1",
		"chunkIndex":  "bad",
		"totalChunks": "1",
	}, "encryptedFile", "c0.bin", []byte("x"))
	req1 := httptest.NewRequest(http.MethodPost, "/upload", body1)
	req1.Header.Set("Content-Type", ctype1)
	rr1 := httptest.NewRecorder()
	fh.UploadHandler(rr1, req1)
	assert.Equal(t, http.StatusBadRequest, rr1.Code)

	body2, ctype2 := makeMultipartUp(t, map[string]string{
		"userId":      "u1",
		"fileName":    "doc",
		"fileType":    "application/octet-stream",
		"fileHash":    "deadbeef",
		"nonce":       "n1",
		"chunkIndex":  "0",
		"totalChunks": "1",
	}, "", "", nil)
	req2 := httptest.NewRequest(http.MethodPost, "/upload", body2)
	req2.Header.Set("Content-Type", ctype2)
	rr2 := httptest.NewRecorder()
	fh.UploadHandler(rr2, req2)
	assert.Equal(t, http.StatusBadRequest, rr2.Code)
}

func TestUpload_FirstChunk_InsertsMetadata_AndACK(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)
	s := &memStoreUp{m: map[string][]byte{}}
	patchOwncloudUp(t, s, nil)

	sd := startPostgresUp(t)
	if sd.container != nil {
		t.Cleanup(func() { _ = sd.container.Terminate(context.Background()) })
	}
	db := openDBUp(t, sd.dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedFilesSchemaUp(t, db)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	body, ctype := makeMultipartUp(t, map[string]string{
		"userId":      "uX",
		"fileName":    "big.bin",
		"fileType":    "application/octet-stream",
		"fileHash":    "abc123",
		"nonce":       "nX",
		"chunkIndex":  "0",
		"totalChunks": "3",
	}, "encryptedFile", "c0.bin", []byte("AAA"))
	req := httptest.NewRequest(http.MethodPost, "/upload", body)
	req.Header.Set("Content-Type", ctype)
	rr := httptest.NewRecorder()

	fh.UploadHandler(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)

	var resp map[string]string
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	require.NotEmpty(t, resp["fileId"])
	assert.Contains(t, resp["message"], "Chunk 0 uploaded")

	var count int
	require.NoError(t, db.QueryRow(`SELECT COUNT(*) FROM files WHERE id=$1 AND owner_id='uX'`, resp["fileId"]).Scan(&count))
	assert.Equal(t, 1, count)

	b, ok := s.get("temp/" + resp["fileId"] + "_chunk_0")
	require.True(t, ok)
	assert.Equal(t, []byte("AAA"), b)
}

func TestUpload_SingleChunk_FullMerge_UpdatesDB_AndStoresFinal(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)

	s := &memStoreUp{m: map[string][]byte{}}
	patchOwncloudUp(t, s, nil)

	sd := startPostgresUp(t)
	if sd.container != nil {
		t.Cleanup(func() { _ = sd.container.Terminate(context.Background()) })
	}
	db := openDBUp(t, sd.dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedFilesSchemaUp(t, db)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	content := []byte("HELLO WORLD")
	body, ctype := makeMultipartUp(t, map[string]string{
		"userId":       "uZ",
		"fileName":     "one.bin",
		"fileType":     "application/octet-stream",
		"fileHash":     "ignored-by-handler",
		"nonce":        "nZ",
		"chunkIndex":   "0",
		"totalChunks":  "1",
		"path":         "customdir",
	}, "encryptedFile", "all.bin", content)

	req := httptest.NewRequest(http.MethodPost, "/upload", body)
	req.Header.Set("Content-Type", ctype)
	rr := httptest.NewRecorder()

	fh.UploadHandler(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)

	var resp map[string]string
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	fileID := resp["fileId"]
	require.NotEmpty(t, fileID)

	finalKey := "files/" + fileID
	b, ok := s.get(finalKey)
	require.True(t, ok)
	assert.Equal(t, content, b)

	var hash, cid string
	var size int64
	require.NoError(t, db.QueryRow(`SELECT file_hash,file_size,cid FROM files WHERE id=$1`, fileID).Scan(&hash, &size, &cid))
	expHash := sha256.Sum256(content)
	assert.Equal(t, hex.EncodeToString(expHash[:]), hash)
	assert.Equal(t, int64(len(content)), size)
	assert.Equal(t, "customdir/"+fileID, cid)
}

func TestUpload_CreateFileStreamFail(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)

	s := &memStoreUp{m: map[string][]byte{}}
	patchOwncloudUp(t, s, &ocHooksUp{
		createHook: func(path, name string) (io.WriteCloser, error) {
			return nil, fmt.Errorf("create stream failed")
		},
	})

	sd := startPostgresUp(t)
	if sd.container != nil {
		t.Cleanup(func() { _ = sd.container.Terminate(context.Background()) })
	}
	db := openDBUp(t, sd.dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedFilesSchemaUp(t, db)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	body, ctype := makeMultipartUp(t, map[string]string{
		"userId":      "u1",
		"fileName":    "f.bin",
		"fileType":    "application/octet-stream",
		"fileHash":    "x",
		"nonce":       "n1",
		"chunkIndex":  "0",
		"totalChunks": "1",
	}, "encryptedFile", "c0.bin", []byte("BYTES"))
	req := httptest.NewRequest(http.MethodPost, "/upload", body)
	req.Header.Set("Content-Type", ctype)
	rr := httptest.NewRecorder()

	fh.UploadHandler(rr, req)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "File assembly failed")
}

func TestUpload_MergeFailsOnMissingChunk(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)

	s := &memStoreUp{m: map[string][]byte{}}
	patchOwncloudUp(t, s, &ocHooksUp{
		downloadHook: func(path string) (io.ReadCloser, error) {
			return nil, fmt.Errorf("cannot open chunk")
		},
	})

	sd := startPostgresUp(t)
	if sd.container != nil {
		t.Cleanup(func() { _ = sd.container.Terminate(context.Background()) })
	}
	db := openDBUp(t, sd.dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedFilesSchemaUp(t, db)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	body, ctype := makeMultipartUp(t, map[string]string{
		"userId":      "u1",
		"fileName":    "f.bin",
		"fileType":    "application/octet-stream",
		"fileHash":    "x",
		"nonce":       "n1",
		"chunkIndex":  "0",
		"totalChunks": "1",
	}, "encryptedFile", "c0.bin", []byte("BYTES"))
	req := httptest.NewRequest(http.MethodPost, "/upload", body)
	req.Header.Set("Content-Type", ctype)
	rr := httptest.NewRecorder()

	fh.UploadHandler(rr, req)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Chunk merge failed")
}

func TestUpload_DBInsertError_NoSchema(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)

	s := &memStoreUp{m: map[string][]byte{}}
	patchOwncloudUp(t, s, nil)

	sd := startPostgresUp(t)
	if sd.container != nil {
		t.Cleanup(func() { _ = sd.container.Terminate(context.Background()) })
	}
	db := openDBUp(t, sd.dsn)
	t.Cleanup(func() { _ = db.Close() })

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	body, ctype := makeMultipartUp(t, map[string]string{
		"userId":      "u1",
		"fileName":    "doc",
		"fileType":    "application/octet-stream",
		"fileHash":    "x",
		"nonce":       "n1",
		"chunkIndex":  "0",
		"totalChunks": "3",
	}, "encryptedFile", "c0.bin", []byte("AAA"))
	req := httptest.NewRequest(http.MethodPost, "/upload", body)
	req.Header.Set("Content-Type", ctype)
	rr := httptest.NewRecorder()

	fh.UploadHandler(rr, req)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to create file metadata")
}

func TestStartUpload_InvalidJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/start", bytes.NewBufferString(`{"x":`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	fh.StartUploadHandler(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestStartUpload_MissingRequired(t *testing.T) {
	body := map[string]any{
		"userId":   "",
		"fileName": "",
	}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/start", bytes.NewBuffer(b))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	fh.StartUploadHandler(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestStartUpload_Success_InsertsRow_ReturnsID(t *testing.T) {
	sd := startPostgresUp(t)
	if sd.container != nil {
		t.Cleanup(func() { _ = sd.container.Terminate(context.Background()) })
	}
	db := openDBUp(t, sd.dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedFilesSchemaUp(t, db)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	reqBody := map[string]any{
		"userId":          "U10",
		"fileName":        "photo.jpg",
		"fileType":        "image/jpeg",
		"fileDescription": "desc",
		"fileTags":        []string{"a", "b"},
		"path":            "uploads",
		"nonce":           "N-10",
	}
	b, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/start", bytes.NewBuffer(b))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	fh.StartUploadHandler(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)

	var resp map[string]string
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	fileID := resp["fileId"]
	require.NotEmpty(t, fileID)

	var owner, name, ftype, nonce, cid string
	var size int64
	require.NoError(t, db.QueryRow(`SELECT owner_id,file_name,file_type,nonce,cid,file_size FROM files WHERE id=$1`, fileID).
		Scan(&owner, &name, &ftype, &nonce, &cid, &size))
	assert.Equal(t, "U10", owner)
	assert.Equal(t, "photo.jpg", name)
	assert.Equal(t, "image/jpeg", ftype)
	assert.Equal(t, "N-10", nonce)
	assert.Equal(t, "uploads", cid)
	assert.Equal(t, int64(0), size)
}

func TestStartUpload_DBError_NoSchema(t *testing.T) {
	sd := startPostgresUp(t)
	if sd.container != nil {
		t.Cleanup(func() { _ = sd.container.Terminate(context.Background()) })
	}
	db := openDBUp(t, sd.dsn)
	t.Cleanup(func() { _ = db.Close() })

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	reqBody := map[string]any{
		"userId":   "U",
		"fileName": "f",
	}
	b, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/start", bytes.NewBuffer(b))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	fh.StartUploadHandler(rr, req)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to start upload")
}
