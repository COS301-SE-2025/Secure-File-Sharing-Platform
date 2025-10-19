package unitTests

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	metadata "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/metadata"
	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func SetupMetadataMockDB(t *testing.T) (sqlmock.Sqlmock, func()) {
	t.Helper()
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	metadata.SetPostgreClient(db)
	cleanup := func() {
		_ = db.Close()
		metadata.DB = nil
	}
	return mock, cleanup
}

func TestGetUserFilesHandler_Success(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	rows := sqlmock.NewRows([]string{"id", "file_name", "file_type", "file_size", "description", "tags", "created_at", "cid"}).
		AddRow("file-123", "test.txt", "text/plain", int64(100), "Test file", "tag1,tag2", time.Now(), "folder/test.txt").
		AddRow("file-456", "doc.pdf", "application/pdf", int64(200), "PDF doc", "pdf,document", time.Now(), "folder/doc.pdf")

	mock.ExpectQuery(`SELECT id, file_name, file_type, file_size, description, tags, created_at, cid FROM files WHERE owner_id = \$1`).
		WithArgs("user-1").
		WillReturnRows(rows)

	body := metadata.MetadataQueryRequest{UserID: "user-1"}
	req := NewJSONRequest(t, http.MethodPost, "/getUserFiles", body)
	rr := httptest.NewRecorder()

	metadata.GetUserFilesHandler(rr, req)

	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())

	var files []map[string]interface{}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &files))
	assert.Len(t, files, 2)
	assert.Equal(t, "file-123", files[0]["fileId"])
	assert.Equal(t, "test.txt", files[0]["fileName"])

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetUserFilesHandler_BadJSON(t *testing.T) {
	_, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodPost, "/getUserFiles", strings.NewReader("{bad json"))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	metadata.GetUserFilesHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid JSON payload")
}

func TestGetUserFilesHandler_MissingUserID(t *testing.T) {
	_, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	body := metadata.MetadataQueryRequest{UserID: ""}
	req := NewJSONRequest(t, http.MethodPost, "/getUserFiles", body)
	rr := httptest.NewRecorder()

	metadata.GetUserFilesHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Missing userId parameter")
}

func TestGetUserFilesHandler_DBError(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectQuery(`SELECT id, file_name`).WillReturnError(sql.ErrConnDone)

	body := metadata.MetadataQueryRequest{UserID: "user-1"}
	req := NewJSONRequest(t, http.MethodPost, "/getUserFiles", body)
	rr := httptest.NewRecorder()

	metadata.GetUserFilesHandler(rr, req)

	require.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to fetch metadata")

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetUserFilesHandler_RowScanError(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()
	rows := sqlmock.NewRows([]string{"id", "file_name", "file_type"}).
		AddRow("file-123", "test.txt", "text/plain")

	mock.ExpectQuery(`SELECT id, file_name, file_type, file_size, description, tags, created_at, cid FROM files WHERE owner_id = \$1`).
		WithArgs("user-1").
		WillReturnRows(rows)

	body := metadata.MetadataQueryRequest{UserID: "user-1"}
	req := NewJSONRequest(t, http.MethodPost, "/getUserFiles", body)
	rr := httptest.NewRecorder()

	metadata.GetUserFilesHandler(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)

	var files []map[string]interface{}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &files))
	assert.Len(t, files, 0)

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestListFileMetadataHandler_Success(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	rows := sqlmock.NewRows([]string{"id", "file_name", "file_type", "file_size", "description", "tags", "created_at"}).
		AddRow("file-123", "test.txt", "text/plain", int64(100), "Test file", pq.Array([]string{"tag1", "tag2"}), time.Now())

	mock.ExpectQuery(`SELECT id, file_name, file_type, file_size, description, tags, created_at FROM files WHERE owner_id = \$1`).
		WithArgs("user-1").
		WillReturnRows(rows)

	type MetadataRequest struct {
		UserID string `json:"userId"`
	}
	body := MetadataRequest{UserID: "user-1"}
	req := NewJSONRequest(t, http.MethodPost, "/listFileMetadata", body)
	rr := httptest.NewRecorder()

	metadata.ListFileMetadataHandler(rr, req)

	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())

	type FileMetadata struct {
		FileID      string    `json:"fileId"`
		FileName    string    `json:"fileName"`
		FileType    string    `json:"fileType"`
		FileSize    int64     `json:"fileSize"`
		Description string    `json:"description"`
		Tags        []string  `json:"tags"`
		CreatedAt   time.Time `json:"createdAt"`
	}
	var files []FileMetadata
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &files))
	assert.Len(t, files, 1)
	assert.Equal(t, "file-123", files[0].FileID)
	assert.Equal(t, []string{"tag1", "tag2"}, files[0].Tags)

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestListFileMetadataHandler_BadJSON(t *testing.T) {
	_, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodPost, "/listFileMetadata", strings.NewReader("{bad json"))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	metadata.ListFileMetadataHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid JSON payload")
}

func TestListFileMetadataHandler_MissingUserID(t *testing.T) {
	_, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	type MetadataRequest struct {
		UserID string `json:"userId"`
	}
	body := MetadataRequest{UserID: ""}
	req := NewJSONRequest(t, http.MethodPost, "/listFileMetadata", body)
	rr := httptest.NewRecorder()

	metadata.ListFileMetadataHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Missing userId")
}

func TestGetUserFileCountHandler_Success(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	rows := sqlmock.NewRows([]string{"count"}).AddRow(5)
	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM files WHERE owner_id = \$1 AND file_type != 'folder'`).
		WithArgs("user-1").
		WillReturnRows(rows)

	body := metadata.MetadataQueryRequest{UserID: "user-1"}
	req := NewJSONRequest(t, http.MethodPost, "/getUserFileCount", body)
	rr := httptest.NewRecorder()

	metadata.GetUserFileCountHandler(rr, req)

	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())

	var resp map[string]int
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, 5, resp["userFileCount"])

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetUserFileCountHandler_BadJSON(t *testing.T) {
	_, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodPost, "/getUserFileCount", strings.NewReader("{bad json"))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	metadata.GetUserFileCountHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid JSON payload")
}

func TestGetUserFileCountHandler_MissingUserID(t *testing.T) {
	_, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	body := metadata.MetadataQueryRequest{UserID: ""}
	req := NewJSONRequest(t, http.MethodPost, "/getUserFileCount", body)
	rr := httptest.NewRecorder()

	metadata.GetUserFileCountHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Missing userId")
}

func TestGetUserFileCountHandler_DBError(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectQuery(`SELECT COUNT`).WillReturnError(sql.ErrConnDone)

	body := metadata.MetadataQueryRequest{UserID: "user-1"}
	req := NewJSONRequest(t, http.MethodPost, "/getUserFileCount", body)
	rr := httptest.NewRecorder()

	metadata.GetUserFileCountHandler(rr, req)

	require.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to retrieve file count")

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestAddReceivedFileHandler_Success(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectExec(`INSERT INTO received_files`).
		WithArgs("sender-1", "recipient-1", "file-123", sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(1, 1))

	body := metadata.AddReceivedFileRequest{
		SenderID:            "sender-1",
		RecipientID:         "recipient-1",
		FileID:              "file-123",
		EncryptedFileKey:    "encrypted-key",
		X3DHEphemeralPubKey: "ephemeral-key",
		IdentityKeyPublic:   "identity-key",
		Metadata:            map[string]interface{}{"name": "test.txt", "size": 100},
	}
	req := NewJSONRequest(t, http.MethodPost, "/addReceivedFile", body)
	rr := httptest.NewRecorder()

	metadata.AddReceivedFileHandler(rr, req)

	require.Equal(t, http.StatusCreated, rr.Code, rr.Body.String())

	var resp map[string]string
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, "File shared with recipient", resp["message"])

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestAddReceivedFileHandler_BadJSON(t *testing.T) {
	_, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodPost, "/addReceivedFile", strings.NewReader("{bad json"))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	metadata.AddReceivedFileHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid JSON payload")
}

func TestAddReceivedFileHandler_MissingFields(t *testing.T) {
	_, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	body := metadata.AddReceivedFileRequest{
		SenderID:    "",
		RecipientID: "recipient-1",
		FileID:      "file-123",
	}
	req := NewJSONRequest(t, http.MethodPost, "/addReceivedFile", body)
	rr := httptest.NewRecorder()

	metadata.AddReceivedFileHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Missing required fields")
}

func TestAddReceivedFileHandler_DBError(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectExec(`INSERT INTO received_files`).WillReturnError(sql.ErrConnDone)

	body := metadata.AddReceivedFileRequest{
		SenderID:    "sender-1",
		RecipientID: "recipient-1",
		FileID:      "file-123",
		Metadata:    map[string]interface{}{"name": "test.txt"},
	}
	req := NewJSONRequest(t, http.MethodPost, "/addReceivedFile", body)
	rr := httptest.NewRecorder()

	metadata.AddReceivedFileHandler(rr, req)

	require.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to insert received file record")

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetPendingFilesHandler_Success(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	rows := sqlmock.NewRows([]string{"id", "sender_id", "file_id", "received_at", "expires_at", "metadata"}).
		AddRow("pending-123", "sender-1", "file-123", time.Now(), time.Now().Add(24*time.Hour), `{"name":"test.txt","size":100}`)

	mock.ExpectQuery(`SELECT id, sender_id, file_id, received_at, expires_at, metadata FROM received_files WHERE recipient_id = \$1 AND expires_at > NOW\(\) AND accepted = FALSE`).
		WithArgs("user-1").
		WillReturnRows(rows)

	body := metadata.MetadataQueryRequest{UserID: "user-1"}
	req := NewJSONRequest(t, http.MethodPost, "/getPendingFiles", body)
	rr := httptest.NewRecorder()

	metadata.GetPendingFilesHandler(rr, req)

	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())

	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))

	data, ok := resp["data"].([]interface{})
	require.True(t, ok)
	assert.Len(t, data, 1)

	file := data[0].(map[string]interface{})
	assert.Equal(t, "pending-123", file["id"])
	assert.Equal(t, "sender-1", file["senderId"])

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetPendingFilesHandler_BadJSON(t *testing.T) {
	_, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodPost, "/getPendingFiles", strings.NewReader("{bad json"))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	metadata.GetPendingFilesHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid JSON payload")
}

func TestGetPendingFilesHandler_MissingUserID(t *testing.T) {
	_, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	body := metadata.MetadataQueryRequest{UserID: ""}
	req := NewJSONRequest(t, http.MethodPost, "/getPendingFiles", body)
	rr := httptest.NewRecorder()

	metadata.GetPendingFilesHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Missing userId")
}

func TestAddSentFileHandler_Success(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectExec(`INSERT INTO sent_files`).
		WithArgs("sender-1", "recipient-1", "file-123").
		WillReturnResult(sqlmock.NewResult(1, 1))

	type SentFileRequest struct {
		SenderID    string `json:"senderId"`
		RecipientID string `json:"recipientId"`
		FileID      string `json:"fileId"`
	}
	body := SentFileRequest{
		SenderID:    "sender-1",
		RecipientID: "recipient-1",
		FileID:      "file-123",
	}
	req := NewJSONRequest(t, http.MethodPost, "/addSentFile", body)
	rr := httptest.NewRecorder()

	metadata.AddSentFileHandler(rr, req)

	require.Equal(t, http.StatusCreated, rr.Code, rr.Body.String())

	var resp map[string]string
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, "File sent successfully", resp["message"])

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestAddSentFileHandler_BadJSON(t *testing.T) {
	_, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodPost, "/addSentFile", strings.NewReader("{bad json"))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	metadata.AddSentFileHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid JSON payload")
}

func TestAddSentFileHandler_MissingFields(t *testing.T) {
	_, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	type SentFileRequest struct {
		SenderID    string `json:"senderId"`
		RecipientID string `json:"recipientId"`
		FileID      string `json:"fileId"`
	}
	body := SentFileRequest{
		SenderID:    "",
		RecipientID: "recipient-1",
		FileID:      "file-123",
	}
	req := NewJSONRequest(t, http.MethodPost, "/addSentFile", body)
	rr := httptest.NewRecorder()

	metadata.AddSentFileHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Missing required fields")
}

func TestGetSentFilesHandler_Success(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	rows := sqlmock.NewRows([]string{"id", "recipient_id", "file_id", "sent_at"}).
		AddRow("sent-123", "recipient-1", "file-123", time.Now())

	mock.ExpectQuery(`SELECT id, recipient_id, file_id, sent_at FROM sent_files WHERE sender_id = \$1`).
		WithArgs("user-1").
		WillReturnRows(rows)

	body := metadata.MetadataQueryRequest{UserID: "user-1"}
	req := NewJSONRequest(t, http.MethodPost, "/getSentFiles", body)
	rr := httptest.NewRecorder()

	metadata.GetSentFilesHandler(rr, req)

	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())

	var sentFiles []map[string]interface{}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &sentFiles))
	assert.Len(t, sentFiles, 1)
	assert.Equal(t, "sent-123", sentFiles[0]["id"])
	assert.Equal(t, "recipient-1", sentFiles[0]["recipientId"])

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestAddTagsHandler_BadJSON(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodPost, "/addTags", strings.NewReader("{bad json"))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	metadata.AddTagsHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid request payload")
}

func TestAddTagsHandler_MissingFields(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	body := metadata.AddTagsRequest{
		FileID: "",
		Tags:   []string{"tag1"},
	}
	req := NewJSONRequest(t, http.MethodPost, "/addTags", body)
	rr := httptest.NewRecorder()

	metadata.AddTagsHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Missing fileId or tags")
}

func TestGetUserFilesHandler_RowsErr(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	rows := sqlmock.NewRows([]string{"id", "file_name", "file_type", "file_size", "description", "tags", "created_at", "cid"}).
		AddRow("f1", "a.txt", "text/plain", int64(1), "", "", time.Now(), "cid/a").
		RowError(0, errors.New("row boom"))

	mock.ExpectQuery(`SELECT id, file_name, file_type, file_size, description, tags, created_at, cid FROM files WHERE owner_id = \$1`).
		WithArgs("u1").
		WillReturnRows(rows)

	req := NewJSONRequest(t, http.MethodPost, "/getUserFiles", metadata.MetadataQueryRequest{UserID: "u1"})
	rr := httptest.NewRecorder()

	metadata.GetUserFilesHandler(rr, req)

	require.Equal(t, http.StatusInternalServerError, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetPendingFilesHandler_DBError(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectQuery(`SELECT id, sender_id, file_id, received_at, expires_at, metadata FROM received_files`).
		WithArgs("u1").
		WillReturnError(sql.ErrConnDone)

	req := NewJSONRequest(t, http.MethodPost, "/getPendingFiles", metadata.MetadataQueryRequest{UserID: "u1"})
	rr := httptest.NewRecorder()

	metadata.GetPendingFilesHandler(rr, req)
	require.Equal(t, http.StatusInternalServerError, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetPendingFilesHandler_InvalidMetadataJSON(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	now := time.Now()
	rows := sqlmock.NewRows([]string{"id", "sender_id", "file_id", "received_at", "expires_at", "metadata"}).
		AddRow("p1", "s1", "f1", now, now.Add(24*time.Hour), "{not-json")

	mock.ExpectQuery(`SELECT id, sender_id, file_id, received_at, expires_at, metadata FROM received_files`).
		WithArgs("u1").
		WillReturnRows(rows)

	req := NewJSONRequest(t, http.MethodPost, "/getPendingFiles", metadata.MetadataQueryRequest{UserID: "u1"})
	rr := httptest.NewRecorder()

	metadata.GetPendingFilesHandler(rr, req)
	require.Equal(t, http.StatusOK, rr.Code)

	var resp map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	list := resp["data"].([]any)
	m := list[0].(map[string]any)
	assert.IsType(t, map[string]any{}, m["metadata"])
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestAddSentFileHandler_DBError(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectExec(`INSERT INTO sent_files`).WillReturnError(sql.ErrConnDone)

	req := NewJSONRequest(t, http.MethodPost, "/addSentFile", struct {
		SenderID, RecipientID, FileID string
	}{"s", "r", "f"})
	rr := httptest.NewRecorder()

	metadata.AddSentFileHandler(rr, req)
	require.Equal(t, http.StatusInternalServerError, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetSentFilesHandler_BadJSON(t *testing.T) {
	_, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodPost, "/getSentFiles", strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	metadata.GetSentFilesHandler(rr, req)
	require.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestGetSentFilesHandler_MissingUserID(t *testing.T) {
	_, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	req := NewJSONRequest(t, http.MethodPost, "/getSentFiles", metadata.MetadataQueryRequest{})
	rr := httptest.NewRecorder()

	metadata.GetSentFilesHandler(rr, req)
	require.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestGetSentFilesHandler_DBError(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectQuery(`SELECT id, recipient_id, file_id, sent_at FROM sent_files WHERE sender_id = \$1`).
		WithArgs("u1").
		WillReturnError(sql.ErrConnDone)

	req := NewJSONRequest(t, http.MethodPost, "/getSentFiles", metadata.MetadataQueryRequest{UserID: "u1"})
	rr := httptest.NewRecorder()

	metadata.GetSentFilesHandler(rr, req)
	require.Equal(t, http.StatusInternalServerError, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestDeleteFileMetadata_Success(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectBegin()
	mock.ExpectExec(`DELETE FROM received_files WHERE file_id = \$1`).WithArgs("f1").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(`DELETE FROM sent_files WHERE file_id = \$1`).WithArgs("f1").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(`DELETE FROM files WHERE id = \$1`).WithArgs("f1").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	err := metadata.DeleteFileMetadata("f1")
	require.NoError(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestDeleteFileMetadata_BeginError(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer func() {
		if err := db.Close(); err != nil {
			log.Println("error closing db:", err)
		}
	}()
	metadata.DB = db

	mock.ExpectBegin().WillReturnError(sql.ErrConnDone)
	err = metadata.DeleteFileMetadata("f1")
	require.Error(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestDeleteFileMetadata_ExecError_Received(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectBegin()
	mock.ExpectExec(`DELETE FROM received_files`).WillReturnError(sql.ErrConnDone)

	err := metadata.DeleteFileMetadata("f1")
	require.Error(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestDeleteFileMetadata_ExecError_Sent(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectBegin()
	mock.ExpectExec(`DELETE FROM received_files`).WithArgs("f1").WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(`DELETE FROM sent_files`).WillReturnError(sql.ErrConnDone)

	err := metadata.DeleteFileMetadata("f1")
	require.Error(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestDeleteFileMetadata_ExecError_Files(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectBegin()
	mock.ExpectExec(`DELETE FROM received_files`).WithArgs("f1").WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(`DELETE FROM sent_files`).WithArgs("f1").WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(`DELETE FROM files`).WillReturnError(sql.ErrConnDone)

	err := metadata.DeleteFileMetadata("f1")
	require.Error(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestDeleteFileMetadata_CommitError(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectBegin()
	mock.ExpectExec(`DELETE FROM received_files`).WithArgs("f1").WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(`DELETE FROM sent_files`).WithArgs("f1").WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(`DELETE FROM files`).WithArgs("f1").WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit().WillReturnError(sql.ErrTxDone)

	err := metadata.DeleteFileMetadata("f1")
	require.Error(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRemoveTagsFromFileHandler_Success(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectExec(`UPDATE files\s+SET tags = ARRAY\(`).
		WithArgs(sqlmock.AnyArg(), "f1").
		WillReturnResult(sqlmock.NewResult(0, 1))

	req := NewJSONRequest(t, http.MethodPost, "/removeTags", struct {
		FileID string   `json:"fileId"`
		Tags   []string `json:"tags"`
	}{"f1", []string{"a", "b"}})
	rr := httptest.NewRecorder()

	metadata.RemoveTagsFromFileHandler(rr, req)
	require.Equal(t, http.StatusOK, rr.Code)

	var resp map[string]string
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, "Tags removed successfully", resp["message"])
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRemoveTagsFromFileHandler_DBError(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectExec(`UPDATE files\s+SET tags = ARRAY\(`).WillReturnError(sql.ErrConnDone)

	req := NewJSONRequest(t, http.MethodPost, "/removeTags", struct {
		FileID string   `json:"fileId"`
		Tags   []string `json:"tags"`
	}{"f1", []string{"a"}})
	rr := httptest.NewRecorder()

	metadata.RemoveTagsFromFileHandler(rr, req)
	require.Equal(t, http.StatusInternalServerError, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetRecipientIDFromOPK_Success(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectQuery(`SELECT user_id FROM one_time_pre_keys WHERE id = \$1`).
		WithArgs("opk1").
		WillReturnRows(sqlmock.NewRows([]string{"user_id"}).AddRow("u123"))

	id, err := metadata.GetRecipientIDFromOPK("opk1")
	require.NoError(t, err)
	assert.Equal(t, "u123", id)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetRecipientIDFromOPK_NoRows(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectQuery(`SELECT user_id FROM one_time_pre_keys WHERE id = \$1`).
		WithArgs("missing").
		WillReturnError(sql.ErrNoRows)

	_, err := metadata.GetRecipientIDFromOPK("missing")
	require.Error(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestInsertReceivedFile_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer func() {
		if err := db.Close(); err != nil {
			log.Println("error closing db:", err)
		}
	}()

	mock.ExpectQuery(`SELECT EXISTS \(.*users.*\)`).
		WithArgs("recip").
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))
}

func TestInsertReceivedFile_RecipientMissing(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer func() {
		if err := db.Close(); err != nil {
			log.Println("error closing db:", err)
		}
	}()

	mock.ExpectQuery(`SELECT EXISTS \(.*users.*\)`).
		WithArgs("recip").
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(false))

	_, err = metadata.InsertReceivedFile(db, "recip", "sender", "file1", `{}`, time.Now())
	require.NoError(t, err)
}

func TestInsertReceivedFile_CheckError(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer func() {
		if err := db.Close(); err != nil {
			log.Println("error closing db:", err)
		}
	}()

	mock.ExpectQuery(`SELECT EXISTS \(.*users.*\)`).
		WithArgs("recip").
		WillReturnError(sql.ErrConnDone)

	_, err = metadata.InsertReceivedFile(db, "recip", "sender", "file1", `{}`, time.Now())
	require.NoError(t, err)
}

func TestInsertReceivedFile_InsertError(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer func() {
		if err := db.Close(); err != nil {
			log.Println("error closing db:", err)
		}
	}()

	mock.ExpectQuery(`SELECT EXISTS \(.*users.*\)`).
		WithArgs("recip").
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))

	mock.ExpectQuery(`INSERT INTO received_files .* RETURNING id`).
		WithArgs("recip", "sender", "file1", sqlmock.AnyArg(), `{}`).
		WillReturnError(sql.ErrConnDone)

	_, err = metadata.InsertReceivedFile(db, "recip", "sender", "file1", `{}`, time.Now())
	require.NoError(t, err)
}

func TestInsertSentFile_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer func() {
		if err := db.Close(); err != nil {
			log.Println("error closing db:", err)
		}
	}()

	mock.ExpectExec(`INSERT INTO sent_files`).
		WithArgs("s", "r", "f", "aes", "ek").
		WillReturnResult(sqlmock.NewResult(0, 1))

	err = metadata.InsertSentFile(db, "s", "r", "f", `{"encryptedAesKey":"aes","ekPublicKey":"ek"}`)
	require.NoError(t, err)
}

func TestInsertSentFile_InvalidJSON(t *testing.T) {
	db, _, err := sqlmock.New()
	require.NoError(t, err)
	defer func() {
		if err := db.Close(); err != nil {
			log.Println("error closing db:", err)
		}
	}()

	err = metadata.InsertSentFile(db, "s", "r", "f", `{not json`)
	require.NoError(t, err)
}

func TestInsertSentFile_MissingKeys(t *testing.T) {
	db, _, err := sqlmock.New()
	require.NoError(t, err)
	defer func() {
		if err := db.Close(); err != nil {
			log.Println("error closing db:", err)
		}
	}()

	err = metadata.InsertSentFile(db, "s", "r", "f", `{}`)
	require.NoError(t, err)
}

func TestInsertSentFile_DBError(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer func() {
		if err := db.Close(); err != nil {
			log.Println("error closing db:", err)
		}
	}()

	mock.ExpectExec(`INSERT INTO sent_files`).WillReturnError(sql.ErrConnDone)

	err = metadata.InsertSentFile(db, "s", "r", "f", `{"encryptedAesKey":"aes","ekPublicKey":"ek"}`)
	require.NoError(t, err)
}

func TestAddTagsHandler_Success(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectExec(`UPDATE files\s+SET tags = array_cat`).
		WithArgs(sqlmock.AnyArg(), "f1").
		WillReturnResult(sqlmock.NewResult(0, 1))

	req := NewJSONRequest(t, http.MethodPost, "/addTags", metadata.AddTagsRequest{
		FileID: "f1", Tags: []string{"a", "b"},
	})
	rr := httptest.NewRecorder()

	metadata.AddTagsHandler(rr, req)
	require.Equal(t, http.StatusOK, rr.Code)

	var resp map[string]string
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, "Tags added successfully", resp["message"])
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestAddTagsHandler_DBError(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectExec(`UPDATE files\s+SET tags = array_cat`).WillReturnError(sql.ErrConnDone)

	req := NewJSONRequest(t, http.MethodPost, "/addTags", metadata.AddTagsRequest{
		FileID: "f1", Tags: []string{"x"},
	})
	rr := httptest.NewRecorder()

	metadata.AddTagsHandler(rr, req)
	require.Equal(t, http.StatusInternalServerError, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestAddUserHandler_Success(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectExec(`INSERT INTO users \(id\) VALUES \(\$1\) ON CONFLICT \(id\) DO NOTHING`).
		WithArgs("u1").
		WillReturnResult(sqlmock.NewResult(0, 1))

	req := NewJSONRequest(t, http.MethodPost, "/addUser", metadata.MetadataQueryRequest{UserID: "u1"})
	rr := httptest.NewRecorder()

	metadata.AddUserHandler(rr, req)
	require.Equal(t, http.StatusOK, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestAddUserHandler_DBError(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectExec(`INSERT INTO users`).WillReturnError(sql.ErrConnDone)

	req := NewJSONRequest(t, http.MethodPost, "/addUser", metadata.MetadataQueryRequest{UserID: "u1"})
	rr := httptest.NewRecorder()

	metadata.AddUserHandler(rr, req)
	require.Equal(t, http.StatusInternalServerError, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestAddDescriptionHandler_Success(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectExec(`UPDATE files\s+SET description = \$1 WHERE id = \$2`).
		WithArgs("desc", "f1").
		WillReturnResult(sqlmock.NewResult(0, 1))

	body := struct {
		FileID      string `json:"fileId"`
		Description string `json:"description"`
	}{"f1", "desc"}
	req := NewJSONRequest(t, http.MethodPost, "/addDescription", body)
	rr := httptest.NewRecorder()

	metadata.AddDescriptionHandler(rr, req)
	require.Equal(t, http.StatusOK, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestAddDescriptionHandler_DBError(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectExec(`UPDATE files\s+SET description`).WillReturnError(sql.ErrConnDone)

	body := struct {
		FileID, Description string
	}{"f1", "desc"}
	req := NewJSONRequest(t, http.MethodPost, "/addDescription", body)
	rr := httptest.NewRecorder()

	metadata.AddDescriptionHandler(rr, req)
	require.Equal(t, http.StatusInternalServerError, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateFilePathHandler_Success(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectExec(`UPDATE files\s+SET cid = \$1 WHERE id = \$2`).
		WithArgs("p/new", "f1").
		WillReturnResult(sqlmock.NewResult(0, 1))

	body := struct {
		FileID  string `json:"fileId"`
		NewPath string `json:"newPath"`
	}{"f1", "p/new"}
	req := NewJSONRequest(t, http.MethodPost, "/updatePath", body)
	rr := httptest.NewRecorder()

	metadata.UpdateFilePathHandler(rr, req)
	require.Equal(t, http.StatusOK, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateFilePathHandler_DBError(t *testing.T) {
	mock, cleanup := SetupMetadataMockDB(t)
	defer cleanup()

	mock.ExpectExec(`UPDATE files\s+SET cid`).WillReturnError(sql.ErrConnDone)

	body := struct {
		FileID, NewPath string
	}{"f1", "p/new"}
	req := NewJSONRequest(t, http.MethodPost, "/updatePath", body)
	rr := httptest.NewRecorder()

	metadata.UpdateFilePathHandler(rr, req)
	require.Equal(t, http.StatusInternalServerError, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}
