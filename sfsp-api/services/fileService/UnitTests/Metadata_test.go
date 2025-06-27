package unitTests

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"bytes"
	"errors"
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/lib/pq"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/metadata"
)

type MockMetadataStore struct {
    GetUserFilesFunc    func(userID string) ([]map[string]interface{}, error)
    AddReceivedFileFunc func(req metadata.AddReceivedFileRequest) error
	//AddTagsRequestFunc func(req metadata.AddTagsRequest) error
}

func (m *MockMetadataStore) GetUserFiles(userID string) ([]map[string]interface{}, error) {
    return m.GetUserFilesFunc(userID)
}
func (m *MockMetadataStore) AddReceivedFile(req metadata.AddReceivedFileRequest) error {
    return m.AddReceivedFileFunc(req)
}

// ========================= Test GetUserFilesHandler

func TestGetUserFilesHandler_Success(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	metadata.DB = db

	mock.ExpectQuery("SELECT id, file_name, file_type, file_size, description, tags, created_at").
		WithArgs("user123").
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "file_name", "file_type", "file_size", "description", "tags", "created_at",
		}).AddRow("1", "doc.pdf", "application/pdf", int64(12345), "My File", "important", time.Now()))

	body := []byte(`{"userId":"user123"}`)
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	metadata.GetUserFilesHandler(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp []map[string]interface{}
	err := json.NewDecoder(w.Body).Decode(&resp)
	assert.NoError(t, err)
	assert.Equal(t, "doc.pdf", resp[0]["fileName"])
}

func TestGetUserFilesHandler_InvalidJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader("invalid json"))
	w := httptest.NewRecorder()

	metadata.GetUserFilesHandler(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetUserFilesHandler_MissingUserID(t *testing.T) {
	body := []byte(`{"userId":""}`)
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	metadata.GetUserFilesHandler(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetUserFilesHandler_DBError(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	metadata.DB = db

	mock.ExpectQuery("SELECT id, file_name, file_type, file_size, description, tags, created_at").
		WithArgs("user123").
		WillReturnError(errors.New("query failed"))

	body := []byte(`{"userId":"user123"}`)
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	metadata.GetUserFilesHandler(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

//============ Test ListfileMetadataHandler ================

func TestListFileMetadataHandler_Success(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	metadata.DB = db

	timestamp := time.Now()

	mock.ExpectQuery("SELECT id, file_name, file_type, file_size, description, tags, created_at").
		WithArgs("user123").
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "file_name", "file_type", "file_size", "description", "tags", "created_at",
		}).AddRow("1", "doc.pdf", "application/pdf", int64(2048), "desc", pq.Array([]string{"tag1", "tag2"}), timestamp))

	body := []byte(`{"userId":"user123"}`)
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	metadata.ListFileMetadataHandler(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var files []map[string]interface{}
	err := json.NewDecoder(w.Body).Decode(&files)
	assert.NoError(t, err)
	assert.Equal(t, "doc.pdf", files[0]["fileName"])
	assert.Equal(t, "desc", files[0]["description"])
}

func TestListFileMetadataHandler_InvalidJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader("invalid json"))
	w := httptest.NewRecorder()

	metadata.ListFileMetadataHandler(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestListFileMetadataHandler_MissingUserID(t *testing.T) {
	body := []byte(`{"userId":""}`)
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	metadata.ListFileMetadataHandler(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestListFileMetadataHandler_DBQueryError(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	metadata.DB = db

	mock.ExpectQuery("SELECT id, file_name, file_type, file_size, description, tags, created_at").
		WithArgs("user123").
		WillReturnError(errors.New("query failed"))

	body := []byte(`{"userId":"user123"}`)
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	metadata.ListFileMetadataHandler(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestListFileMetadataHandler_RowScanError(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	metadata.DB = db

	mock.ExpectQuery("SELECT id, file_name, file_type, file_size, description, tags, created_at").
		WithArgs("user123").
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "file_name", "file_type", "file_size", "description", "tags", "created_at",
		}).AddRow(nil, nil, nil, nil, nil, nil, nil)) // force scan error

	body := []byte(`{"userId":"user123"}`)
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	metadata.ListFileMetadataHandler(w, req)
	assert.Equal(t, http.StatusOK, w.Code) // still 200, but result should be empty
}

//===== Test Gey user filesCountHandler ====================

func TestGetUserFileCountHandler(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	// Swap out the global DB with our mock
	originalDB := metadata.DB
	metadata.DB = db
	defer func() { metadata.DB = originalDB }()

	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM files WHERE owner_id = \$1`).
		WithArgs("test-user").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(3))

	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"userId":"test-user"}`))
	w := httptest.NewRecorder()

	metadata.GetUserFileCountHandler(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]int
	err = json.NewDecoder(w.Body).Decode(&resp)
	assert.NoError(t, err)
	assert.Equal(t, 3, resp["userFileCount"])
}

func TestGetUserFileCountHandler_MissingUserID(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"userId": ""}`))
	w := httptest.NewRecorder()

	metadata.GetUserFileCountHandler(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Missing userId")
}

func TestGetUserFileCountHandler_DBError(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	originalDB := metadata.DB
	metadata.DB = db
	defer func() { metadata.DB = originalDB }()

	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM files WHERE owner_id = \$1`).
		WithArgs("test-user").
		WillReturnError(sql.ErrConnDone)

	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"userId":"test-user"}`))
	w := httptest.NewRecorder()

	metadata.GetUserFileCountHandler(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Failed to retrieve file count")
}

func TestGetUserFileCountHandler_InvalidJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`invalid-json`))
	w := httptest.NewRecorder()

	metadata.GetUserFileCountHandler(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid JSON payload")
}

//============== Test AddReceivedFileHandler

func TestAddReceivedFileHandler_Success(t *testing.T) {
		db, mock, _ := sqlmock.New()
		defer db.Close()
		metadata.SetPostgreClient(db)

		mock.ExpectExec("INSERT INTO received_files").
			WithArgs("sender-123", "recipient-456", "file-789", sqlmock.AnyArg()).
			WillReturnResult(sqlmock.NewResult(1, 1))

		body := map[string]interface{}{
			"senderId":     "sender-123",
			"recipientId":  "recipient-456",
			"fileId":       "file-789",
			"metadata":     map[string]interface{}{"note": "secure"},
		}
		jsonBody, _ := json.Marshal(body)

		req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBuffer(jsonBody))
		w := httptest.NewRecorder()

		metadata.AddReceivedFileHandler(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)
		assert.Contains(t, w.Body.String(), "File shared with recipient")
	}

func TestAddReceivedFileHandler_InvalidJSON(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString("not-json"))
		w := httptest.NewRecorder()

		metadata.AddReceivedFileHandler(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "Invalid JSON payload")
	}

func TestAddReceivedFileHandler_MissingFields(t *testing.T) {
	body := map[string]interface{}{
		"senderId":     "sender-123",
		"recipientId":  "",
		"fileId":       "file-789",
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBuffer(jsonBody))
	w := httptest.NewRecorder()

	metadata.AddReceivedFileHandler(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Missing required fields")
}

func TestAddReceivedFileHandler_DBInsertError(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	metadata.SetPostgreClient(db)

	mock.ExpectExec("INSERT INTO received_files").
	WillReturnError(errors.New("db insert failed"))

	body := map[string]interface{}{
		"senderId":     "sender-123",
		"recipientId":  "recipient-456",
		"fileId":       "file-789",
		"metadata":     map[string]interface{}{},
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBuffer(jsonBody))
	w := httptest.NewRecorder()

	metadata.AddReceivedFileHandler(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Failed to insert received file record")
}

//======== Test Get pending files ==================
func TestGetPendingFilesHandler(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	metadata.SetPostgreClient(db)

	t.Run("successfully returns pending files", func(t *testing.T) {
		requestBody := `{"userId":"user123"}`
		req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(requestBody))
		w := httptest.NewRecorder()

		rows := sqlmock.NewRows([]string{
			"id", "sender_id", "file_id", "received_at", "expires_at", "metadata",
		}).AddRow(
			"1", "sender123", "file123",
			time.Now(), time.Now().Add(24*time.Hour),
			`{"key":"value"}`,
		)

		mock.ExpectQuery("SELECT id, sender_id, file_id, received_at, expires_at, metadata").
			WithArgs("user123").WillReturnRows(rows)

		metadata.GetPendingFilesHandler(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		var result map[string][]map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &result)
		require.NoError(t, err)
		assert.Equal(t, "file123", result["data"][0]["fileId"])
	})

	t.Run("invalid JSON", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`invalid`))
		w := httptest.NewRecorder()

		metadata.GetPendingFilesHandler(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("missing userId", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"userId":""}`))
		w := httptest.NewRecorder()

		metadata.GetPendingFilesHandler(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("query error", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"userId":"user123"}`))
		w := httptest.NewRecorder()

		mock.ExpectQuery("SELECT id, sender_id, file_id, received_at, expires_at, metadata").
			WithArgs("user123").WillReturnError(errors.New("db error"))

		metadata.GetPendingFilesHandler(w, req)
		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})
}

//========= Test AddSentFileHandler
func TestAddSentFileHandler_Success(t *testing.T) {
	db, mock, _ := sqlmock.New()
	metadata.DB = db
	defer db.Close()

	mock.ExpectExec("INSERT INTO sent_files").
		WithArgs("sender123", "recipient456", "file789").
		WillReturnResult(sqlmock.NewResult(1, 1))

	body := map[string]string{
		"senderId":    "sender123",
		"recipientId": "recipient456",
		"fileId":      "file789",
	}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBuffer(b))
	w := httptest.NewRecorder()

	metadata.AddSentFileHandler(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	assert.Equal(t, "File sent successfully", resp["message"])
}

func TestAddSentFileHandler_MissingFields(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(`{"senderId": "s1"}`))
	w := httptest.NewRecorder()
	metadata.AddSentFileHandler(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestAddSentFileHandler_InvalidJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(`{invalid json}`))
	w := httptest.NewRecorder()
	metadata.AddSentFileHandler(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestAddSentFileHandler_DBError(t *testing.T) {
	db, mock, _ := sqlmock.New()
	metadata.DB = db
	defer db.Close()

	mock.ExpectExec("INSERT INTO sent_files").
		WithArgs("sender123", "recipient456", "file789").
		WillReturnError(sql.ErrConnDone)

	body := map[string]string{
		"senderId":    "sender123",
		"recipientId": "recipient456",
		"fileId":      "file789",
	}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBuffer(b))
	w := httptest.NewRecorder()

	metadata.AddSentFileHandler(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

//============ Test GetSentFilesHandler ============
func TestGetSentFilesHandler_Success(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	metadata.DB = db

	sentTime := time.Now()
	rows := sqlmock.NewRows([]string{"id", "recipient_id", "file_id", "sent_at"}).
		AddRow("1", "recipient1", "file1", sentTime)

	mock.ExpectQuery("SELECT id, recipient_id, file_id, sent_at FROM sent_files WHERE sender_id = \\$1").
		WithArgs("user123").
		WillReturnRows(rows)

	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"userId":"user123"}`))
	w := httptest.NewRecorder()

	metadata.GetSentFilesHandler(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response []map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Len(t, response, 1)
	assert.Equal(t, "file1", response[0]["fileId"])
}

func TestGetSentFilesHandler_DBError(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	metadata.DB = db

	mock.ExpectQuery("SELECT id, recipient_id, file_id, sent_at FROM sent_files WHERE sender_id = \\$1").
		WithArgs("user123").WillReturnError(errors.New("query failed"))

	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"userId":"user123"}`))
	w := httptest.NewRecorder()

	metadata.GetSentFilesHandler(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestGetSentFilesHandler_MissingUserID(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"userId":""}`))
	w := httptest.NewRecorder()

	metadata.GetSentFilesHandler(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetSentFilesHandler_InvalidJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`invalid`))
	w := httptest.NewRecorder()

	metadata.GetSentFilesHandler(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

//============= Test DeleteFileMetadata =======================
func TestDeleteFileMetadata_Success(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	metadata.DB = db

	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM received_files").WithArgs("file123").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectExec("DELETE FROM sent_files").WithArgs("file123").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectExec("DELETE FROM files").WithArgs("file123").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := metadata.DeleteFileMetadata("file123")
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestDeleteFileMetadata_BeginTxFails(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	metadata.DB = db

	mock.ExpectBegin().WillReturnError(errors.New("tx error"))

	err := metadata.DeleteFileMetadata("file123")
	assert.Error(t, err)
}

func TestDeleteFileMetadata_ReceivedFilesDeleteFails(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	metadata.DB = db

	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM received_files").WithArgs("file123").WillReturnError(errors.New("delete error"))

	err := metadata.DeleteFileMetadata("file123")
	assert.Error(t, err)
}

func TestDeleteFileMetadata_SentFilesDeleteFails(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	metadata.DB = db

	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM received_files").WithArgs("file123").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectExec("DELETE FROM sent_files").WithArgs("file123").WillReturnError(errors.New("delete error"))

	err := metadata.DeleteFileMetadata("file123")
	assert.Error(t, err)
}

func TestDeleteFileMetadata_FinalDeleteFails(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	metadata.DB = db

	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM received_files").WithArgs("file123").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectExec("DELETE FROM sent_files").WithArgs("file123").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectExec("DELETE FROM files").WithArgs("file123").WillReturnError(errors.New("delete error"))

	err := metadata.DeleteFileMetadata("file123")
	assert.Error(t, err)
}

func TestDeleteFileMetadata_CommitFails(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	metadata.DB = db

	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM received_files").WithArgs("file123").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectExec("DELETE FROM sent_files").WithArgs("file123").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectExec("DELETE FROM files").WithArgs("file123").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit().WillReturnError(errors.New("commit failed"))

	err := metadata.DeleteFileMetadata("file123")
	assert.Error(t, err)
}

// ============ Test Remove Tags from Files ===============
func TestRemoveTagsFromFileHandler_Success(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	metadata.DB = db

	mock.ExpectExec("UPDATE files").
		WithArgs(pq.Array([]string{"tag1", "tag2"}), "file123").
		WillReturnResult(sqlmock.NewResult(1, 1))

	payload := map[string]interface{}{
		"fileId": "file123",
		"tags":   []string{"tag1", "tag2"},
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	metadata.RemoveTagsFromFileHandler(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	assert.Equal(t, "Tags removed successfully", resp["message"])
}

func TestRemoveTagsFromFileHandler_InvalidJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`invalid json`))
	w := httptest.NewRecorder()

	metadata.RemoveTagsFromFileHandler(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestRemoveTagsFromFileHandler_MissingFields(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"fileId": "", "tags": []}`))
	w := httptest.NewRecorder()

	metadata.RemoveTagsFromFileHandler(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestRemoveTagsFromFileHandler_DBError(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	metadata.DB = db

	mock.ExpectExec("UPDATE files").
		WithArgs(pq.Array([]string{"tag1"}), "file123").
		WillReturnError(errors.New("db error"))

	payload := map[string]interface{}{
		"fileId": "file123",
		"tags":   []string{"tag1"},
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	metadata.RemoveTagsFromFileHandler(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

//============ Test GetRecipientIDFromOPK ============
func TestGetRecipientIDFromOPK_Success(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	metadata.DB = db

	mock.ExpectQuery("SELECT user_id FROM one_time_pre_keys WHERE id = \\$1").
		WithArgs("opk123").
		WillReturnRows(sqlmock.NewRows([]string{"user_id"}).AddRow("user456"))

	userID, err := metadata.GetRecipientIDFromOPK("opk123")
	assert.NoError(t, err)
	assert.Equal(t, "user456", userID)
}

func TestGetRecipientIDFromOPK_NotFound(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	metadata.DB = db

	mock.ExpectQuery("SELECT user_id FROM one_time_pre_keys WHERE id = \\$1").
		WithArgs("missingOPK").
		WillReturnError(sql.ErrNoRows)

	userID, err := metadata.GetRecipientIDFromOPK("missingOPK")
	assert.Error(t, err)
	assert.Equal(t, "", userID)
}

func TestGetRecipientIDFromOPK_DBError(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	metadata.DB = db

	mock.ExpectQuery("SELECT user_id FROM one_time_pre_keys WHERE id = \\$1").
		WithArgs("opk123").
		WillReturnError(errors.New("query failed"))

	userID, err := metadata.GetRecipientIDFromOPK("opk123")
	assert.Error(t, err)
	assert.Equal(t, "", userID)
}

//============ Test Insert Received files =============
func TestInsertReceivedFile_Success(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()

	mock.ExpectQuery("SELECT EXISTS").
		WithArgs("recipient123").
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))

	mock.ExpectExec("INSERT INTO received_files").
		WithArgs("recipient123", "sender456", "file789", sqlmock.AnyArg(), "metadata-json").
		WillReturnResult(sqlmock.NewResult(1, 1))

	err := metadata.InsertReceivedFile(db, "recipient123", "sender456", "file789", "metadata-json", time.Now())
	assert.NoError(t, err)
}

func TestInsertReceivedFile_RecipientCheckError(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()

	mock.ExpectQuery("SELECT EXISTS").
		WithArgs("recipient123").
		WillReturnError(errors.New("query error"))

	err := metadata.InsertReceivedFile(db, "recipient123", "sender456", "file789", "metadata-json", time.Now())
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to check recipient existence")
}

func TestInsertReceivedFile_RecipientDoesNotExist(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()

	mock.ExpectQuery("SELECT EXISTS").
		WithArgs("recipient123").
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(false))

	err := metadata.InsertReceivedFile(db, "recipient123", "sender456", "file789", "metadata-json", time.Now())
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "does not exist")
}

func TestInsertReceivedFile_InsertFails(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()

	mock.ExpectQuery("SELECT EXISTS").
		WithArgs("recipient123").
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))

	mock.ExpectExec("INSERT INTO received_files").
		WithArgs("recipient123", "sender456", "file789", sqlmock.AnyArg(), "metadata-json").
		WillReturnError(errors.New("insert failed"))

	err := metadata.InsertReceivedFile(db, "recipient123", "sender456", "file789", "metadata-json", time.Now())
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to insert received file")
}

//==========Test insert sent files ==============
func TestInsertSentFile_Success(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()

	mock.ExpectExec("INSERT INTO sent_files").
		WithArgs("sender123", "recipient456", "file789", "encryptedKey", "ephemeralPubKey").
		WillReturnResult(sqlmock.NewResult(1, 1))

	err := metadata.InsertSentFile(db, "sender123", "recipient456", "file789", "encryptedKey", "ephemeralPubKey")
	assert.NoError(t, err)
}

func TestInsertSentFile_DBError(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()

	mock.ExpectExec("INSERT INTO sent_files").
		WithArgs("sender123", "recipient456", "file789", "encryptedKey", "ephemeralPubKey").
		WillReturnError(errors.New("insert failed"))

	err := metadata.InsertSentFile(db, "sender123", "recipient456", "file789", "encryptedKey", "ephemeralPubKey")
	assert.Error(t, err)
	assert.Equal(t, "insert failed", err.Error())
}

//============ Test Add tags handler =========
func TestAddTagsHandler_Success(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	metadata.DB = db

	mock.ExpectExec("UPDATE files").
		WithArgs(pq.Array([]string{"tag1", "tag2"}), "file123").
		WillReturnResult(sqlmock.NewResult(1, 1))

	payload := map[string]interface{}{
		"fileId": "file123",
		"tags":   []string{"tag1", "tag2"},
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	metadata.AddTagsHandler(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	assert.Equal(t, "Tags added successfully", resp["message"])
}

func TestAddTagsHandler_InvalidJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader("invalid json"))
	w := httptest.NewRecorder()

	metadata.AddTagsHandler(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestAddTagsHandler_MissingFields(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"fileId": "", "tags": []}`))
	w := httptest.NewRecorder()

	metadata.AddTagsHandler(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestAddTagsHandler_DBError(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	metadata.DB = db

	mock.ExpectExec("UPDATE files").
		WithArgs(pq.Array([]string{"tag1"}), "file123").
		WillReturnError(errors.New("update failed"))

	payload := map[string]interface{}{
		"fileId": "file123",
		"tags":   []string{"tag1"},
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	metadata.AddTagsHandler(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

// ============== Test add user handler ===========
func TestAddUserHandler_Success(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	metadata.DB = db

	mock.ExpectExec("INSERT INTO users").
		WithArgs("user123").
		WillReturnResult(sqlmock.NewResult(1, 1))

	body := []byte(`{"userId":"user123"}`)
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	metadata.AddUserHandler(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	assert.Equal(t, "User added successfully", resp["message"])
}

func TestAddUserHandler_InvalidJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader("{invalid json}"))
	w := httptest.NewRecorder()

	metadata.AddUserHandler(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestAddUserHandler_MissingUserID(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"userId": ""}`))
	w := httptest.NewRecorder()

	metadata.AddUserHandler(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestAddUserHandler_DBError(t *testing.T) {
	db, mock, _ := sqlmock.New()
	defer db.Close()
	metadata.DB = db

	mock.ExpectExec("INSERT INTO users").
		WithArgs("user123").
		WillReturnError(errors.New("insert error"))

	body := []byte(`{"userId":"user123"}`)
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	metadata.AddUserHandler(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}