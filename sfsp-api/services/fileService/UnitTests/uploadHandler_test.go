package unitTests

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	fh "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func SetupMockDB(t *testing.T) (sqlmock.Sqlmock, func()) {
	t.Helper()
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	fh.SetPostgreClient(db)
	cleanup := func() {
		_ = db.Close()
		fh.DB = nil
	}
	return mock, cleanup
}

func mpReq1(t *testing.T, fields map[string]string, includeFile bool, body []byte) *http.Request {
	var b bytes.Buffer
	w := multipart.NewWriter(&b)
	for k, v := range fields {
		require.NoError(t, w.WriteField(k, v))
	}
	if includeFile {
		fw, err := w.CreateFormFile("encryptedFile", "chunk.bin")
		require.NoError(t, err)
		_, _ = fw.Write(body)
	}
	require.NoError(t, w.Close())
	req := httptest.NewRequest(http.MethodPost, "/upload", &b)
	req.Header.Set("Content-Type", w.FormDataContentType())
	return req
}

func NewJSONRequest(t *testing.T, method, url string, body any) *http.Request {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		require.NoError(t, json.NewEncoder(&buf).Encode(body))
	}
	req := httptest.NewRequest(method, url, &buf)
	req.Header.Set("Content-Type", "application/json")
	return req
}

func newMultipart(t *testing.T, fields map[string]string, fileField string, fileName string, fileContent []byte, includeFile bool) (*http.Request, string) {
	t.Helper()
	var b bytes.Buffer
	w := multipart.NewWriter(&b)
	for k, v := range fields {
		require.NoError(t, w.WriteField(k, v))
	}
	if includeFile {
		fw, err := w.CreateFormFile(fileField, fileName)
		require.NoError(t, err)
		_, err = fw.Write(fileContent)
		require.NoError(t, err)
	}
	require.NoError(t, w.Close())
	req := httptest.NewRequest(http.MethodPost, "/upload", &b)
	req.Header.Set("Content-Type", w.FormDataContentType())
	return req, w.FormDataContentType()
}

func TestStartUploadHandler_Success(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	rows := sqlmock.NewRows([]string{"id"}).AddRow("abc-123")
	mock.ExpectQuery(`INSERT INTO files \(owner_id, file_name, file_type, file_hash, nonce, description, tags, cid, file_size, created_at\)`).
		WithArgs(
			"user-1", "report.pdf", "application/pdf", "nonce-xyz",
			"desc", sqlmock.AnyArg(), "/files", sqlmock.AnyArg(),
		).
		WillReturnRows(rows)

	body := fh.StartUploadRequest{
		UserID:          "user-1",
		FileName:        "report.pdf",
		FileType:        "application/pdf",
		FileDescription: "desc",
		FileTags:        []string{"a", "b"},
		Path:            "/files",
		Nonce:           "nonce-xyz",
	}
	req := NewJSONRequest(t, http.MethodPost, "/start", body)
	rr := httptest.NewRecorder()

	fh.StartUploadHandler(rr, req)

	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())

	var resp map[string]string
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, "abc-123", resp["fileId"])

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestStartUploadHandler_BadJSON(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodPost, "/start", strings.NewReader("{bad json"))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	fh.StartUploadHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestStartUploadHandler_MissingFields(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	body := fh.StartUploadRequest{
		UserID:   "",
		FileName: "file.txt",
	}
	req := NewJSONRequest(t, http.MethodPost, "/start", body)
	rr := httptest.NewRecorder()

	fh.StartUploadHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestStartUploadHandler_DBError(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	mock.ExpectQuery(`INSERT INTO files`).WillReturnError(sql.ErrConnDone)

	body := fh.StartUploadRequest{
		UserID:          "user-1",
		FileName:        "file.txt",
		FileType:        "text/plain",
		FileDescription: "desc",
		FileTags:        []string{"x"},
		Path:            "files",
		Nonce:           "n",
	}
	req := NewJSONRequest(t, http.MethodPost, "/start", body)
	rr := httptest.NewRecorder()

	fh.StartUploadHandler(rr, req)

	require.Equal(t, http.StatusInternalServerError, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestUploadHandler_ParseMultipartFail(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodPost, "/upload", strings.NewReader("not multipart"))
	rr := httptest.NewRecorder()

	fh.UploadHandler(rr, req)
	require.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestUploadHandler_MissingRequiredFields(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	fields := map[string]string{
		"chunkIndex":  "0",
		"totalChunks": "1",
	}
	req, _ := newMultipart(t, fields, "encryptedFile", "enc.bin", []byte("abc"), true)
	rr := httptest.NewRecorder()

	fh.UploadHandler(rr, req)
	require.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestUploadHandler_InvalidChunkIndex(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	fields := map[string]string{
		"userId":      "u1",
		"fileName":    "f.bin",
		"fileType":    "application/octet-stream",
		"fileHash":    "deadbeef",
		"nonce":       "n",
		"chunkIndex":  "x",
		"totalChunks": "2",
		"fileId":      "id-1",
	}
	req, _ := newMultipart(t, fields, "encryptedFile", "enc.bin", []byte("abc"), true)
	rr := httptest.NewRecorder()

	fh.UploadHandler(rr, req)
	require.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestUploadHandler_InvalidTotalChunks(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	fields := map[string]string{
		"userId":      "u1",
		"fileName":    "f.bin",
		"fileType":    "application/octet-stream",
		"fileHash":    "deadbeef",
		"nonce":       "n",
		"chunkIndex":  "0",
		"totalChunks": "x",
		"fileId":      "id-1",
	}
	req, _ := newMultipart(t, fields, "encryptedFile", "enc.bin", []byte("abc"), true)
	rr := httptest.NewRecorder()

	fh.UploadHandler(rr, req)
	require.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestUploadHandler_MissingEncryptedFile(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	fields := map[string]string{
		"userId":      "u1",
		"fileName":    "f.bin",
		"fileType":    "application/octet-stream",
		"fileHash":    "deadbeef",
		"nonce":       "n",
		"chunkIndex":  "0",
		"totalChunks": "1",
		"fileId":      "id-1",
	}
	req, _ := newMultipart(t, fields, "encryptedFile", "enc.bin", nil, false)
	rr := httptest.NewRecorder()

	fh.UploadHandler(rr, req)
	require.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestUploadHandler_MissingFileIDOnNonFirstChunk(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	fields := map[string]string{
		"userId":      "u1",
		"fileName":    "f.bin",
		"fileType":    "application/octet-stream",
		"fileHash":    "deadbeef",
		"nonce":       "n",
		"chunkIndex":  "1",
		"totalChunks": "3",
		"fileId":      "",
	}
	req, _ := newMultipart(t, fields, "encryptedFile", "enc.bin", []byte("abc"), true)
	rr := httptest.NewRecorder()

	fh.UploadHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestUploadHandler_FirstChunk_CreatesFileID_AndStoresTemp(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	mock.ExpectQuery(`INSERT INTO files .* RETURNING id`).
		WithArgs(
			"u1",
			"doc.txt",
			"text/plain",
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
		).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow("new-1"))

	stub := newWebdavStub()
	defer setOC(t, stub)()

	req := mpReq1(t, map[string]string{
		"userId":      "u1",
		"fileName":    "doc.txt",
		"fileType":    "text/plain",
		"fileHash":    "h123",
		"nonce":       "nonce1",
		"description": "desc",
		"tags":        `["a","b"]`,
		"chunkIndex":  "0",
		"totalChunks": "2",
		"fileId":      "",
	}, true, []byte("AAA"))

	rr := httptest.NewRecorder()
	fh.UploadHandler(rr, req)
	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())

	var out map[string]string
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &out))
	assert.Equal(t, "new-1", out["fileId"])
	assert.Equal(t, "h123", out["fileHash"])
	assert.Contains(t, out["message"], "Chunk 0 uploaded")

	require.Equal(t, "", stub.readMap["temp/new-1_chunk_0"])

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestUploadHandler_FirstChunk_TempUploadFails(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	mock.ExpectQuery(`INSERT INTO files .* RETURNING id`).
		WithArgs(
			"u1", "doc.txt", "text/plain",
			sqlmock.AnyArg(), sqlmock.AnyArg(),
			sqlmock.AnyArg(), sqlmock.AnyArg(),
		).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow("f-err"))

	stub := newWebdavStub()
	stub.writeErr["temp/f-err_chunk_0"] = errors.New("boom")
	defer setOC(t, stub)()

	req := mpReq1(t, map[string]string{
		"userId": "u1", "fileName": "doc.txt", "fileType": "text/plain",
		"fileHash": "h", "nonce": "nonce1", "description": "d", "tags": "[]",
		"chunkIndex": "0", "totalChunks": "2", "fileId": "",
	}, true, []byte("AAA"))

	rr := httptest.NewRecorder()
	fh.UploadHandler(rr, req)
}

func TestUploadHandler_NonLastChunk_WithExistingFileID(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	stub := newWebdavStub()
	defer setOC(t, stub)()

	req := mpReq1(t, map[string]string{
		"userId": "u2", "fileName": "a.bin", "fileType": "application/octet-stream",
		"fileHash": "deadbeef", "nonce": "n", "chunkIndex": "1", "totalChunks": "3",
		"fileId": "id-77",
	}, true, []byte("BBB"))

	rr := httptest.NewRecorder()
	fh.UploadHandler(rr, req)
	require.Equal(t, http.StatusOK, rr.Code)

	var out map[string]string
	_ = json.Unmarshal(rr.Body.Bytes(), &out)
	assert.Equal(t, "id-77", out["fileId"])
	assert.Equal(t, "deadbeef", out["fileHash"])
	assert.Contains(t, out["message"], "Chunk 1 uploaded")

	require.Equal(t, "", stub.readMap["temp/id-77_chunk_1"])
}

func TestUploadHandler_LastChunk_MergeSuccess(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	mock.ExpectExec(`UPDATE files SET file_hash=\$1, file_size=\$2, cid=\$3 WHERE id=\$4`).
		WithArgs(sqlmock.AnyArg(), int64(9), sqlmock.AnyArg(), "id-77").
		WillReturnResult(sqlmock.NewResult(0, 1))

	stub := newWebdavStub()
	stub.readMap["temp/id-77_chunk_0"] = "AAA"
	stub.readMap["temp/id-77_chunk_1"] = "BBB"
	defer setOC(t, stub)()

	req := mpReq1(t, map[string]string{
		"userId": "u2", "fileName": "a.bin", "fileType": "application/octet-stream",
		"fileHash": "unused", "nonce": "n", "chunkIndex": "2", "totalChunks": "3",
		"fileId": "id-77",
	}, true, []byte("CCC"))

	rr := httptest.NewRecorder()
	fh.UploadHandler(rr, req)
	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())

	require.Equal(t, "", stub.writes["files/id-77"])

	var out map[string]string
	_ = json.Unmarshal(rr.Body.Bytes(), &out)
	assert.Equal(t, "File uploaded and metadata stored", out["message"])
	assert.Equal(t, "id-77", out["fileId"])

}

func TestUploadHandler_LastChunk_CreateWriterFails(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	stub := newWebdavStub()
	stub.readMap["temp/fx_chunk_0"] = "A"
	stub.mkdirErr["files"] = errors.New("mkdir fail")
	defer setOC(t, stub)()

	req := mpReq1(t, map[string]string{
		"userId": "u", "fileName": "x", "fileType": "application/octet-stream",
		"fileHash": "h", "nonce": "n", "chunkIndex": "1", "totalChunks": "2",
		"fileId": "fx",
	}, true, []byte("B"))

	rr := httptest.NewRecorder()
	fh.UploadHandler(rr, req)
	require.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "File assembly failed")
}

func TestUploadHandler_LastChunk_MergeMissingChunk(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	stub := newWebdavStub()
	defer setOC(t, stub)()

	req := mpReq1(t, map[string]string{
		"userId": "u", "fileName": "x", "fileType": "application/octet-stream",
		"fileHash": "h", "nonce": "n", "chunkIndex": "1", "totalChunks": "2",
		"fileId": "miss",
	}, true, []byte("LAST"))

	rr := httptest.NewRecorder()
	fh.UploadHandler(rr, req)
}

func TestUploadHandler_LastChunk_DBUpdateError_StillOK(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	mock.ExpectExec(`UPDATE files SET file_hash=\$1, file_size=\$2, cid=\$3 WHERE id=\$4`).
		WithArgs(sqlmock.AnyArg(), int64(3), sqlmock.AnyArg(), "ok-1").
		WillReturnError(sql.ErrConnDone)

	stub := newWebdavStub()
	stub.readMap["temp/ok-1_chunk_0"] = "A"
	defer setOC(t, stub)()

	req := mpReq1(t, map[string]string{
		"userId": "u", "fileName": "x", "fileType": "application/octet-stream",
		"fileHash": "h", "nonce": "n", "chunkIndex": "1", "totalChunks": "2",
		"fileId": "ok-1",
	}, true, []byte("BC"))

	rr := httptest.NewRecorder()
	fh.UploadHandler(rr, req)
	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())

	var out map[string]string
	_ = json.Unmarshal(rr.Body.Bytes(), &out)
	assert.Equal(t, "File uploaded and metadata stored", out["message"])
	assert.Equal(t, "ok-1", out["fileId"])
}
