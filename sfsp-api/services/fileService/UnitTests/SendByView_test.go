package unitTests

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"path"
	"strings"
	"sync"
	"testing"
	"time"
	"os"

	fh "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
	oc "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type webdavStub struct {
    mu       sync.Mutex
    mkdirs   []string
    writes   map[string]string
    readMap  map[string]string 
    removals []string
}

func newWebdavStub() *webdavStub {
    return &webdavStub{
        writes:  make(map[string]string),
        readMap: make(map[string]string),
    }
}

func clean(p string) string { return strings.TrimLeft(p, "/") }
func norm(p string) string  { return strings.TrimLeft(path.Clean("/"+p), "/") }

func (s *webdavStub) MkdirAll(p string, _ os.FileMode) error {
    s.mu.Lock()
    s.mkdirs = append(s.mkdirs, clean(p))
    s.mu.Unlock()
    return nil
}

func (s *webdavStub) Write(_ string, _ []byte, _ os.FileMode) error {
    return nil
}

func (s *webdavStub) WriteStream(name string, r io.Reader, _ os.FileMode) error {
    b, _ := io.ReadAll(r)
    s.mu.Lock()
    s.writes[clean(name)] = string(b)
    if strings.HasPrefix(clean(name), "temp/") {
        s.readMap[clean(name)] = string(b)
    }
    s.mu.Unlock()
    return nil
}

func (s *webdavStub) Read(_ string) ([]byte, error) { return nil, nil }

func (s *webdavStub) ReadStream(name string) (io.ReadCloser, error) {
    s.mu.Lock()
    defer s.mu.Unlock()
    if data, ok := s.readMap[clean(name)]; ok {
        return io.NopCloser(strings.NewReader(data)), nil
    }
    return nil, io.EOF
}

func (s *webdavStub) Remove(p string) error {
    s.mu.Lock()
    s.removals = append(s.removals, clean(p))
    s.mu.Unlock()
    return nil
}

type fsFileMode = uint32

func setDB(t *testing.T) (sqlmock.Sqlmock, func()) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	fh.DB = db
	return mock, func() {
		_ = db.Close()
		fh.DB = nil
	}
}

func setOC(t *testing.T, stub *webdavStub) func() {
	oc.SetClient(stub)
	return func() { oc.SetClient(nil) }
}

func mpReq(t *testing.T, url string, fields map[string]string, fileField, fileName string, fileContent []byte) *http.Request {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)

	for k, v := range fields {
		require.NoError(t, w.WriteField(k, v))
	}

	if fileField != "" {
		fw, err := w.CreateFormFile(fileField, fileName)
		require.NoError(t, err)
		_, _ = fw.Write(fileContent)
	}
	require.NoError(t, w.Close())

	req := httptest.NewRequest(http.MethodPost, url, &buf)
	req.Header.Set("Content-Type", w.FormDataContentType())
	return req
}

func jsonReq(t *testing.T, url string, v any) *http.Request {
	var buf bytes.Buffer
	require.NoError(t, json.NewEncoder(&buf).Encode(v))
	return httptest.NewRequest(http.MethodPost, url, &buf)
}

func TestSendByViewHandler_Success_NonLastChunk(t *testing.T) {
	mock, cleanupDB := setDB(t)
	defer cleanupDB()
	mock.ExpectQuery(`SELECT owner_id FROM files WHERE id = \$1`).
		WithArgs("F1").
		WillReturnRows(sqlmock.NewRows([]string{"owner_id"}).AddRow("U1"))

	stub := newWebdavStub()
	defer setOC(t, stub)()
	req := mpReq(t, "/sendByView", map[string]string{
		"fileid":         "F1",
		"userId":         "U1",
		"recipientUserId":"R1",
		"metadata":       `{"name":"doc"}`,
		"chunkIndex":     "0",
		"totalChunks":    "2",
	}, "encryptedFile", "c0.bin", []byte("AAA"))

	rr := httptest.NewRecorder()
	fh.SendByViewHandler(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)

	var resp map[string]string
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, "F1", resp["fileId"])
	assert.Contains(t, resp["message"], "Chunk 0 uploaded")
}

func TestSendByViewHandler_Success_LastChunk_MergeAndStore(t *testing.T) {
	mock, cleanupDB := setDB(t)
	defer cleanupDB()

	mock.ExpectQuery(`SELECT owner_id FROM files WHERE id = \$1`).
		WithArgs("F2").
		WillReturnRows(sqlmock.NewRows([]string{"owner_id"}).AddRow("U2"))

	mock.ExpectQuery(`SELECT id FROM shared_files_view .* revoked = FALSE`).
		WithArgs("U2", "R2", "F2").
		WillReturnError(sql.ErrNoRows)

	mock.ExpectQuery(`INSERT INTO shared_files_view .* RETURNING id`).
		WithArgs("U2", "R2", "F2", `{"name":"doc2"}`, sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow("SHARE-123"))

	mock.ExpectExec(`UPDATE files SET allow_view_sharing = TRUE WHERE id = \$1`).
		WithArgs("F2").
		WillReturnResult(sqlmock.NewResult(0, 1))

	mock.ExpectExec(`INSERT INTO access_logs .*`).
		WithArgs("F2", "U2", "shared_view", sqlmock.AnyArg(), true).
		WillReturnResult(sqlmock.NewResult(0, 1))

	stub := newWebdavStub()
	stub.readMap["temp/F2_chunk_0"] = "111"
	defer setOC(t, stub)()

	req := mpReq(t, "/sendByView", map[string]string{
		"fileid":         "F2",
		"userId":         "U2",
		"recipientUserId":"R2",
		"metadata":       `{"name":"doc2"}`,
		"chunkIndex":     "1",
		"totalChunks":    "2",
	}, "encryptedFile", "c1.bin", []byte("222"))

	rr := httptest.NewRecorder()
	fh.SendByViewHandler(rr, req)
	require.Equal(t, http.StatusOK, rr.Code)

	var resp map[string]string
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, "File shared for view-only access successfully", resp["message"])
	assert.Equal(t, "SHARE-123", resp["shareId"])
}

func TestSendByViewHandler_Rejects_NotOwner(t *testing.T) {
	mock, cleanupDB := setDB(t)
	defer cleanupDB()

	mock.ExpectQuery(`SELECT owner_id FROM files WHERE id = \$1`).
		WithArgs("F3").
		WillReturnRows(sqlmock.NewRows([]string{"owner_id"}).AddRow("OTHER"))

	stub := newWebdavStub()
	defer setOC(t, stub)()

	req := mpReq(t, "/sendByView", map[string]string{
		"fileid":         "F3",
		"userId":         "U3",
		"recipientUserId":"R3",
		"metadata":       `{}`,
		"chunkIndex":     "0",
		"totalChunks":    "1",
	}, "encryptedFile", "c.bin", []byte("x"))

	rr := httptest.NewRecorder()
	fh.SendByViewHandler(rr, req)
	require.Equal(t, http.StatusForbidden, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRevokeViewAccessHandler_Success(t *testing.T) {
	mock, cleanupDB := setDB(t)
	defer cleanupDB()

	mock.ExpectQuery(`SELECT owner_id FROM files WHERE id = \$1`).
		WithArgs("F4").
		WillReturnRows(sqlmock.NewRows([]string{"owner_id"}).AddRow("U4"))

	mock.ExpectExec(`UPDATE shared_files_view .* revoked = TRUE`).
		WithArgs("U4", "R4", "F4").
		WillReturnResult(sqlmock.NewResult(0, 1))

	mock.ExpectExec(`INSERT INTO access_logs .*`).
		WithArgs("F4", "U4", "revoked_view", sqlmock.AnyArg(), true).
		WillReturnResult(sqlmock.NewResult(0, 1))

	req := jsonReq(t, "/revoke", map[string]string{
		"fileId":      "F4",
		"userId":      "U4",
		"recipientId": "R4",
	})
	rr := httptest.NewRecorder()
	fh.RevokeViewAccessHandler(rr, req)
	require.Equal(t, http.StatusOK, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRevokeViewAccessHandler_NoActiveShare(t *testing.T) {
	mock, cleanupDB := setDB(t)
	defer cleanupDB()

	mock.ExpectQuery(`SELECT owner_id FROM files WHERE id = \$1`).
		WithArgs("F5").
		WillReturnRows(sqlmock.NewRows([]string{"owner_id"}).AddRow("U5"))

	mock.ExpectExec(`UPDATE shared_files_view .* revoked = TRUE`).
		WithArgs("U5", "R5", "F5").
		WillReturnResult(sqlmock.NewResult(0, 0))

	req := jsonReq(t, "/revoke", map[string]string{
		"fileId":      "F5",
		"userId":      "U5",
		"recipientId": "R5",
	})
	rr := httptest.NewRecorder()
	fh.RevokeViewAccessHandler(rr, req)
	require.Equal(t, http.StatusNotFound, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetSharedViewFilesHandler_Success(t *testing.T) {
	mock, cleanupDB := setDB(t)
	defer cleanupDB()

	now := time.Now()
	rows := sqlmock.NewRows([]string{
		"id", "sender_id", "file_id", "metadata", "shared_at", "expires_at",
		"file_name", "file_type", "file_size", "description",
	}).AddRow(
		"S1", "U6", "F6", `{"x":1}`, now, now.Add(24*time.Hour),
		"name.pdf", "application/pdf", int64(1234), "desc",
	)

	mock.ExpectQuery(`SELECT .* FROM shared_files_view .* JOIN files .*`).
		WithArgs("U6").
		WillReturnRows(rows)

	req := jsonReq(t, "/list", map[string]string{"userId": "U6"})
	rr := httptest.NewRecorder()
	fh.GetSharedViewFilesHandler(rr, req)
	require.Equal(t, http.StatusOK, rr.Code)

	var out []map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &out))
	require.Len(t, out, 1)
	assert.Equal(t, "S1", out[0]["share_id"])
	assert.Equal(t, "name.pdf", out[0]["file_name"])

	require.NoError(t, mock.ExpectationsWereMet())
}


func TestGetViewFileAccessLogs_Success(t *testing.T) {
	mock, cleanupDB := setDB(t)
	defer cleanupDB()

	now := time.Now()
	rows := sqlmock.NewRows([]string{"id", "action", "message", "timestamp"}).
		AddRow("L1", "viewed", "ok", now).
		AddRow("L2", "shared_view", "done", now.Add(-time.Minute))

	mock.ExpectQuery(`SELECT id, action, message, timestamp FROM access_logs .*`).
		WithArgs("F7", "U7").
		WillReturnRows(rows)

	req := jsonReq(t, "/logs", map[string]string{"fileId": "F7", "userId": "U7"})
	rr := httptest.NewRecorder()
	fh.GetViewFileAccessLogs(rr, req)
	require.Equal(t, http.StatusOK, rr.Code)

	var out []map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &out))
	require.Len(t, out, 2)
	assert.Equal(t, "L1", out[0]["id"])

	require.NoError(t, mock.ExpectationsWereMet())
}


func TestDownloadViewFileHandler_Success(t *testing.T) {
	mock, cleanupDB := setDB(t)
	defer cleanupDB()

	exp := time.Now().Add(1 * time.Hour) 
	mock.ExpectQuery(`SELECT id, sender_id, metadata, revoked, expires_at FROM shared_files_view .*`).
		WithArgs("U8", "F8").
		WillReturnRows(sqlmock.NewRows([]string{"id", "sender_id", "metadata", "revoked", "expires_at"}).
			AddRow("SH1", "S8", `{}`, false, exp))

	mock.ExpectExec(`INSERT INTO access_logs .*`).
		WithArgs("F8", "U8", "viewed", sqlmock.AnyArg(), true).
		WillReturnResult(sqlmock.NewResult(0, 1))

	stub := newWebdavStub()
	stub.readMap["files/S8/shared_view/F8_U8"] = "CONTENTS"
	defer setOC(t, stub)()

	req := jsonReq(t, "/download", map[string]string{"userId": "U8", "fileId": "F8"})
	rr := httptest.NewRecorder()
	fh.DownloadViewFileHandler(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "application/octet-stream", rr.Header().Get("Content-Type"))
	assert.Equal(t, "true", rr.Header().Get("X-View-Only"))
	assert.Equal(t, "F8", rr.Header().Get("X-File-Id"))
	assert.Equal(t, "SH1", rr.Header().Get("X-Share-Id"))
	assert.Equal(t, "CONTENTS", rr.Body.String())

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestDownloadViewFileHandler_Expired(t *testing.T) {
	mock, cleanupDB := setDB(t)
	defer cleanupDB()

	mock.ExpectQuery(`SELECT id, sender_id, metadata, revoked, expires_at FROM shared_files_view .*`).
		WithArgs("U9", "F9").
		WillReturnRows(sqlmock.NewRows([]string{"id", "sender_id", "metadata", "revoked", "expires_at"}).
			AddRow("SHX", "SX", `{}`, false, time.Now().Add(-1*time.Hour)))

	req := jsonReq(t, "/download", map[string]string{"userId": "U9", "fileId": "F9"})
	rr := httptest.NewRecorder()
	fh.DownloadViewFileHandler(rr, req)
	require.Equal(t, http.StatusForbidden, rr.Code)

	require.NoError(t, mock.ExpectationsWereMet())
}
