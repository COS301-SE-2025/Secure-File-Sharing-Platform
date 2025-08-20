//go:build integration
// +build integration

package integration_test

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	fh "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"

	_ "github.com/lib/pq"
)

func seedAccessLogSchema(t *testing.T, db *sql.DB) {
	t.Helper()
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS access_logs (
			id        TEXT PRIMARY KEY DEFAULT md5(random()::text),
			file_id   TEXT NOT NULL,
			user_id   TEXT NOT NULL,
			action    TEXT NOT NULL,
			message   TEXT NOT NULL,
			timestamp TEXT NOT NULL DEFAULT to_char(NOW() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
		);
	`)
	require.NoError(t, err)
}

func insertAccessLog(t *testing.T, db *sql.DB, fileID, userID, action, msg, ts string) {
	t.Helper()
	if ts == "" {
		_, err := db.Exec(
			`INSERT INTO access_logs (file_id, user_id, action, message) VALUES ($1,$2,$3,$4)`,
			fileID, userID, action, msg,
		)
		require.NoError(t, err)
		return
	}
	_, err := db.Exec(
		`INSERT INTO access_logs (file_id, user_id, action, message, timestamp) VALUES ($1,$2,$3,$4,$5)`,
		fileID, userID, action, msg, ts,
	)
	require.NoError(t, err)
}

func TestAddAccesslogHandler_InvalidJSON(t *testing.T) {
	rr, body := doJSON(t, http.MethodPost, "/access/add", `{"file_id":"f1",`, fh.AddAccesslogHandler)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, string(body), "Invalid JSON payload")
}

func TestAddAccesslogHandler_MissingFields(t *testing.T) {
	rr, body := doJSON(t, http.MethodPost, "/access/add", map[string]string{
		"file_id": "f1",
		"user_id": "",
		"action":  "VIEW",
	}, fh.AddAccesslogHandler)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, string(body), "Missing required fields")
}

func TestAddAccesslogHandler_DBError_WhenTableMissing(t *testing.T) {
	pg := startPostgres(t)
	if pg.Container != nil {
		t.Cleanup(func() { _ = pg.Container.Terminate(context.Background()) })
	}
	db := openDB(t, pg.DSN)
	t.Cleanup(func() { _ = db.Close() })

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr, body := doJSON(t, http.MethodPost, "/access/add", map[string]string{
		"file_id": "f1", "user_id": "u1", "action": "VIEW", "message": "missing table should 500",
	}, fh.AddAccesslogHandler)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, string(body), "Failed to add access log")
}

func TestAddAccesslogHandler_Success_InsertsRow(t *testing.T) {
	pg := startPostgres(t)
	if pg.Container != nil {
		t.Cleanup(func() { _ = pg.Container.Terminate(context.Background()) })
	}
	db := openDB(t, pg.DSN)
	t.Cleanup(func() { _ = db.Close() })
	seedAccessLogSchema(t, db)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	payload := map[string]string{
		"file_id": "f-42",
		"user_id": "u-7",
		"action":  "DOWNLOAD",
		"message": "downloaded file",
	}
	rr, body := doJSON(t, http.MethodPost, "/access/add", payload, fh.AddAccesslogHandler)

	assert.Equal(t, http.StatusCreated, rr.Code)
	assert.Contains(t, rr.Header().Get("Content-Type"), "application/json")
	assert.Contains(t, string(body), "Access log added successfully")

	var count int
	err := db.QueryRow(
		`SELECT COUNT(*) FROM access_logs WHERE file_id=$1 AND user_id=$2 AND action=$3 AND message=$4`,
		payload["file_id"], payload["user_id"], payload["action"], payload["message"],
	).Scan(&count)
	require.NoError(t, err)
	assert.Equal(t, 1, count)
}

func TestGetAccesslogHandler_DBError_WhenTableMissing(t *testing.T) {
	pg := startPostgres(t)
	if pg.Container != nil {
		t.Cleanup(func() { _ = pg.Container.Terminate(context.Background()) })
	}
	db := openDB(t, pg.DSN)
	t.Cleanup(func() { _ = db.Close() })

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/access/list", nil)
	fh.GetAccesslogHandler(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to get access logs")
}

func TestGetAccesslogHandler_ReturnsAll_OrderedByTimestampDesc(t *testing.T) {
	pg := startPostgres(t)
	if pg.Container != nil {
		t.Cleanup(func() { _ = pg.Container.Terminate(context.Background()) })
	}
	db := openDB(t, pg.DSN)
	t.Cleanup(func() { _ = db.Close() })
	seedAccessLogSchema(t, db)

	tsOld := "2025-01-01T00:00:00.000Z"
	tsMid := "2025-03-01T00:00:00.000Z"
	tsNew := "2025-06-01T00:00:00.000Z"

	insertAccessLog(t, db, "fa", "u1", "VIEW", "old", tsOld)
	insertAccessLog(t, db, "fb", "u2", "EDIT", "mid", tsMid)
	insertAccessLog(t, db, "fc", "u3", "DELETE", "new", tsNew)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/access/list", nil)
	fh.GetAccesslogHandler(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

	var logs []map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &logs))
	require.Len(t, logs, 3)

	assert.Equal(t, "new", logs[0]["message"])
	assert.Equal(t, "mid", logs[1]["message"])
	assert.Equal(t, "old", logs[2]["message"])
}

func TestGetAccesslogHandler_FilterByFileID(t *testing.T) {
	pg := startPostgres(t)
	if pg.Container != nil {
		t.Cleanup(func() { _ = pg.Container.Terminate(context.Background()) })
	}
	db := openDB(t, pg.DSN)
	t.Cleanup(func() { _ = db.Close() })
	seedAccessLogSchema(t, db)

	insertAccessLog(t, db, "file-A", "u1", "VIEW", "a1", "2025-01-01T00:00:00.000Z")
	insertAccessLog(t, db, "file-B", "u2", "VIEW", "b1", "2025-01-02T00:00:00.000Z")
	insertAccessLog(t, db, "file-A", "u3", "EDIT", "a2", "2025-02-01T00:00:00.000Z")

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/access/list?file_id=file-A", nil)
	fh.GetAccesslogHandler(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var logs []map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &logs))
	require.Len(t, logs, 2)

	assert.Equal(t, "a2", logs[0]["message"])
	assert.Equal(t, "a1", logs[1]["message"])
}
