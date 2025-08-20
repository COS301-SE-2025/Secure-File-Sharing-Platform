//go:build integration
// +build integration

package integration_test

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"
	"encoding/json"

	nat "github.com/docker/go-connections/nat"
	monkey "bou.ke/monkey"
	"github.com/stretchr/testify/require"
	tc "github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"

	oc "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"

	_ "github.com/lib/pq"
)

/* ------------------------------ Postgres ------------------------------ */

type startedDB struct {
	Container tc.Container // nil if using external DSN
	DSN       string
}

func startPostgres(t *testing.T) *startedDB {
	t.Helper()

	// Allow using a developer-provided DSN to avoid Docker on CI or local
	if dsn := os.Getenv("POSTGRES_TEST_DSN"); dsn != "" {
		return &startedDB{DSN: dsn}
	}

	ctx := context.Background()
	const (
		user = "testuser"
		pass = "testpass"
		db   = "testdb"
	)
	req := tc.ContainerRequest{
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
		).WithStartupTimeout(2 * time.Minute),
	}

	c, err := tc.GenericContainer(ctx, tc.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	// If Docker perms are an issue, skip DB-backed tests gracefully.
	if err != nil && strings.Contains(err.Error(), "permission denied while trying to connect to the Docker daemon socket") {
		t.Skipf("Skipping DB-backed tests: Docker not accessible (%v). Fix Docker perms or set POSTGRES_TEST_DSN.", err)
	}
	require.NoError(t, err, "failed to start postgres container")

	host, err := c.Host(ctx)
	require.NoError(t, err)
	mp, err := c.MappedPort(ctx, "5432/tcp")
	require.NoError(t, err)

	return &startedDB{
		Container: c,
		DSN:       fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, pass, host, mp.Port(), db),
	}
}

func startPostgresContainer(t *testing.T) (tc.Container, string) {
	t.Helper()

	// Allow reusing an external DB without Docker (CI/dev)
	if dsn := os.Getenv("POSTGRES_TEST_DSN"); dsn != "" {
		return nil, dsn
	}

	ctx := context.Background()
	const (
		user = "testuser"
		pass = "testpass"
		db   = "testdb"
	)
	req := tc.ContainerRequest{
		Image:        "postgres:16-alpine",
		ExposedPorts: []string{"5432/tcp"},
		Env: map[string]string{
			"POSTGRES_USER":     user,
			"POSTGRES_PASSWORD": pass,
			"POSTGRES_DB":       db,
		},
		WaitingFor: wait.ForSQL(
			"5432/tcp",
			"postgres",
			func(host string, port nat.Port) string {
				return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
					user, pass, host, port.Port(), db)
			},
		).WithStartupTimeout(120 * time.Second),
	}

	c, err := tc.GenericContainer(ctx, tc.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil && strings.Contains(err.Error(), "permission denied while trying to connect to the Docker daemon socket") {
		t.Skipf("Skipping DB-backed tests: Docker not accessible (%v). Set POSTGRES_TEST_DSN to an existing DB.", err)
	}
	require.NoError(t, err, "failed to start postgres container")

	host, err := c.Host(ctx)
	require.NoError(t, err)
	mp, err := c.MappedPort(ctx, "5432/tcp")
	require.NoError(t, err)

	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, pass, host, mp.Port(), db)
	return c, dsn
}

func openDB(t *testing.T, dsn string) *sql.DB {
	t.Helper()
	db, err := sql.Open("postgres", dsn)
	require.NoError(t, err)
	require.NoError(t, db.Ping())
	return db
}

func seedBasicFileSchema(t *testing.T, db *sql.DB) {
	t.Helper()
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS files (
			id        TEXT PRIMARY KEY,
			owner_id  TEXT NOT NULL,
			file_name TEXT NOT NULL,
			nonce     TEXT NOT NULL,
			file_hash TEXT NOT NULL,
			cid       TEXT
		);
	`)
	require.NoError(t, err)
}

/* ------------------------------ Storage ------------------------------- */

type memStore struct{ m map[string][]byte }

func (s *memStore) put(key string, data []byte) { s.m[key] = append([]byte(nil), data...) }
func (s *memStore) get(key string) ([]byte, bool) {
	b, ok := s.m[key]
	if !ok {
		return nil, false
	}
	return append([]byte(nil), b...), true
}
func (s *memStore) del(key string) { delete(s.m, key) }

/* ----------------------- OwnCloud monkey patches ---------------------- */

func PatchOwncloudForView(t *testing.T, s *memStore) {
	t.Helper()
	monkey.Patch(oc.UploadFileStream, func(path, name string, r io.Reader) error {
		data, _ := io.ReadAll(r)
		key := strings.TrimSuffix(path, "/") + "/" + name
		s.put(key, data)
		return nil
	})
	monkey.Patch(oc.DownloadFileStreamTemp, func(chunkPath string) (io.ReadCloser, error) {
		if data, ok := s.get(chunkPath); ok {
			return io.NopCloser(bytes.NewReader(data)), nil
		}
		return nil, fmt.Errorf("temp chunk not found: %s", chunkPath)
	})
	monkey.Patch(oc.DeleteFileTemp, func(chunkPath string) error {
		s.del(chunkPath)
		return nil
	})
	monkey.Patch(oc.DownloadSentFileStream, func(path string) (io.ReadCloser, error) {
		if data, ok := s.get(path); ok {
			return io.NopCloser(bytes.NewReader(data)), nil
		}
		// Still return a body so handlers can stream a small placeholder
		return io.NopCloser(bytes.NewReader([]byte("missing"))), nil
	})
}

/* -------------------------- HTTP test helpers ------------------------- */

func MultipartBody(t *testing.T, fields map[string]string, fileField, fileName string, fileBytes []byte) (*bytes.Buffer, string) {
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

func PostJSON(t *testing.T, path string, body any, h http.HandlerFunc) (*httptest.ResponseRecorder, []byte) {
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
