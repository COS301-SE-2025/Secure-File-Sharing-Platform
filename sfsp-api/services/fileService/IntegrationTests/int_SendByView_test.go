//go:build integration
// +build integration

package integration_test

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	//"time"

	monkey "bou.ke/monkey"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	fh "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
	oc "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"

	_ "github.com/lib/pq"
)

func seedSendByViewSchema(t *testing.T, db *sql.DB) {
	t.Helper()
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS files (
			id                 TEXT PRIMARY KEY,
			owner_id           TEXT NOT NULL,
			file_name          TEXT DEFAULT '',
			file_type          TEXT DEFAULT 'file',
			file_size          BIGINT DEFAULT 0,
			description        TEXT DEFAULT '',
			allow_view_sharing BOOLEAN NOT NULL DEFAULT FALSE
		);

		CREATE TABLE IF NOT EXISTS shared_files_view (
			id              TEXT PRIMARY KEY DEFAULT md5(random()::text),
			sender_id       TEXT NOT NULL,
			recipient_id    TEXT NOT NULL,
			file_id         TEXT NOT NULL,
			newfile_id      TEXT,
			metadata        TEXT NOT NULL,
			shared_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
			expires_at      TIMESTAMPTZ NULL,
			revoked         BOOLEAN NOT NULL DEFAULT FALSE,
			revoked_at      TIMESTAMPTZ NULL,
			access_granted  BOOLEAN NOT NULL DEFAULT TRUE
		);

		CREATE TABLE IF NOT EXISTS access_logs (
			id        TEXT PRIMARY KEY DEFAULT md5(random()::text),
			file_id   TEXT NOT NULL,
			user_id   TEXT NOT NULL,
			action    TEXT NOT NULL,
			message   TEXT NOT NULL,
			view_only BOOLEAN NOT NULL DEFAULT FALSE,
			timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`)
	require.NoError(t, err)
}

func openTestDB(t *testing.T) (*sql.DB, func()) {
	c, dsn := startPostgresContainer(t)
	if c != nil {
		t.Cleanup(func() { _ = c.Terminate(context.Background()) })
	}
	db, err := sql.Open("postgres", dsn)
	require.NoError(t, err)
	require.NoError(t, db.Ping())
	return db, func() { _ = db.Close() }
}

func patchOCView(t *testing.T, s *memStore) {
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
		return nil, fmt.Errorf("missing: %s", path)
	})
}

func mpBodyView(t *testing.T, fields map[string]string, fileField, fileName string, fileBytes []byte) (*bytes.Buffer, string) {
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

func postJSONView(t *testing.T, path string, body any, h http.HandlerFunc) (*httptest.ResponseRecorder, []byte) {
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

func Test_SendByView_MissingFields(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)

	body, ctype := mpBodyView(t, map[string]string{
		"userId": "u1",
		"chunkIndex":  "0",
		"totalChunks": "1",
	}, "encryptedFile", "x.bin", []byte("abc"))
	req := httptest.NewRequest(http.MethodPost, "/send/view", body)
	req.Header.Set("Content-Type", ctype)
	rr := httptest.NewRecorder()

	fh.SendByViewHandler(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Missing required form fields")
}

func Test_SendByView_InvalidIndices(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)

	body, ctype := mpBodyView(t, map[string]string{
		"fileid":          "f1",
		"userId":          "u1",
		"recipientUserId": "u2",
		"metadata":        `{}`,
		"chunkIndex":      "bad",
		"totalChunks":     "1",
	}, "", "", nil)
	req := httptest.NewRequest(http.MethodPost, "/send/view", body)
	req.Header.Set("Content-Type", ctype)
	rr := httptest.NewRecorder()
	fh.SendByViewHandler(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid chunkIndex")

	body2, ctype2 := mpBodyView(t, map[string]string{
		"fileid":          "f1",
		"userId":          "u1",
		"recipientUserId": "u2",
		"metadata":        `{}`,
		"chunkIndex":      "0",
		"totalChunks":     "bad",
	}, "", "", nil)
	req2 := httptest.NewRequest(http.MethodPost, "/send/view", body2)
	req2.Header.Set("Content-Type", ctype2)
	rr2 := httptest.NewRecorder()
	fh.SendByViewHandler(rr2, req2)
	assert.Equal(t, http.StatusBadRequest, rr2.Code)
	assert.Contains(t, rr2.Body.String(), "Invalid totalChunks")
}

func Test_SendByView_UnauthorizedOwner(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)

	db, closeDB := openTestDB(t)
	defer closeDB()
	seedSendByViewSchema(t, db)
	_, _ = db.Exec(`INSERT INTO files (id, owner_id, file_name) VALUES ('FX', 'OWNER', 'doc')`)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	body, ctype := mpBodyView(t, map[string]string{
		"fileid":          "FX",
		"userId":          "NOT_OWNER",
		"recipientUserId": "R",
		"metadata":        `{}`,
		"chunkIndex":      "0",
		"totalChunks":     "1",
	}, "", "", nil)
	req := httptest.NewRequest(http.MethodPost, "/send/view", body)
	req.Header.Set("Content-Type", ctype)
	rr := httptest.NewRecorder()

	fh.SendByViewHandler(rr, req)
	assert.Equal(t, http.StatusForbidden, rr.Code)
	assert.Contains(t, rr.Body.String(), "Unauthorized")
}

func Test_SendByView_ChunkAck_TempStored(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)
	s := &memStore{m: map[string][]byte{}}
	patchOCView(t, s)

	db, closeDB := openTestDB(t)
	defer closeDB()
	seedSendByViewSchema(t, db)
	_, _ = db.Exec(`INSERT INTO files (id, owner_id, file_name) VALUES ('F1','U1','doc')`)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	body, ctype := mpBodyView(t, map[string]string{
		"fileid":          "F1",
		"userId":          "U1",
		"recipientUserId": "U2",
		"metadata":        `{"note":"hello"}`,
		"chunkIndex":      "0",
		"totalChunks":     "2",
	}, "encryptedFile", "c0.bin", []byte("AAA"))

	req := httptest.NewRequest(http.MethodPost, "/send/view", body)
	req.Header.Set("Content-Type", ctype)
	rr := httptest.NewRecorder()

	fh.SendByViewHandler(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "Chunk 0 uploaded")

	got, ok := s.get("temp/F1_chunk_0")
	require.True(t, ok)
	assert.Equal(t, []byte("AAA"), got)
}

func Test_SendByView_SingleChunk_Success_DBUpdated_LogsWritten(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)
	s := &memStore{m: map[string][]byte{}}
	patchOCView(t, s)

	db, closeDB := openTestDB(t)
	defer closeDB()
	seedSendByViewSchema(t, db)
	_, _ = db.Exec(`INSERT INTO files (id, owner_id, file_name) VALUES ('F2','SENDER','thing')`)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	content := []byte("HELLO-VIEW")
	body, ctype := mpBodyView(t, map[string]string{
		"fileid":          "F2",
		"userId":          "SENDER",
		"recipientUserId": "RECIP",
		"metadata":        `{"x":1}`,
		"chunkIndex":      "0",
		"totalChunks":     "1",
	}, "encryptedFile", "all.bin", content)

	req := httptest.NewRequest(http.MethodPost, "/send/view", body)
	req.Header.Set("Content-Type", ctype)
	rr := httptest.NewRecorder()

	fh.SendByViewHandler(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), `"message":"File shared for view-only access successfully"`)

	finalKey := "files/SENDER/shared_view/F2_RECIP"
	got, ok := s.get(finalKey)
	require.True(t, ok)
	assert.Equal(t, content, got)

	var n int
	require.NoError(t, db.QueryRow(`SELECT COUNT(*) FROM shared_files_view WHERE sender_id='SENDER' AND recipient_id='RECIP' AND file_id='F2' AND revoked=FALSE`).Scan(&n))
	assert.Equal(t, 1, n)

	var flag bool
	require.NoError(t, db.QueryRow(`SELECT allow_view_sharing FROM files WHERE id='F2'`).Scan(&flag))
	assert.True(t, flag)

	require.NoError(t, db.QueryRow(`SELECT COUNT(*) FROM access_logs WHERE file_id='F2' AND user_id='SENDER' AND action='shared_view' AND view_only=TRUE`).Scan(&n))
	assert.Equal(t, 1, n)
}

func Test_SendByView_TempUploadError(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)

	monkey.Patch(oc.UploadFileStream, func(path, name string, r io.Reader) error {
		if strings.HasPrefix(path, "temp") {
			return fmt.Errorf("oops temp")
		}
		return nil
	})
	monkey.Patch(oc.DownloadFileStreamTemp, func(chunkPath string) (io.ReadCloser, error) {
		return nil, fmt.Errorf("unused")
	})
	monkey.Patch(oc.DeleteFileTemp, func(chunkPath string) error { return nil })
	monkey.Patch(oc.DownloadSentFileStream, func(path string) (io.ReadCloser, error) {
		return nil, fmt.Errorf("unused")
	})

	db, closeDB := openTestDB(t)
	defer closeDB()
	seedSendByViewSchema(t, db)
	_, _ = db.Exec(`INSERT INTO files (id, owner_id, file_name) VALUES ('F3','U1','doc')`)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	body, ctype := mpBodyView(t, map[string]string{
		"fileid":          "F3",
		"userId":          "U1",
		"recipientUserId": "U2",
		"metadata":        `{}`,
		"chunkIndex":      "0",
		"totalChunks":     "1",
	}, "encryptedFile", "x.bin", []byte("x"))
	req := httptest.NewRequest(http.MethodPost, "/send/view", body)
	req.Header.Set("Content-Type", ctype)
	rr := httptest.NewRecorder()

	fh.SendByViewHandler(rr, req)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Chunk upload failed")
}

func Test_RevokeViewAccess_Success(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)

	db, closeDB := openTestDB(t)
	defer closeDB()
	seedSendByViewSchema(t, db)

	_, _ = db.Exec(`INSERT INTO files (id, owner_id, file_name) VALUES ('F4','S','orig')`)
	_, _ = db.Exec(`INSERT INTO files (id, owner_id, file_name) VALUES ('NF','S','sharedcopy')`)

	_, _ = db.Exec(`INSERT INTO shared_files_view (sender_id,recipient_id,file_id,newfile_id,metadata,access_granted,revoked) VALUES ('S','R','F4','NF','{}',TRUE,FALSE)`)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr, _ := postJSONView(t, "/revoke", map[string]string{
		"fileId": "F4", "userId": "S", "recipientId": "R",
	}, fh.RevokeViewAccessHandler)
	assert.Equal(t, http.StatusOK, rr.Code)

	var revoked, granted bool
	require.NoError(t, db.QueryRow(`SELECT revoked, access_granted FROM shared_files_view WHERE sender_id='S' AND recipient_id='R' AND file_id='F4'`).Scan(&revoked, &granted))
	assert.True(t, revoked)
	assert.False(t, granted)

	var cnt int
	_ = db.QueryRow(`SELECT COUNT(*) FROM files WHERE id='NF'`).Scan(&cnt)
	assert.Equal(t, 0, cnt)
}

func Test_GetSharedViewFiles_ReturnsActiveNotExpired(t *testing.T) {
	db, closeDB := openTestDB(t)
	defer closeDB()
	seedSendByViewSchema(t, db)

	_, _ = db.Exec(`INSERT INTO files (id,owner_id,file_name,file_type,file_size,description) VALUES 
		('F5','S','img','file',10,'desc')`)

	_, _ = db.Exec(`INSERT INTO shared_files_view (sender_id,recipient_id,file_id,metadata,expires_at,access_granted,revoked) VALUES 
		('S','U','F5','{"a":1}', NOW() + interval '1 hour', TRUE, FALSE)`)

	_, _ = db.Exec(`INSERT INTO shared_files_view (sender_id,recipient_id,file_id,metadata,expires_at,access_granted,revoked) VALUES 
		('S','U','F5','{"b":2}', NOW() + interval '1 hour', TRUE, TRUE)`)

	_, _ = db.Exec(`INSERT INTO shared_files_view (sender_id,recipient_id,file_id,metadata,expires_at,access_granted,revoked) VALUES 
		('U','S','F5','{"c":3}', NOW() - interval '1 hour', TRUE, FALSE)`)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr, body := postJSONView(t, "/shared/list", map[string]string{"userId": "S"}, fh.GetSharedViewFilesHandler)
	assert.Equal(t, http.StatusOK, rr.Code)

	var arr []map[string]any
	require.NoError(t, json.Unmarshal(body, &arr))
	require.Len(t, arr, 1)
	assert.Equal(t, true, arr[0]["view_only"])
	assert.Equal(t, "img", arr[0]["file_name"])
}

func Test_GetViewFileAccessLogs_OrderedDesc(t *testing.T) {
	db, closeDB := openTestDB(t)
	defer closeDB()
	seedSendByViewSchema(t, db)

	_, _ = db.Exec(`INSERT INTO access_logs (file_id,user_id,action,message,view_only,timestamp) VALUES 
		('F6','U','viewed','m1',TRUE, TIMESTAMP '2025-01-01T00:00:00Z'),
		('F6','U','viewed','m2',TRUE, TIMESTAMP '2025-06-01T00:00:00Z')`)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr, body := postJSONView(t, "/logs/view", map[string]string{"fileId": "F6", "userId": "U"}, fh.GetViewFileAccessLogs)
	assert.Equal(t, http.StatusOK, rr.Code)

	var logs []map[string]any
	require.NoError(t, json.Unmarshal(body, &logs))
	require.Len(t, logs, 2)
	assert.Equal(t, "m2", logs[0]["message"])
	assert.Equal(t, "m1", logs[1]["message"])
}

func Test_DownloadViewFile_Success(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)
	s := &memStore{m: map[string][]byte{}}
	patchOCView(t, s)

	db, closeDB := openTestDB(t)
	defer closeDB()
	seedSendByViewSchema(t, db)

	_, _ = db.Exec(`INSERT INTO shared_files_view (id,sender_id,recipient_id,file_id,metadata,expires_at,revoked,access_granted) 
		VALUES ('SHX','S','U','F7','{"ok":true}', NOW() + interval '1 hour', FALSE, TRUE)`)

	finalPath := "files/S/shared_view/F7_U"
	content := []byte("VIEWBYTES")
	s.put(finalPath, content)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr, body := postJSONView(t, "/download/view", map[string]string{"userId": "U", "fileId": "F7"}, fh.DownloadViewFileHandler)
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "application/octet-stream", rr.Header().Get("Content-Type"))
	assert.Equal(t, "true", rr.Header().Get("X-View-Only"))
	assert.Equal(t, "F7", rr.Header().Get("X-File-Id"))
	assert.Equal(t, "SHX", rr.Header().Get("X-Share-Id"))
	assert.Equal(t, content, body)

	var n int
	require.NoError(t, db.QueryRow(`SELECT COUNT(*) FROM access_logs WHERE file_id='F7' AND user_id='U' AND action='viewed' AND view_only=TRUE`).Scan(&n))
	assert.Equal(t, 1, n)
}

func Test_DownloadViewFile_RevokedOrExpired(t *testing.T) {
	db, closeDB := openTestDB(t)
	defer closeDB()
	seedSendByViewSchema(t, db)

	_, _ = db.Exec(`INSERT INTO shared_files_view (sender_id,recipient_id,file_id,metadata,expires_at,revoked,access_granted) 
		VALUES ('S','U','FR','{}', NOW() + interval '1 hour', TRUE, TRUE)`)

	_, _ = db.Exec(`INSERT INTO shared_files_view (sender_id,recipient_id,file_id,metadata,expires_at,revoked,access_granted) 
		VALUES ('S','U','FE','{}', NOW() - interval '1 hour', FALSE, TRUE)`)

	prev := fh.DB
	fh.DB = db
	t.Cleanup(func() { fh.DB = prev })

	rr, _ := postJSONView(t, "/download/view", map[string]string{"userId": "U", "fileId": "FR"}, fh.DownloadViewFileHandler)
	assert.Equal(t, http.StatusForbidden, rr.Code)

	rr2, _ := postJSONView(t, "/download/view", map[string]string{"userId": "U", "fileId": "FE"}, fh.DownloadViewFileHandler)
	assert.Equal(t, http.StatusForbidden, rr2.Code)
}
