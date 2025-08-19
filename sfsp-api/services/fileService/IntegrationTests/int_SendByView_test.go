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

/* ------------------------- Postgres helpers (unique) ------------------------ */

type startedDBView struct {
	container testcontainers.Container // nil if using external DSN
	dsn       string
}

func startPostgresView(t *testing.T) startedDBView {
	t.Helper()

	if dsn := os.Getenv("POSTGRES_TEST_DSN"); dsn != "" {
		return startedDBView{dsn: dsn}
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
			},
		).WithStartupTimeout(120 * time.Second),
	}

	c, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil && strings.Contains(err.Error(), "permission denied while trying to connect to the Docker daemon socket") {
		t.Skipf("Skipping DB-backed tests: Docker not accessible (%v). Fix Docker perms or set POSTGRES_TEST_DSN.", err)
	}
	require.NoError(t, err, "failed to start postgres container")

	host, err := c.Host(ctx)
	require.NoError(t, err)
	mp, err := c.MappedPort(ctx, "5432/tcp")
	require.NoError(t, err)

	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, pass, host, mp.Port(), db)
	return startedDBView{container: c, dsn: dsn}
}

func openDBView(t *testing.T, dsn string) *sql.DB {
	t.Helper()
	db, err := sql.Open("postgres", dsn)
	require.NoError(t, err)
	require.NoError(t, db.Ping())
	return db
}

func seedViewSchema(t *testing.T, db *sql.DB) {
	t.Helper()
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS files (
			id TEXT PRIMARY KEY,
			owner_id TEXT NOT NULL,
			file_name TEXT DEFAULT '',
			file_type TEXT DEFAULT 'file',
			file_size BIGINT DEFAULT 0,
			description TEXT DEFAULT '',
			allow_view_sharing BOOLEAN NOT NULL DEFAULT FALSE
		);

		CREATE TABLE IF NOT EXISTS shared_files_view (
			id TEXT PRIMARY KEY DEFAULT md5(random()::text),
			sender_id TEXT NOT NULL,
			recipient_id TEXT NOT NULL,
			file_id TEXT NOT NULL,
			metadata TEXT NOT NULL,
			shared_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
			expires_at TIMESTAMPTZ NULL,
			revoked BOOLEAN NOT NULL DEFAULT FALSE,
			revoked_at TIMESTAMPTZ NULL,
			access_granted BOOLEAN NOT NULL DEFAULT TRUE
		);

		CREATE TABLE IF NOT EXISTS access_logs (
			id TEXT PRIMARY KEY DEFAULT md5(random()::text),
			file_id TEXT NOT NULL,
			user_id TEXT NOT NULL,
			action TEXT NOT NULL,
			message TEXT NOT NULL,
			view_only BOOLEAN NOT NULL DEFAULT FALSE,
			timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`)
	require.NoError(t, err)
}

/* ----------------------- OwnCloud patches + storage ------------------------ */

type memStore struct {
	m map[string][]byte
}

func (s *memStore) put(key string, data []byte) { s.m[key] = append([]byte(nil), data...) }
func (s *memStore) get(key string) ([]byte, bool) {
	b, ok := s.m[key]
	if !ok {
		return nil, false
	}
	return append([]byte(nil), b...), true
}
func (s *memStore) del(key string) { delete(s.m, key) }

func patchOwncloudForView(t *testing.T, s *memStore) {
	t.Helper()
	monkey.Patch(owncloud.UploadFileStream, func(path, name string, r io.Reader) error {
		// store bytes under "path/name"
		data, _ := io.ReadAll(r)
		s.put(fmt.Sprintf("%s/%s", strings.TrimSuffix(path, "/"), name), data)
		return nil
	})
	monkey.Patch(owncloud.DownloadFileStreamTemp, func(chunkPath string) (io.ReadCloser, error) {
		data, ok := s.get(chunkPath)
		if !ok {
			return nil, fmt.Errorf("temp chunk not found: %s", chunkPath)
		}
		return io.NopCloser(bytes.NewReader(data)), nil
	})
	monkey.Patch(owncloud.DeleteFileTemp, func(chunkPath string) error {
		s.del(chunkPath)
		return nil
	})
	monkey.Patch(owncloud.DownloadSentFileStream, func(path string) (io.ReadCloser, error) {
		data, ok := s.get(path)
		if !ok {
			// Return something so handler streams, but mark it's missing
			return io.NopCloser(bytes.NewReader([]byte("missing"))), nil
		}
		return io.NopCloser(bytes.NewReader(data)), nil
	})
}

/* ---------------------------- helpers (HTTP) ------------------------------- */

func multipartBody(t *testing.T, fields map[string]string, fileField, fileName string, fileBytes []byte) (*bytes.Buffer, string) {
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

func postJSON(t *testing.T, path string, body any, h http.HandlerFunc) (*httptest.ResponseRecorder, []byte) {
	t.Helper()
	var r io.Reader
	switch v := body.(type) {
	case string:
		r = bytes.NewBufferString(v)
	case []byte:
		r = bytes.NewBuffer(v)
	default:
		b, err := json.Marshal(v)
		require.NoError(t, err)
		r = bytes.NewBuffer(b)
	}
	req := httptest.NewRequest(http.MethodPost, path, r)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h(rr, req)
	return rr, rr.Body.Bytes()
}

/* --------------------------- SendByViewHandler ----------------------------- */

func TestSendByView_MissingFields(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)
	body, ctype := multipartBody(t, map[string]string{
		"userId": "u1",
		// missing requireds
	}, "encryptedFile", "x.bin", []byte("abc"))
	req := httptest.NewRequest(http.MethodPost, "/send/view", body)
	req.Header.Set("Content-Type", ctype)
	rr := httptest.NewRecorder()
	fh.SendByViewHandler(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestSendByView_ChunkAck_NoMerge(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)
	s := &memStore{m: map[string][]byte{}}
	patchOwncloudForView(t, s)

	// DB
	sd := startPostgresView(t)
	if sd.container != nil {
		t.Cleanup(func() { _ = sd.container.Terminate(context.Background()) })
	}
	db := openDBView(t, sd.dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedViewSchema(t, db)

	// seed file owned by uploader
	_, err := db.Exec(`INSERT INTO files (id, owner_id, file_name) VALUES ('f1','u1','doc')`)
	require.NoError(t, err)
	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	// chunk 0 of 2 => should just ack
	fields := map[string]string{
		"fileid":         "f1",
		"userId":         "u1",
		"recipientUserId":"u2",
		"metadata":       `{"note":"hello"}`,
		"chunkIndex":     "0",
		"totalChunks":    "2",
	}
	body, ctype := multipartBody(t, fields, "encryptedFile", "c0.bin", []byte("AAA"))
	req := httptest.NewRequest(http.MethodPost, "/send/view", body)
	req.Header.Set("Content-Type", ctype)
	rr := httptest.NewRecorder()

	fh.SendByViewHandler(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "Chunk 0 uploaded")

	// temp storage should contain the chunk
	got, ok := s.get("temp/f1_chunk_0")
	require.True(t, ok)
	assert.Equal(t, []byte("AAA"), got)
}

func TestSendByView_SingleChunk_Success_Merges_Tracks(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)
	s := &memStore{m: map[string][]byte{}}
	patchOwncloudForView(t, s)

	// DB
	sd := startPostgresView(t)
	if sd.container != nil {
		t.Cleanup(func() { _ = sd.container.Terminate(context.Background()) })
	}
	db := openDBView(t, sd.dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedViewSchema(t, db)
	_, err := db.Exec(`INSERT INTO files (id, owner_id, file_name) VALUES ('F2','SENDER','thing')`)
	require.NoError(t, err)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	// single chunk (index 0, total 1)
	fields := map[string]string{
		"fileid":         "F2",
		"userId":         "SENDER",
		"recipientUserId":"RECIP",
		"metadata":       `{"x":1}`,
		"chunkIndex":     "0",
		"totalChunks":    "1",
	}
	content := []byte("HELLO-VIEW")
	body, ctype := multipartBody(t, fields, "encryptedFile", "all.bin", content)
	req := httptest.NewRequest(http.MethodPost, "/send/view", body)
	req.Header.Set("Content-Type", ctype)
	rr := httptest.NewRecorder()

	fh.SendByViewHandler(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), `"message":"File shared for view-only access successfully"`)

	// Verify file stored at final path: files/SENDER/shared_view/F2_RECIP
	finalKey := "files/SENDER/shared_view/F2_RECIP"
	got, ok := s.get(finalKey)
	require.True(t, ok)
	assert.Equal(t, content, got)

	// shared_files_view row exists
	var count int
	require.NoError(t, db.QueryRow(`SELECT COUNT(*) FROM shared_files_view WHERE sender_id='SENDER' AND recipient_id='RECIP' AND file_id='F2' AND revoked=FALSE`).Scan(&count))
	assert.Equal(t, 1, count)

	// files.allow_view_sharing set
	var flag bool
	require.NoError(t, db.QueryRow(`SELECT allow_view_sharing FROM files WHERE id='F2'`).Scan(&flag))
	assert.True(t, flag)

	// access_logs written
	require.NoError(t, db.QueryRow(`SELECT COUNT(*) FROM access_logs WHERE file_id='F2' AND user_id='SENDER' AND action='shared_view' AND view_only=TRUE`).Scan(&count))
	assert.Equal(t, 1, count)
}

func TestSendByView_UnauthorizedOwner(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)
	s := &memStore{m: map[string][]byte{}}
	patchOwncloudForView(t, s)

	sd := startPostgresView(t)
	if sd.container != nil {
		t.Cleanup(func() { _ = sd.container.Terminate(context.Background()) })
	}
	db := openDBView(t, sd.dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedViewSchema(t, db)
	_, err := db.Exec(`INSERT INTO files (id, owner_id) VALUES ('F3','OWNER')`)
	require.NoError(t, err)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	fields := map[string]string{
		"fileid":         "F3",
		"userId":         "NOT_OWNER",
		"recipientUserId":"R",
		"metadata":       `{}`,
		"chunkIndex":     "0",
		"totalChunks":    "1",
	}
	body, ctype := multipartBody(t, fields, "encryptedFile", "x.bin", []byte("x"))
	req := httptest.NewRequest(http.MethodPost, "/send/view", body)
	req.Header.Set("Content-Type", ctype)
	rr := httptest.NewRecorder()

	fh.SendByViewHandler(rr, req)
	assert.Equal(t, http.StatusForbidden, rr.Code)
}

/* ------------------------- RevokeViewAccessHandler ------------------------- */

func TestRevokeViewAccess_Success(t *testing.T) {
	sd := startPostgresView(t)
	if sd.container != nil {
		t.Cleanup(func() { _ = sd.container.Terminate(context.Background()) })
	}
	db := openDBView(t, sd.dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedViewSchema(t, db)

	// seed file + share
	_, _ = db.Exec(`INSERT INTO files (id, owner_id) VALUES ('F4','S')`)
	_, _ = db.Exec(`INSERT INTO shared_files_view (sender_id,recipient_id,file_id,metadata,access_granted,revoked) VALUES ('S','R','F4','{}',TRUE,FALSE)`)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr, _ := postJSON(t, "/revoke", map[string]string{
		"fileId": "F4", "userId": "S", "recipientId": "R",
	}, fh.RevokeViewAccessHandler)

	assert.Equal(t, http.StatusOK, rr.Code)

	// verify revoked
	var revoked, granted bool
	require.NoError(t, db.QueryRow(`SELECT revoked, access_granted FROM shared_files_view WHERE sender_id='S' AND recipient_id='R' AND file_id='F4'`).Scan(&revoked, &granted))
	assert.True(t, revoked)
	assert.False(t, granted)
}

/* ----------------------- GetSharedViewFilesHandler ------------------------- */

func TestGetSharedViewFiles_ReturnsList(t *testing.T) {
	sd := startPostgresView(t)
	if sd.container != nil {
		t.Cleanup(func() { _ = sd.container.Terminate(context.Background()) })
	}
	db := openDBView(t, sd.dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedViewSchema(t, db)

	_, _ = db.Exec(`INSERT INTO files (id,owner_id,file_name,file_type,file_size,description) VALUES ('F5','S','img','file',10,'desc')`)
	// 2 shares (one as recipient, one as sender), both active and unexpired
	_, _ = db.Exec(`INSERT INTO shared_files_view (sender_id,recipient_id,file_id,metadata,expires_at,access_granted,revoked) VALUES ('S','U','F5','{"a":1}', NOW() + interval '1 hour', TRUE, FALSE)`)
	_, _ = db.Exec(`INSERT INTO shared_files_view (sender_id,recipient_id,file_id,metadata,expires_at,access_granted,revoked) VALUES ('U','S','F5','{"b":2}', NOW() + interval '1 hour', TRUE, FALSE)`)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr, body := postJSON(t, "/shared/list", map[string]string{"userId": "S"}, fh.GetSharedViewFilesHandler)
	assert.Equal(t, http.StatusOK, rr.Code)

	var arr []map[string]any
	require.NoError(t, json.Unmarshal(body, &arr))
	require.NotEmpty(t, arr)
	// each item should contain view_only true, and include file metadata
	assert.Equal(t, true, arr[0]["view_only"])
	assert.NotEmpty(t, arr[0]["file_name"])
}

/* ----------------------- GetViewFileAccessLogs ----------------------------- */

func TestGetViewFileAccessLogs_OrderedDesc(t *testing.T) {
	sd := startPostgresView(t)
	if sd.container != nil {
		t.Cleanup(func() { _ = sd.container.Terminate(context.Background()) })
	}
	db := openDBView(t, sd.dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedViewSchema(t, db)

	// seed logs for F6/U
	_, _ = db.Exec(`INSERT INTO access_logs (file_id,user_id,action,message,view_only,timestamp) VALUES ('F6','U','viewed','m1',TRUE, TIMESTAMP '2025-01-01T00:00:00Z')`)
	_, _ = db.Exec(`INSERT INTO access_logs (file_id,user_id,action,message,view_only,timestamp) VALUES ('F6','U','viewed','m2',TRUE, TIMESTAMP '2025-06-01T00:00:00Z')`)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr, body := postJSON(t, "/logs/view", map[string]string{"fileId": "F6", "userId": "U"}, fh.GetViewFileAccessLogs)
	assert.Equal(t, http.StatusOK, rr.Code)

	var logs []map[string]any
	require.NoError(t, json.Unmarshal(body, &logs))
	require.Len(t, logs, 2)
	// newest first
	assert.Equal(t, "m2", logs[0]["message"])
	assert.Equal(t, "m1", logs[1]["message"])
}

/* ----------------------- DownloadViewFileHandler --------------------------- */

func TestDownloadViewFile_Success_Streams_AndLogs(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)
	s := &memStore{m: map[string][]byte{}}
	patchOwncloudForView(t, s)

	sd := startPostgresView(t)
	if sd.container != nil {
		t.Cleanup(func() { _ = sd.container.Terminate(context.Background()) })
	}
	db := openDBView(t, sd.dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedViewSchema(t, db)

	// sender S, recipient U, file F7; active and not expired
	content := []byte("VIEWBYTES")
	finalPath := "files/S/shared_view/F7_U"
	s.put(finalPath, content)

	_, _ = db.Exec(`INSERT INTO shared_files_view (id,sender_id,recipient_id,file_id,metadata,expires_at,revoked,access_granted) VALUES ('SHX','S','U','F7','{"ok":true}', NOW() + interval '1 hour', FALSE, TRUE)`)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr, body := postJSON(t, "/download/view", map[string]string{"userId": "U", "fileId": "F7"}, fh.DownloadViewFileHandler)
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "application/octet-stream", rr.Header().Get("Content-Type"))
	assert.Equal(t, "true", rr.Header().Get("X-View-Only"))
	assert.Equal(t, "F7", rr.Header().Get("X-File-Id"))
	assert.Equal(t, "SHX", rr.Header().Get("X-Share-Id"))
	assert.Equal(t, content, body)

	// an access log should be created
	var count int
	require.NoError(t, db.QueryRow(`SELECT COUNT(*) FROM access_logs WHERE file_id='F7' AND user_id='U' AND action='viewed' AND view_only=TRUE`).Scan(&count))
	assert.Equal(t, 1, count)

	// sanity hash check to match handler logic
	h := sha256.Sum256(content)
	_ = hex.EncodeToString(h[:]) // (not used, but demonstrates parity)
}

func TestDownloadViewFile_RevokedOrExpired(t *testing.T) {
	sd := startPostgresView(t)
	if sd.container != nil {
		t.Cleanup(func() { _ = sd.container.Terminate(context.Background()) })
	}
	db := openDBView(t, sd.dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedViewSchema(t, db)

	// revoked
	_, _ = db.Exec(`INSERT INTO shared_files_view (sender_id,recipient_id,file_id,metadata,expires_at,revoked,access_granted) VALUES ('S','U','FR','{}', NOW() + interval '1 hour', TRUE, TRUE)`)
	// expired
	_, _ = db.Exec(`INSERT INTO shared_files_view (sender_id,recipient_id,file_id,metadata,expires_at,revoked,access_granted) VALUES ('S','U','FE','{}', NOW() - interval '1 hour', FALSE, TRUE)`)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr, _ := postJSON(t, "/download/view", map[string]string{"userId": "U", "fileId": "FR"}, fh.DownloadViewFileHandler)
	assert.Equal(t, http.StatusForbidden, rr.Code)

	rr, _ = postJSON(t, "/download/view", map[string]string{"userId": "U", "fileId": "FE"}, fh.DownloadViewFileHandler)
	assert.Equal(t, http.StatusForbidden, rr.Code)
}
