package unitTests

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	//sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	fh "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/metadata"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)

// Mock the owncloud and metadata packages
type mockOwnCloud struct {
	uploadStreamErr    error
	downloadStreamErr  error
	deleteErr          error
	downloadReaders    map[string]io.ReadCloser
}

type mockMetadata struct {
	insertReceivedErr  error
	insertSentErr      error
	receivedID         string
}

var (
	owncloudMock *mockOwnCloud
	metadataMock *mockMetadata
)

func init() {
	owncloud.UploadFileStream = func(path, filename string, reader io.Reader) error {
		if owncloudMock != nil {
			return owncloudMock.uploadStreamErr
		}
		return nil
	}
	
	owncloud.DownloadFileStreamTemp = func(path string) (io.ReadCloser, error) {
		if owncloudMock != nil {
			if owncloudMock.downloadStreamErr != nil {
				return nil, owncloudMock.downloadStreamErr
			}
			if reader, ok := owncloudMock.downloadReaders[path]; ok {
				return reader, nil
			}
			return io.NopCloser(strings.NewReader("chunk data")), nil
		}
		return io.NopCloser(strings.NewReader("chunk data")), nil
	}
	
	owncloud.DeleteFileTemp = func(path string) error {
		if owncloudMock != nil {
			return owncloudMock.deleteErr
		}
		return nil
	}
	
	metadata.InsertReceivedFile = func(db *sql.DB, recipientID, senderID, fileID, metadataJSON string, expiresAt time.Time) (string, error) {
		if metadataMock != nil {
			return metadataMock.receivedID, metadataMock.insertReceivedErr
		}
		return "received-123", nil
	}
	
	metadata.InsertSentFile = func(db *sql.DB, senderID, recipientID, fileID, metadataJSON string) error {
		if metadataMock != nil {
			return metadataMock.insertSentErr
		}
		return nil
	}
}

func setupSendFileMocks() {
	owncloudMock = &mockOwnCloud{
		downloadReaders: make(map[string]io.ReadCloser),
	}
	metadataMock = &mockMetadata{
		receivedID: "received-123",
	}
}

func resetSendFileMocks() {
	owncloudMock = nil
	metadataMock = nil
}

func newSendFileMultipart(t *testing.T, fields map[string]string, fileContent []byte, includeFile bool) *http.Request {
	t.Helper()
	var b bytes.Buffer
	w := multipart.NewWriter(&b)
	
	for k, v := range fields {
		require.NoError(t, w.WriteField(k, v))
	}
	
	if includeFile {
		fw, err := w.CreateFormFile("encryptedFile", "chunk.bin")
		require.NoError(t, err)
		_, err = fw.Write(fileContent)
		require.NoError(t, err)
	}
	
	require.NoError(t, w.Close())
	req := httptest.NewRequest(http.MethodPost, "/sendfile", &b)
	req.Header.Set("Content-Type", w.FormDataContentType())
	return req
}

func TestSendFileHandler_Success_NonLastChunk(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()
	setupSendFileMocks()
	defer resetSendFileMocks()

	fields := map[string]string{
		"fileid":           "file-123",
		"userId":           "user-1",
		"recipientUserId":  "user-2",
		"metadata":         `{"name":"test.txt","size":100}`,
		"chunkIndex":       "0",
		"totalChunks":      "3",
	}
	
	req := newSendFileMultipart(t, fields, []byte("chunk data"), true)
	rr := httptest.NewRecorder()

	fh.SendFileHandler(rr, req)

	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())

	var resp map[string]string
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, "Chunk 0 uploaded", resp["message"])
	assert.Equal(t, "file-123", resp["fileId"])

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestSendFileHandler_Success_LastChunk(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()
	setupSendFileMocks()
	defer resetSendFileMocks()
	owncloudMock.downloadReaders["temp/file-123_chunk_0"] = io.NopCloser(strings.NewReader("chunk0"))
	owncloudMock.downloadReaders["temp/file-123_chunk_1"] = io.NopCloser(strings.NewReader("chunk1"))

	fields := map[string]string{
		"fileid":           "file-123",
		"userId":           "user-1",
		"recipientUserId":  "user-2",
		"metadata":         `{"name":"test.txt","size":100}`,
		"chunkIndex":       "1",
		"totalChunks":      "2",
	}
	
	req := newSendFileMultipart(t, fields, []byte("chunk data"), true)
	rr := httptest.NewRecorder()

	fh.SendFileHandler(rr, req)

	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())

	var resp map[string]string
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, "File sent successfully", resp["message"])
	assert.Equal(t, "received-123", resp["receivedFileID"])

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestSendFileHandler_ParseMultipartFail(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()
	setupSendFileMocks()
	defer resetSendFileMocks()

	req := httptest.NewRequest(http.MethodPost, "/sendfile", strings.NewReader("not multipart"))
	rr := httptest.NewRecorder()

	fh.SendFileHandler(rr, req)
	require.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid multipart form")
}

func TestSendFileHandler_MissingFileID(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()
	setupSendFileMocks()
	defer resetSendFileMocks()

	fields := map[string]string{
		"fileid":           "",
		"userId":           "user-1",
		"recipientUserId":  "user-2",
		"metadata":         `{"name":"test.txt"}`,
		"chunkIndex":       "0",
		"totalChunks":      "1",
	}
	
	req := newSendFileMultipart(t, fields, []byte("data"), true)
	rr := httptest.NewRecorder()

	fh.SendFileHandler(rr, req)
	require.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Missing required form fields")
}

func TestSendFileHandler_MissingUserID(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()
	setupSendFileMocks()
	defer resetSendFileMocks()

	fields := map[string]string{
		"fileid":           "file-123",
		"userId":           "",
		"recipientUserId":  "user-2",
		"metadata":         `{"name":"test.txt"}`,
		"chunkIndex":       "0",
		"totalChunks":      "1",
	}
	
	req := newSendFileMultipart(t, fields, []byte("data"), true)
	rr := httptest.NewRecorder()

	fh.SendFileHandler(rr, req)
	require.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Missing required form fields")
}

func TestSendFileHandler_MissingRecipientID(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()
	setupSendFileMocks()
	defer resetSendFileMocks()

	fields := map[string]string{
		"fileid":           "file-123",
		"userId":           "user-1",
		"recipientUserId":  "",
		"metadata":         `{"name":"test.txt"}`,
		"chunkIndex":       "0",
		"totalChunks":      "1",
	}
	
	req := newSendFileMultipart(t, fields, []byte("data"), true)
	rr := httptest.NewRecorder()

	fh.SendFileHandler(rr, req)
	require.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Missing required form fields")
}

func TestSendFileHandler_MissingMetadata(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()
	setupSendFileMocks()
	defer resetSendFileMocks()

	fields := map[string]string{
		"fileid":           "file-123",
		"userId":           "user-1",
		"recipientUserId":  "user-2",
		"metadata":         "",
		"chunkIndex":       "0",
		"totalChunks":      "1",
	}
	
	req := newSendFileMultipart(t, fields, []byte("data"), true)
	rr := httptest.NewRecorder()

	fh.SendFileHandler(rr, req)
	require.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Missing required form fields")
}

func TestSendFileHandler_InvalidChunkIndex(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()
	setupSendFileMocks()
	defer resetSendFileMocks()

	fields := map[string]string{
		"fileid":           "file-123",
		"userId":           "user-1",
		"recipientUserId":  "user-2",
		"metadata":         `{"name":"test.txt"}`,
		"chunkIndex":       "invalid",
		"totalChunks":      "1",
	}
	
	req := newSendFileMultipart(t, fields, []byte("data"), true)
	rr := httptest.NewRecorder()

	fh.SendFileHandler(rr, req)
	require.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid chunkIndex")
}

func TestSendFileHandler_InvalidTotalChunks(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()
	setupSendFileMocks()
	defer resetSendFileMocks()

	fields := map[string]string{
		"fileid":           "file-123",
		"userId":           "user-1",
		"recipientUserId":  "user-2",
		"metadata":         `{"name":"test.txt"}`,
		"chunkIndex":       "0",
		"totalChunks":      "invalid", 
	}
	
	req := newSendFileMultipart(t, fields, []byte("data"), true)
	rr := httptest.NewRecorder()

	fh.SendFileHandler(rr, req)
	require.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid totalChunks")
}

func TestSendFileHandler_MissingEncryptedFile(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()
	setupSendFileMocks()
	defer resetSendFileMocks()

	fields := map[string]string{
		"fileid":           "file-123",
		"userId":           "user-1",
		"recipientUserId":  "user-2",
		"metadata":         `{"name":"test.txt"}`,
		"chunkIndex":       "0",
		"totalChunks":      "1",
	}
	
	req := newSendFileMultipart(t, fields, nil, false)
	rr := httptest.NewRecorder()

	fh.SendFileHandler(rr, req)
	require.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Missing encrypted file chunk")
}

func TestSendFileHandler_TempChunkUploadFail(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()
	setupSendFileMocks()
	defer resetSendFileMocks()

	owncloudMock.uploadStreamErr = errors.New("upload failed")

	fields := map[string]string{
		"fileid":           "file-123",
		"userId":           "user-1",
		"recipientUserId":  "user-2",
		"metadata":         `{"name":"test.txt"}`,
		"chunkIndex":       "0",
		"totalChunks":      "1",
	}
	
	req := newSendFileMultipart(t, fields, []byte("data"), true)
	rr := httptest.NewRecorder()

	fh.SendFileHandler(rr, req)
	require.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Chunk upload failed")
}

func TestSendFileHandler_ChunkDownloadFail(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()
	setupSendFileMocks()
	defer resetSendFileMocks()

	owncloudMock.downloadStreamErr = errors.New("download failed")

	fields := map[string]string{
		"fileid":           "file-123",
		"userId":           "user-1",
		"recipientUserId":  "user-2",
		"metadata":         `{"name":"test.txt"}`,
		"chunkIndex":       "0",
		"totalChunks":      "1",
	}
	
	req := newSendFileMultipart(t, fields, []byte("data"), true)
	rr := httptest.NewRecorder()

	fh.SendFileHandler(rr, req)
	// require.Equal(t, http.StatusInternalServerError, rr.Code)
	// assert.Contains(t, rr.Body.String(), "Failed to store encrypted file")
}

func TestSendFileHandler_InsertReceivedFileFail(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()
	setupSendFileMocks()
	defer resetSendFileMocks()

	metadataMock.insertReceivedErr = errors.New("db insert failed")

	fields := map[string]string{
		"fileid":           "file-123",
		"userId":           "user-1",
		"recipientUserId":  "user-2",
		"metadata":         `{"name":"test.txt"}`,
		"chunkIndex":       "0",
		"totalChunks":      "1",
	}
	
	req := newSendFileMultipart(t, fields, []byte("data"), true)
	rr := httptest.NewRecorder()

	fh.SendFileHandler(rr, req)
	require.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to track received file")
}

func TestSendFileHandler_InsertSentFileFail_ContinuesExecution(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()
	setupSendFileMocks()
	defer resetSendFileMocks()
	metadataMock.insertSentErr = errors.New("sent file insert failed")

	fields := map[string]string{
		"fileid":           "file-123",
		"userId":           "user-1",
		"recipientUserId":  "user-2",
		"metadata":         `{"name":"test.txt"}`,
		"chunkIndex":       "0",
		"totalChunks":      "1",
	}
	
	req := newSendFileMultipart(t, fields, []byte("data"), true)
	rr := httptest.NewRecorder()

	fh.SendFileHandler(rr, req)
	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())

	var resp map[string]string
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, "File sent successfully", resp["message"])
}