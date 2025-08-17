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
	"net/http"
	"net/http/httptest"
	//"os"
	"testing"
	//"time"

	//nat "github.com/docker/go-connections/nat"
	monkey "bou.ke/monkey"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	//"github.com/testcontainers/testcontainers-go"
	//"github.com/testcontainers/testcontainers-go/wait"

	// SUT
	fh "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"

	_ "github.com/lib/pq"
)

// func startPostgresContainer(t *testing.T) (testcontainers.Container, string) {
// 	t.Helper()
// 	ctx := context.Background()

// 	const (
// 		user   = "testuser"
// 		pass   = "testpass"
// 		dbname = "testdb"
// 	)

// 	req := testcontainers.ContainerRequest{
// 		Image:        "postgres:16-alpine",
// 		ExposedPorts: []string{"5432/tcp"},
// 		Env: map[string]string{
// 			"POSTGRES_USER":     user,
// 			"POSTGRES_PASSWORD": pass,
// 			"POSTGRES_DB":       dbname,
// 		},
// 		WaitingFor: wait.ForSQL(
// 			"5432/tcp", "postgres",
// 			func(host string, port nat.Port) string {
// 				return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
// 					user, pass, host, port.Port(), dbname)
// 			},
// 		).WithStartupTimeout(120 * time.Second),
// 	}

// 	c, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
// 		ContainerRequest: req,
// 		Started:          true,
// 	})
// 	require.NoError(t, err, "failed to start postgres container")

// 	host, err := c.Host(ctx)
// 	require.NoError(t, err)

// 	mapped, err := c.MappedPort(ctx, "5432/tcp")
// 	require.NoError(t, err)

// 	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
// 		user, pass, host, mapped.Port(), dbname)
// 	return c, dsn
// }

func mustOpenDB(t *testing.T, dsn string) *sql.DB {
	t.Helper()
	db, err := sql.Open("postgres", dsn)
	require.NoError(t, err)
	require.NoError(t, db.Ping())
	return db
}

func seedSchema(t *testing.T, db *sql.DB) {
	t.Helper()
	// Minimal schema to satisfy the handler's query.
	// Types are TEXT so we don't care what your prod schema is.
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS files (
			id TEXT PRIMARY KEY,
			owner_id TEXT NOT NULL,
			file_name TEXT NOT NULL,
			nonce TEXT NOT NULL,
			file_hash TEXT NOT NULL,
			cid TEXT
		);
	`)
	require.NoError(t, err)
}

func insertFileRow(t *testing.T, db *sql.DB, id, owner, fname, nonce, hash, cid string) {
	t.Helper()
	_, err := db.Exec(`
		INSERT INTO files (id, owner_id, file_name, nonce, file_hash, cid)
		VALUES ($1,$2,$3,$4,$5,$6)
	`, id, owner, fname, nonce, hash, cid)
	require.NoError(t, err)
}

func doJSON(t *testing.T, method, path string, body any, h http.HandlerFunc) (*httptest.ResponseRecorder, []byte) {
	t.Helper()
	var rdr io.Reader
	switch v := body.(type) {
	case string:
		rdr = bytes.NewBufferString(v)
	case []byte:
		rdr = bytes.NewBuffer(v)
	default:
		b, err := json.Marshal(v)
		require.NoError(t, err)
		rdr = bytes.NewBuffer(b)
	}
	req := httptest.NewRequest(method, path, rdr)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h(rr, req)
	return rr, rr.Body.Bytes()
}

// ————————————————————————————————
// DownloadHandler tests
// ————————————————————————————————

func TestDownloadHandler_InvalidJSON(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)
	rr, body := doJSON(t, http.MethodPost, "/download", `{"userId":"u1",`, fh.DownloadHandler)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, string(body), "Invalid JSON payload")
}

func TestDownloadHandler_MissingFields(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)
	rr, body := doJSON(t, http.MethodPost, "/download", map[string]string{
		"userId": "",
		"fileId": "f1",
	}, fh.DownloadHandler)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, string(body), "Missing userId or fileId")
}

func TestDownloadHandler_NotFound(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)

	// Start DB
	c, dsn := startPostgresContainer(t)
	t.Cleanup(func() { _ = c.Terminate(context.Background()) })
	db := mustOpenDB(t, dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedSchema(t, db)

	// Inject DB into handler
	prevDB := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prevDB })

	rr, body := doJSON(t, http.MethodPost, "/download", map[string]string{
		"userId": "u1",
		"fileId": "does-not-exist",
	}, fh.DownloadHandler)
	assert.Equal(t, http.StatusNotFound, rr.Code)
	assert.Contains(t, string(body), "File not found")
}

func TestDownloadHandler_OwncloudError(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)

	// Start DB + seed 1 row
	c, dsn := startPostgresContainer(t)
	t.Cleanup(func() { _ = c.Terminate(context.Background()) })
	db := mustOpenDB(t, dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedSchema(t, db)

	userID := "user-123"
	fileID := "file-123"
	fileName := "report.pdf"
	nonce := "test-nonce"
	content := []byte("hello world")
	hash := sha256.Sum256(content)
	fileHash := hex.EncodeToString(hash[:])
	insertFileRow(t, db, fileID, userID, fileName, nonce, fileHash, "cid-xyz")

	// Inject DB
	prevDB := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prevDB })

	// Patch OwnCloud download to return an error
	monkey.Patch(owncloud.DownloadFileStream, func(fid string) (io.ReadCloser, error) {
		return nil, fmt.Errorf("simulated owncloud failure")
	})

	rr, body := doJSON(t, http.MethodPost, "/download", map[string]string{
		"userId": userID,
		"fileId": fileID,
	}, fh.DownloadHandler)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, string(body), "Download failed")
}

func TestDownloadHandler_Success_StreamsWithHeaders_AndBody(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)

	// Start DB + seed
	c, dsn := startPostgresContainer(t)
	t.Cleanup(func() { _ = c.Terminate(context.Background()) })
	db := mustOpenDB(t, dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedSchema(t, db)

	userID := "user-abc"
	fileID := "f-42"
	fileName := "evidence.bin"
	nonce := "nonce-999"
	content := []byte("squeaky clean bytes")
	sum := sha256.Sum256(content)
	fileHash := hex.EncodeToString(sum[:])

	insertFileRow(t, db, fileID, userID, fileName, nonce, fileHash, "cid-any")

	// Inject DB
	prevDB := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prevDB })

	// Patch OwnCloud stream to return our content
	monkey.Patch(owncloud.DownloadFileStream, func(fid string) (io.ReadCloser, error) {
		require.Equal(t, fileID, fid)
		return io.NopCloser(bytes.NewReader(content)), nil
	})

	rr, body := doJSON(t, http.MethodPost, "/download", map[string]string{
		"userId": userID,
		"fileId": fileID,
	}, fh.DownloadHandler)

	assert.Equal(t, http.StatusOK, rr.Code)

	// Headers
	assert.Equal(t, "application/octet-stream", rr.Header().Get("Content-Type"))
	assert.Equal(t, fileName, rr.Header().Get("X-File-Name"))
	assert.Equal(t, nonce, rr.Header().Get("X-Nonce"))
	disp := rr.Header().Get("Content-Disposition")
	assert.Contains(t, disp, "attachment;")
	assert.Contains(t, disp, fileName)

	// Body (streamed content)
	assert.Equal(t, content, body)
}

// ————————————————————————————————
// DownloadSentFile tests
// ————————————————————————————————

func TestDownloadSentFile_InvalidJSON(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)
	rr, body := doJSON(t, http.MethodPost, "/download-sent", `{"filePath":`, fh.DownloadSentFile)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, string(body), "Invalid JSON payload")
}

func TestDownloadSentFile_MissingPath(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)
	rr, body := doJSON(t, http.MethodPost, "/download-sent", map[string]string{"filePath": ""}, fh.DownloadSentFile)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, string(body), "Missing FilePath")
}

func TestDownloadSentFile_OwncloudError(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)

	monkey.Patch(owncloud.DownloadSentFileStream, func(path string) (io.ReadCloser, error) {
		return nil, fmt.Errorf("simulated owncloud error")
	})

	rr, body := doJSON(t, http.MethodPost, "/download-sent", map[string]string{"filePath": "/sent/u1/f1"}, fh.DownloadSentFile)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, string(body), "Download failed")
}

func TestDownloadSentFile_Success_StreamsBody(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)

	content := []byte("sent-file-bytes")
	monkey.Patch(owncloud.DownloadSentFileStream, func(path string) (io.ReadCloser, error) {
		require.Equal(t, "/sent/u1/f1", path)
		return io.NopCloser(bytes.NewReader(content)), nil
	})

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/download-sent",
		bytes.NewBufferString(`{"filePath":"/sent/u1/f1"}`))
	req.Header.Set("Content-Type", "application/json")

	fh.DownloadSentFile(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "application/octet-stream", rr.Header().Get("Content-Type"))
	assert.Equal(t, content, rr.Body.Bytes())
}
