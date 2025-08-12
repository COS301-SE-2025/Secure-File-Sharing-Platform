package unitTests

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"io"
	"fmt"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	fh "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)

func setupMockOwnCloudDownload(t *testing.T) func() {
	t.Helper()

	// Setup mock for OwnCloud download stream
	owncloud.DownloadFileStream = func(fileId string) (io.ReadCloser, error) {
		return io.NopCloser(strings.NewReader("fake-file-content")), nil
	}

	owncloud.DownloadSentFileStream = func(filePath string) (io.ReadCloser, error) {
		return io.NopCloser(strings.NewReader("fake-sent-file-content")), nil
	}

	// Return cleanup function to reset mocks after the test is done
	return func() {
		owncloud.DownloadFileStream = nil
		owncloud.DownloadSentFileStream = nil
	}
}

// --- DownloadHandler tests ---

func TestDownloadHandler_Success(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	// Mock the DB query for the file metadata
	rows := sqlmock.NewRows([]string{"file_name", "nonce", "file_hash", "cid"}).
		AddRow("test.pdf", "nonce123", "dummyhash", "cid-xyz")
	mock.ExpectQuery(`SELECT file_name, nonce, file_hash, cid FROM files`).
		WithArgs("user-1", "file-123").
		WillReturnRows(rows)

	// Setup the mock for OwnCloud download stream
	resetOwnCloud := setupMockOwnCloudDownload(t)
	defer resetOwnCloud()

	body := fh.DownloadRequest{
		UserID: "user-1",
		FileId: "file-123",
	}
	req := NewJSONRequest(t, http.MethodPost, "/download", body)
	rr := httptest.NewRecorder()

	// Call the handler
	fh.DownloadHandler(rr, req)

	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())

	// Assert the expected response headers
	assert.Equal(t, "application/octet-stream", rr.Header().Get("Content-Type"))
	assert.Equal(t, "test.pdf", rr.Header().Get("X-File-Name"))
	assert.Equal(t, "nonce123", rr.Header().Get("X-Nonce"))

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestDownloadHandler_InvalidJSON(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodPost, "/download", strings.NewReader("{bad json"))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	// Call the handler
	fh.DownloadHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestDownloadHandler_MissingFields(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	body := fh.DownloadRequest{
		UserID: "", // Missing UserID
		FileId: "file-123",
	}
	req := NewJSONRequest(t, http.MethodPost, "/download", body)
	rr := httptest.NewRecorder()

	// Call the handler
	fh.DownloadHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestDownloadHandler_FileNotFound(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	// Mocking a database query error
	mock.ExpectQuery(`SELECT file_name, nonce, file_hash, cid FROM files`).
		WithArgs("user-1", "file-999").
		WillReturnError(sql.ErrNoRows)

	body := fh.DownloadRequest{
		UserID: "user-1",
		FileId: "file-999",
	}
	req := NewJSONRequest(t, http.MethodPost, "/download", body)
	rr := httptest.NewRecorder()

	// Call the handler
	fh.DownloadHandler(rr, req)

	require.Equal(t, http.StatusNotFound, rr.Code)
}

// --- DownloadSentFile tests ---

func TestDownloadSentFile_Success(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	// Setup the mock for OwnCloud download stream
	resetOwnCloud := setupMockOwnCloudDownload(t)
	defer resetOwnCloud()

	body := fh.DownloadSentRequest{
		FilePath: "/files/sent/file-123",
	}
	req := 	NewJSONRequest(t, http.MethodPost, "/sent/download", body)
	rr := httptest.NewRecorder()

	// Call the handler
	fh.DownloadSentFile(rr, req)

	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())

	// Assert the expected response headers
	assert.Equal(t, "application/octet-stream", rr.Header().Get("Content-Type"))

	// Validate the streamed file content if needed
	// (e.g., ensure the file content is what we expect it to be)
	// For now, it's mocked to "fake-sent-file-content"
}

func TestDownloadSentFile_InvalidJSON(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodPost, "/sent/download", strings.NewReader("{bad json"))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	// Call the handler
	fh.DownloadSentFile(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestDownloadSentFile_MissingFilePath(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	body := fh.DownloadSentRequest{
		FilePath: "", // Missing file path
	}
	req := NewJSONRequest(t, http.MethodPost, "/sent/download", body)
	rr := httptest.NewRecorder()

	// Call the handler
	fh.DownloadSentFile(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestDownloadSentFile_OwnCloudError(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	// Mocking an error in OwnCloud download stream
	resetOwnCloud := setupMockOwnCloudDownload(t)
	defer resetOwnCloud()

	// Simulate the error scenario by returning an error from the mock
	owncloud.DownloadSentFileStream = func(filePath string) (io.ReadCloser, error) {
		return nil, fmt.Errorf("OwnCloud error")  // Return an error here
	}

	body := fh.DownloadSentRequest{
		FilePath: "/files/sent/file-123",
	}
	req := NewJSONRequest(t, http.MethodPost, "/sent/download", body)
	rr := httptest.NewRecorder()

	// Call the handler
	fh.DownloadSentFile(rr, req)

	// Assert that the status code is 500 when an error occurs
	require.Equal(t, http.StatusInternalServerError, rr.Code)
}
