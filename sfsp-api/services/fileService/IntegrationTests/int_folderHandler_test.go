//go:build integration
// +build integration

package integration_test

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	fh "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"

	_ "github.com/lib/pq"
)

func seedFilesSchema(t *testing.T, db *sql.DB) {
	t.Helper()
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS files (
			id          TEXT PRIMARY KEY DEFAULT md5(random()::text),
			owner_id    TEXT NOT NULL,
			file_name   TEXT NOT NULL,
			file_type   TEXT NOT NULL,
			file_size   BIGINT NOT NULL,
			cid         TEXT,
			nonce       TEXT,
			description TEXT,
			tags        TEXT[] NOT NULL,
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`)
	require.NoError(t, err)
}

func TestCreateFolderHandler_InvalidJSON(t *testing.T) {
	rr, body := doJSON(t, http.MethodPost, "/folders/create", `{"userId": "u1",`, fh.CreateFolderHandler)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, string(body), "Invalid JSON")
	assert.Equal(t, "*", rr.Header().Get("Access-Control-Allow-Origin"))
	assert.Contains(t, rr.Header().Get("Access-Control-Allow-Headers"), "Content-Type")
}

func TestCreateFolderHandler_MissingFields(t *testing.T) {
	rr, body := doJSON(t, http.MethodPost, "/folders/create", map[string]string{
		"userId":     "",
		"folderName": "Docs",
	}, fh.CreateFolderHandler)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, string(body), "Missing userId or folderName")
	assert.Equal(t, "*", rr.Header().Get("Access-Control-Allow-Origin"))
	assert.Contains(t, rr.Header().Get("Access-Control-Allow-Headers"), "Content-Type")
}

func TestCreateFolderHandler_DBError_TableMissing(t *testing.T) {
	pg := startPostgres(t)
	if pg.Container != nil {
		t.Cleanup(func() { _ = pg.Container.Terminate(context.Background()) })
	}
	db := openDB(t, pg.DSN)
	t.Cleanup(func() { _ = db.Close() })

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr, body := doJSON(t, http.MethodPost, "/folders/create", map[string]any{
		"userId":      "user-1",
		"folderName":  "Invoices",
		"description": "finance stuff",
	}, fh.CreateFolderHandler)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, string(body), "Failed to create folder")
}

func TestCreateFolderHandler_Success_RootFolder(t *testing.T) {
	pg := startPostgres(t)
	if pg.Container != nil {
		t.Cleanup(func() { _ = pg.Container.Terminate(context.Background()) })
	}
	db := openDB(t, pg.DSN)
	t.Cleanup(func() { _ = db.Close() })
	seedFilesSchema(t, db)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	payload := map[string]any{
		"userId":      "u-7",
		"folderName":  "RootFolder",
		"description": "top level",
	}
	rr, body := doJSON(t, http.MethodPost, "/folders/create", payload, fh.CreateFolderHandler)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))
	assert.Equal(t, "*", rr.Header().Get("Access-Control-Allow-Origin"))
	assert.Contains(t, rr.Header().Get("Access-Control-Allow-Headers"), "Content-Type")

	var resp struct {
		FolderID string `json:"folderId"`
		CID      string `json:"cid"`
	}
	require.NoError(t, json.Unmarshal(body, &resp))
	require.NotEmpty(t, resp.FolderID)
	assert.Equal(t, "RootFolder", resp.CID)

	var (
		ownerID, fileName, fileType, cid, nonce, desc, tagsArr string
		fileSize                                               int64
	)
	row := db.QueryRow(`SELECT owner_id, file_name, file_type, file_size, cid, nonce, description, tags FROM files WHERE id=$1`, resp.FolderID)
	require.NoError(t, row.Scan(&ownerID, &fileName, &fileType, &fileSize, &cid, &nonce, &desc, &tagsArr))

	assert.Equal(t, "u-7", ownerID)
	assert.Equal(t, "RootFolder", fileName)
	assert.Equal(t, "folder", fileType)
	assert.Equal(t, int64(0), fileSize)
	assert.Equal(t, "RootFolder", cid)
	assert.Equal(t, "", nonce)
	assert.Equal(t, "top level", desc)
	assert.Contains(t, tagsArr, "folder")
}

func TestCreateFolderHandler_Success_WithParentPath_TrailingSlashTrimmed(t *testing.T) {
	pg := startPostgres(t)
	if pg.Container != nil {
		t.Cleanup(func() { _ = pg.Container.Terminate(context.Background()) })
	}
	db := openDB(t, pg.DSN)
	t.Cleanup(func() { _ = db.Close() })
	seedFilesSchema(t, db)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	payload := map[string]any{
		"userId":      "user-123",
		"folderName":  "Child",
		"parentPath":  "my/docs/",
		"description": "",
	}
	rr, body := doJSON(t, http.MethodPost, "/folders/create", payload, fh.CreateFolderHandler)

	assert.Equal(t, http.StatusOK, rr.Code)

	var resp struct {
		FolderID string `json:"folderId"`
		CID      string `json:"cid"`
	}
	require.NoError(t, json.Unmarshal(body, &resp))
	assert.Equal(t, "my/docs/Child", resp.CID)

	var (
		ownerID, fileName, fileType, cid, nonce, desc, tagsArr string
		fileSize                                               int64
	)
	row := db.QueryRow(`SELECT owner_id, file_name, file_type, file_size, cid, nonce, description, tags FROM files WHERE id=$1`, resp.FolderID)
	require.NoError(t, row.Scan(&ownerID, &fileName, &fileType, &fileSize, &cid, &nonce, &desc, &tagsArr))

	assert.Equal(t, "user-123", ownerID)
	assert.Equal(t, "Child", fileName)
	assert.Equal(t, "folder", fileType)
	assert.Equal(t, int64(0), fileSize)
	assert.Equal(t, "my/docs/Child", cid)
	assert.Equal(t, "", nonce)
	assert.Contains(t, tagsArr, "folder")
}
