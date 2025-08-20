//go:build integration
// +build integration

package integration_test

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	fh "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"

	_ "github.com/lib/pq"
)


func openDBNotif(t *testing.T, dsn string) *sql.DB {
	t.Helper()
	db, err := sql.Open("postgres", dsn)
	require.NoError(t, err)
	require.NoError(t, db.Ping())
	return db
}

func seedNotificationsSchema(t *testing.T, db *sql.DB) {
	t.Helper()
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS notifications (
			id TEXT PRIMARY KEY DEFAULT md5(random()::text),
			type TEXT NOT NULL,
			"from" TEXT NOT NULL,
			"to" TEXT NOT NULL,
			file_name TEXT NOT NULL,
			file_id TEXT NOT NULL,
			received_file_id TEXT NULL,
			message TEXT DEFAULT '',
			timestamp TEXT NOT NULL DEFAULT to_char(NOW() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
			status TEXT NOT NULL DEFAULT 'pending',
			read BOOLEAN NOT NULL DEFAULT FALSE
		);
		CREATE TABLE IF NOT EXISTS files (
			id TEXT PRIMARY KEY,
			file_name TEXT NOT NULL,
			file_type TEXT NOT NULL,
			cid TEXT,
			file_size BIGINT NOT NULL DEFAULT 0
		);
		CREATE TABLE IF NOT EXISTS received_files (
			id TEXT PRIMARY KEY DEFAULT md5(random()::text),
			file_id TEXT NOT NULL,
			recipient_id TEXT NOT NULL,
			metadata TEXT NOT NULL
		);
		-- In prod this might be a VIEW; for tests, a table with the same columns is fine.
		CREATE TABLE IF NOT EXISTS shared_files_view (
			sender_id TEXT NOT NULL,
			recipient_id TEXT NOT NULL,
			file_id TEXT NOT NULL,
			metadata TEXT NOT NULL
		);
	`)
	require.NoError(t, err)
}

func insertNotification(t *testing.T, db *sql.DB, n map[string]any) string {
	t.Helper()
	var id string
	q := `INSERT INTO notifications (type,"from","to",file_name,file_id,received_file_id,message,status,read)
	      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`
	if _, ok := n["received_file_id"]; !ok {
		n["received_file_id"] = nil
	}
	err := db.QueryRow(q,
		n["type"], n["from"], n["to"], n["file_name"], n["file_id"],
		n["received_file_id"], n["message"], n["status"], n["read"],
	).Scan(&id)
	require.NoError(t, err)
	return id
}

func doJSONReq(t *testing.T, method, path string, body any, h http.HandlerFunc) (*httptest.ResponseRecorder, []byte) {
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

/* ------------------------------ Tests ------------------------------------- */

func TestNotificationHandler_MethodNotAllowed(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/notifications?id=u1", nil)
	fh.NotificationHandler(rr, req)
	assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
}

func TestNotificationHandler_MissingUserID(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/notifications", nil)
	fh.NotificationHandler(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestNotificationHandler_DBNil(t *testing.T) {
	prev := fh.DB
	fh.DB = nil
	defer func() { fh.DB = prev }()

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/notifications?id=u1", nil)
	fh.NotificationHandler(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	var resp map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &resp)
	assert.Equal(t, false, resp["success"])
}

func TestNotificationHandler_DBError_TableMissing(t *testing.T) {
	c, dsn := startPostgresContainer(t)
	if c != nil {
		t.Cleanup(func() { _ = c.Terminate(context.Background()) })
	}
	db := openDBNotif(t, dsn)
	t.Cleanup(func() { _ = db.Close() })

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/notifications?id=u1", nil)
	fh.NotificationHandler(rr, req)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestNotificationHandler_Success_FiltersByRecipient(t *testing.T) {
	c, dsn := startPostgresContainer(t)
	if c != nil {
		t.Cleanup(func() { _ = c.Terminate(context.Background()) })
	}
	db := openDBNotif(t, dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedNotificationsSchema(t, db)

	insertNotification(t, db, map[string]any{
		"type": "share", "from": "u1", "to": "u2",
		"file_name": "a.txt", "file_id": "fa", "message": "m1",
		"status": "pending", "read": false,
	})
	insertNotification(t, db, map[string]any{
		"type": "share", "from": "u9", "to": "u2",
		"file_name": "b.txt", "file_id": "fb", "message": "m2",
		"status": "pending", "read": false,
	})
	insertNotification(t, db, map[string]any{
		"type": "share", "from": "u1", "to": "u3",
		"file_name": "c.txt", "file_id": "fc", "message": "m3",
		"status": "pending", "read": false,
	})

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/notifications?id=u2", nil)
	fh.NotificationHandler(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	var resp struct {
		Success       bool             `json:"success"`
		Notifications []map[string]any `json:"notifications"`
	}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.True(t, resp.Success)
	require.Len(t, resp.Notifications, 2)
	for _, n := range resp.Notifications {
		assert.Equal(t, "u2", n["to"])
	}
}

func TestMarkAsReadHandler_MethodNotAllowed(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/notifications/mark", nil)
	fh.MarkAsReadHandler(rr, req)
	assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
}

func TestMarkAsReadHandler_InvalidBody(t *testing.T) {
	rr, _ := doJSONReq(t, http.MethodPost, "/notifications/mark", `{"id":`, fh.MarkAsReadHandler)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestMarkAsReadHandler_MissingID(t *testing.T) {
	rr, _ := doJSONReq(t, http.MethodPost, "/notifications/mark", map[string]string{"id": ""}, fh.MarkAsReadHandler)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestMarkAsReadHandler_DBNil(t *testing.T) {
	prev := fh.DB
	fh.DB = nil
	defer func() { fh.DB = prev }()

	rr, _ := doJSONReq(t, http.MethodPost, "/notifications/mark", map[string]string{"id": "x"}, fh.MarkAsReadHandler)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestMarkAsReadHandler_NotFound(t *testing.T) {
	c, dsn := startPostgresContainer(t)
	if c != nil {
		t.Cleanup(func() { _ = c.Terminate(context.Background()) })
	}
	db := openDBNotif(t, dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedNotificationsSchema(t, db)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr, _ := doJSONReq(t, http.MethodPost, "/notifications/mark", map[string]string{"id": "does-not-exist"}, fh.MarkAsReadHandler)
	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestMarkAsReadHandler_Success(t *testing.T) {
	c, dsn := startPostgresContainer(t)
	if c != nil {
		t.Cleanup(func() { _ = c.Terminate(context.Background()) })
	}
	db := openDBNotif(t, dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedNotificationsSchema(t, db)

	id := insertNotification(t, db, map[string]any{
		"type": "share", "from": "u1", "to": "u2",
		"file_name": "a.txt", "file_id": "fa", "message": "m1",
		"status": "pending", "read": false,
	})

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr, body := doJSONReq(t, http.MethodPost, "/notifications/mark", map[string]string{"id": id}, fh.MarkAsReadHandler)
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, string(body), "Notification marked as read")

	var readVal bool
	require.NoError(t, db.QueryRow(`SELECT read FROM notifications WHERE id=$1`, id).Scan(&readVal))
	assert.True(t, readVal)
}

func TestRespondHandler_MethodNotAllowed(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/notifications/respond", nil)
	fh.RespondToShareRequestHandler(rr, req)
	assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
}

func TestRespondHandler_InvalidBody(t *testing.T) {
	rr, _ := doJSONReq(t, http.MethodPost, "/notifications/respond", `{"id":"x",`, fh.RespondToShareRequestHandler)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestRespondHandler_MissingIDOrStatus(t *testing.T) {
	rr, _ := doJSONReq(t, http.MethodPost, "/notifications/respond", map[string]string{"id": "", "status": "accepted"}, fh.RespondToShareRequestHandler)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestRespondHandler_InvalidStatus(t *testing.T) {
	rr, _ := doJSONReq(t, http.MethodPost, "/notifications/respond", map[string]string{"id": "x", "status": "weird"}, fh.RespondToShareRequestHandler)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestRespondHandler_DBNil(t *testing.T) {
	prev := fh.DB
	fh.DB = nil
	defer func() { fh.DB = prev }()
	rr, _ := doJSONReq(t, http.MethodPost, "/notifications/respond", map[string]string{"id": "x", "status": "accepted"}, fh.RespondToShareRequestHandler)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestRespondHandler_NotFoundOnUpdate(t *testing.T) {
	c, dsn := startPostgresContainer(t)
	if c != nil {
		t.Cleanup(func() { _ = c.Terminate(context.Background()) })
	}
	db := openDBNotif(t, dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedNotificationsSchema(t, db)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr, _ := doJSONReq(t, http.MethodPost, "/notifications/respond", map[string]string{"id": "missing", "status": "accepted"}, fh.RespondToShareRequestHandler)
	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestRespondHandler_Accepted_WithReceivedFileID_ReturnsFileData(t *testing.T) {
	c, dsn := startPostgresContainer(t)
	if c != nil {
		t.Cleanup(func() { _ = c.Terminate(context.Background()) })
	}
	db := openDBNotif(t, dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedNotificationsSchema(t, db)

	_, err := db.Exec(`INSERT INTO files (id,file_name,file_type,cid,file_size) VALUES ('file-1','report.pdf','file','cid/rep',12345)`)
	require.NoError(t, err)

	var rfID string
	require.NoError(t, db.QueryRow(`INSERT INTO received_files (file_id,recipient_id,metadata) VALUES ('file-1','u2','{"k":"v"}') RETURNING id`).Scan(&rfID))

	notifID := insertNotification(t, db, map[string]any{
		"type": "share", "from": "u1", "to": "u2",
		"file_name": "report.pdf", "file_id": "file-1",
		"received_file_id": rfID, "message": "please review",
		"status": "pending", "read": false,
	})

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr, body := doJSONReq(t, http.MethodPost, "/notifications/respond", map[string]string{
		"id": notifID, "status": "accepted",
	}, fh.RespondToShareRequestHandler)

	assert.Equal(t, http.StatusOK, rr.Code)

	var resp struct {
		Success bool                   `json:"success"`
		Message string                 `json:"message"`
		File    map[string]interface{} `json:"fileData"`
	}
	require.NoError(t, json.Unmarshal(body, &resp))
	assert.True(t, resp.Success)
	assert.Equal(t, "Notification status updated", resp.Message)
	require.NotNil(t, resp.File)
	assert.Equal(t, "file-1", resp.File["file_id"])
	assert.Equal(t, "u1", resp.File["sender_id"])
	assert.Equal(t, "u2", resp.File["recipient_id"])
	assert.Equal(t, "report.pdf", resp.File["file_name"])
	assert.Equal(t, "file", resp.File["file_type"])
	assert.Equal(t, "cid/rep", resp.File["cid"])
	assert.Equal(t, float64(12345), resp.File["file_size"])
	assert.Equal(t, false, resp.File["viewOnly"])
	assert.Equal(t, `{"k":"v"}`, resp.File["metadata"])
}

func TestRespondHandler_Accepted_ViewOnly_ReturnsFileData(t *testing.T) {
	c, dsn := startPostgresContainer(t)
	if c != nil {
		t.Cleanup(func() { _ = c.Terminate(context.Background()) })
	}
	db := openDBNotif(t, dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedNotificationsSchema(t, db)

	_, err := db.Exec(`INSERT INTO files (id,file_name,file_type,cid,file_size) VALUES ('file-2','img.png','file','cid/img',777)`)
	require.NoError(t, err)

	_, err = db.Exec(`INSERT INTO shared_files_view (sender_id,recipient_id,file_id,metadata) VALUES ('u1','u3','file-2','{"view":"only"}')`)
	require.NoError(t, err)

	notifID := insertNotification(t, db, map[string]any{
		"type": "share", "from": "u1", "to": "u3",
		"file_name": "img.png", "file_id": "file-2",
		"message": "FYI",
		"status": "pending", "read": false,
	})

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr, body := doJSONReq(t, http.MethodPost, "/notifications/respond", map[string]string{
		"id": notifID, "status": "accepted",
	}, fh.RespondToShareRequestHandler)

	assert.Equal(t, http.StatusOK, rr.Code)

	var resp struct {
		Success bool                   `json:"success"`
		File    map[string]interface{} `json:"fileData"`
	}
	require.NoError(t, json.Unmarshal(body, &resp))
	assert.True(t, resp.Success)
	assert.Equal(t, true, resp.File["viewOnly"])
	assert.Equal(t, `{"view":"only"}`, resp.File["metadata"])
}

func TestClearHandler_MethodNotAllowed(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/notifications/clear", nil)
	fh.ClearNotificationHandler(rr, req)
	assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
}

func TestClearHandler_InvalidBody(t *testing.T) {
	rr, _ := doJSONReq(t, http.MethodPost, "/notifications/clear", `{"id":`, fh.ClearNotificationHandler)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestClearHandler_MissingID(t *testing.T) {
	rr, _ := doJSONReq(t, http.MethodPost, "/notifications/clear", map[string]string{"id": ""}, fh.ClearNotificationHandler)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestClearHandler_DBNil(t *testing.T) {
	prev := fh.DB
	fh.DB = nil
	defer func() { fh.DB = prev }()
	rr, _ := doJSONReq(t, http.MethodPost, "/notifications/clear", map[string]string{"id": "x"}, fh.ClearNotificationHandler)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestClearHandler_NotFound(t *testing.T) {
	c, dsn := startPostgresContainer(t)
	if c != nil {
		t.Cleanup(func() { _ = c.Terminate(context.Background()) })
	}
	db := openDBNotif(t, dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedNotificationsSchema(t, db)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr, _ := doJSONReq(t, http.MethodPost, "/notifications/clear", map[string]string{"id": "missing"}, fh.ClearNotificationHandler)
	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestClearHandler_Success(t *testing.T) {
	c, dsn := startPostgresContainer(t)
	if c != nil {
		t.Cleanup(func() { _ = c.Terminate(context.Background()) })
	}
	db := openDBNotif(t, dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedNotificationsSchema(t, db)

	id := insertNotification(t, db, map[string]any{
		"type": "share", "from": "u1", "to": "u2",
		"file_name": "a.txt", "file_id": "fa", "message": "m1",
		"status": "pending", "read": false,
	})

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr, body := doJSONReq(t, http.MethodPost, "/notifications/clear", map[string]string{"id": id}, fh.ClearNotificationHandler)
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, string(body), "Notification deleted")

	var count int
	require.NoError(t, db.QueryRow(`SELECT COUNT(*) FROM notifications WHERE id=$1`, id).Scan(&count))
	assert.Equal(t, 0, count)
}


func TestAddNotificationHandler_MethodNotAllowed(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/notifications/add", nil)
	fh.AddNotificationHandler(rr, req)
	assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
}

func TestAddNotificationHandler_InvalidBody(t *testing.T) {
	rr, _ := doJSONReq(t, http.MethodPost, "/notifications/add", `{"type":"share",`, fh.AddNotificationHandler)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestAddNotificationHandler_MissingRequired(t *testing.T) {
	rr, _ := doJSONReq(t, http.MethodPost, "/notifications/add", map[string]any{
		"type": "share", "from": "u1", "to": "", "file_name": "doc", "file_id": "f1",
	}, fh.AddNotificationHandler)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestAddNotificationHandler_DBNil(t *testing.T) {
	prev := fh.DB
	fh.DB = nil
	defer func() { fh.DB = prev }()

	rr, _ := doJSONReq(t, http.MethodPost, "/notifications/add", map[string]any{
		"type": "share", "from": "u1", "to": "u2", "file_name": "doc", "file_id": "f1",
	}, fh.AddNotificationHandler)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestAddNotificationHandler_Success_ViewOnly(t *testing.T) {
	c, dsn := startPostgresContainer(t)
	if c != nil {
		t.Cleanup(func() { _ = c.Terminate(context.Background()) })
	}
	db := openDBNotif(t, dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedNotificationsSchema(t, db)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr, body := doJSONReq(t, http.MethodPost, "/notifications/add", map[string]any{
		"type": "share", "from": "u1", "to": "u2",
		"file_name": "doc", "file_id": "f1", "message": "hey",
		"viewOnly": true,
	}, fh.AddNotificationHandler)

	assert.Equal(t, http.StatusOK, rr.Code)
	var resp map[string]any
	require.NoError(t, json.Unmarshal(body, &resp))
	assert.Equal(t, true, resp["success"])
	require.NotEmpty(t, resp["id"])
}

func TestAddNotificationHandler_Success_WithReceivedFileID(t *testing.T) {
	c, dsn := startPostgresContainer(t)
	if c != nil {
		t.Cleanup(func() { _ = c.Terminate(context.Background()) })
	}
	db := openDBNotif(t, dsn)
	t.Cleanup(func() { _ = db.Close() })
	seedNotificationsSchema(t, db)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr, body := doJSONReq(t, http.MethodPost, "/notifications/add", map[string]any{
		"type": "share", "from": "u1", "to": "u2",
		"file_name": "doc", "file_id": "f1", "message": "attach",
		"receivedFileID": "rf-1",
	}, fh.AddNotificationHandler)

	assert.Equal(t, http.StatusOK, rr.Code)
	var resp map[string]any
	require.NoError(t, json.Unmarshal(body, &resp))
	assert.Equal(t, true, resp["success"])
	require.NotEmpty(t, resp["id"])
}
