package unitTests

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	fh "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
)

// --- Tests for NotificationHandler ---

func TestNotificationHandler_Success(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	userID := "user-123"
	
	rows := sqlmock.NewRows([]string{"id", "type", "from", "to", "file_name", "file_id", "message", "timestamp", "status", "read"}).
		AddRow("notif-1", "share_request", "sender-1", "user-123", "document.pdf", "file-1", "File shared with you", time.Now(), "pending", false).
		AddRow("notif-2", "file_received", "sender-2", "user-123", "image.jpg", "file-2", "File received", time.Now(), "accepted", true)

	mock.ExpectQuery(`SELECT id, type, "from", "to", file_name, file_id, message, timestamp, status, read FROM notifications WHERE "to" = \$1`).
		WithArgs(userID).
		WillReturnRows(rows)

	req := httptest.NewRequest(http.MethodGet, "/notifications?id="+userID, nil)
	rr := httptest.NewRecorder()

	fh.NotificationHandler(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)

	var response map[string]interface{}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))
	assert.True(t, response["success"].(bool))
	assert.Len(t, response["notifications"], 2)

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestNotificationHandler_WrongMethod(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodPost, "/notifications", nil)
	rr := httptest.NewRecorder()

	fh.NotificationHandler(rr, req)

	require.Equal(t, http.StatusMethodNotAllowed, rr.Code)

	var response map[string]interface{}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))
	assert.False(t, response["success"].(bool))
	assert.Equal(t, "Method not allowed", response["error"])
}

func TestNotificationHandler_MissingUserID(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodGet, "/notifications", nil)
	rr := httptest.NewRecorder()

	fh.NotificationHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)

	var response map[string]interface{}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))
	assert.False(t, response["success"].(bool))
	assert.Equal(t, "Missing user ID", response["error"])
}

func TestNotificationHandler_DBError(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	userID := "user-123"

	mock.ExpectQuery(`SELECT id, type, "from", "to", file_name, file_id, message, timestamp, status, read FROM notifications WHERE "to" = \$1`).
		WithArgs(userID).
		WillReturnError(sql.ErrConnDone)

	req := httptest.NewRequest(http.MethodGet, "/notifications?id="+userID, nil)
	rr := httptest.NewRecorder()

	fh.NotificationHandler(rr, req)

	require.Equal(t, http.StatusInternalServerError, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestNotificationHandler_EmptyResult(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	userID := "user-123"
	
	rows := sqlmock.NewRows([]string{"id", "type", "from", "to", "file_name", "file_id", "message", "timestamp", "status", "read"})

	mock.ExpectQuery(`SELECT id, type, "from", "to", file_name, file_id, message, timestamp, status, read FROM notifications WHERE "to" = \$1`).
		WithArgs(userID).
		WillReturnRows(rows)

	req := httptest.NewRequest(http.MethodGet, "/notifications?id="+userID, nil)
	rr := httptest.NewRecorder()

	fh.NotificationHandler(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)

	var response map[string]interface{}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))
	assert.True(t, response["success"].(bool))
	assert.Len(t, response["notifications"], 0)

	require.NoError(t, mock.ExpectationsWereMet())
}

// --- Tests for MarkAsReadHandler ---

func TestMarkAsReadHandler_Success(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	notificationID := "notif-123"

	mock.ExpectExec("UPDATE notifications SET read = TRUE WHERE id = \\$1").
		WithArgs(notificationID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	body := map[string]string{"id": notificationID}
	req := NewJSONRequest(t, http.MethodPost, "/notifications/mark-read", body)
	rr := httptest.NewRecorder()

	fh.MarkAsReadHandler(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)

	var response map[string]interface{}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))
	assert.True(t, response["success"].(bool))
	assert.Equal(t, "Notification marked as read", response["message"])

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestMarkAsReadHandler_WrongMethod(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodGet, "/notifications/mark-read", nil)
	rr := httptest.NewRecorder()

	fh.MarkAsReadHandler(rr, req)

	require.Equal(t, http.StatusMethodNotAllowed, rr.Code)
}

func TestMarkAsReadHandler_BadJSON(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodPost, "/notifications/mark-read", strings.NewReader("{bad json"))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	fh.MarkAsReadHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestMarkAsReadHandler_MissingID(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	body := map[string]string{"id": ""}
	req := NewJSONRequest(t, http.MethodPost, "/notifications/mark-read", body)
	rr := httptest.NewRecorder()

	fh.MarkAsReadHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)

	var response map[string]interface{}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))
	assert.Equal(t, "Missing notification ID", response["error"])
}

func TestMarkAsReadHandler_NotificationNotFound(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	notificationID := "nonexistent"

	mock.ExpectExec("UPDATE notifications SET read = TRUE WHERE id = \\$1").
		WithArgs(notificationID).
		WillReturnResult(sqlmock.NewResult(0, 0)) // 0 rows affected

	body := map[string]string{"id": notificationID}
	req := NewJSONRequest(t, http.MethodPost, "/notifications/mark-read", body)
	rr := httptest.NewRecorder()

	fh.MarkAsReadHandler(rr, req)

	require.Equal(t, http.StatusNotFound, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestMarkAsReadHandler_DBError(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	notificationID := "notif-123"

	mock.ExpectExec("UPDATE notifications SET read = TRUE WHERE id = \\$1").
		WithArgs(notificationID).
		WillReturnError(sql.ErrConnDone)

	body := map[string]string{"id": notificationID}
	req := NewJSONRequest(t, http.MethodPost, "/notifications/mark-read", body)
	rr := httptest.NewRecorder()

	fh.MarkAsReadHandler(rr, req)

	require.Equal(t, http.StatusInternalServerError, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

// --- Tests for RespondToShareRequestHandler ---

func TestRespondToShareRequestHandler_AcceptedWithReceivedFile(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	notificationID := "notif-123"
	status := "accepted"

	// Mock the status update
	mock.ExpectExec("UPDATE notifications SET status = \\$1, read = TRUE WHERE id = \\$2").
		WithArgs(status, notificationID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	// Mock fetching notification info
	notifRows := sqlmock.NewRows([]string{"file_id", "from", "to", "received_file_id"}).
		AddRow("file-123", "sender-1", "recipient-1", "received-456")

	mock.ExpectQuery(`SELECT n\.file_id, n\."from", n\."to", n\."received_file_id" FROM notifications n WHERE n\.id = \$1`).
		WithArgs(notificationID).
		WillReturnRows(notifRows)

	// Mock fetching received file metadata
	metadataRows := sqlmock.NewRows([]string{"metadata"}).
		AddRow(`{"key": "encrypted_key"}`)

	mock.ExpectQuery(`SELECT metadata FROM received_files WHERE file_id = \$1 AND recipient_id = \$2 AND id = \$3`).
		WithArgs("file-123", "recipient-1", "received-456").
		WillReturnRows(metadataRows)

	// Mock fetching file details
	fileRows := sqlmock.NewRows([]string{"file_name", "file_type", "cid", "file_size"}).
		AddRow("document.pdf", "application/pdf", "QmTest123", int64(1024))

	mock.ExpectQuery(`SELECT file_name, file_type, cid, file_size FROM files WHERE id = \$1`).
		WithArgs("file-123").
		WillReturnRows(fileRows)

	body := map[string]string{"id": notificationID, "status": status}
	req := NewJSONRequest(t, http.MethodPost, "/notifications/respond", body)
	rr := httptest.NewRecorder()

	fh.RespondToShareRequestHandler(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)

	var response map[string]interface{}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))
	assert.True(t, response["success"].(bool))
	assert.Contains(t, response, "fileData")

	fileData := response["fileData"].(map[string]interface{})
	assert.Equal(t, "file-123", fileData["file_id"])
	assert.Equal(t, "document.pdf", fileData["file_name"])
	assert.False(t, fileData["viewOnly"].(bool))

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRespondToShareRequestHandler_AcceptedViewOnly(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	notificationID := "notif-123"
	status := "accepted"

	// Mock the status update
	mock.ExpectExec("UPDATE notifications SET status = \\$1, read = TRUE WHERE id = \\$2").
		WithArgs(status, notificationID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	// Mock fetching notification info (no received_file_id)
	notifRows := sqlmock.NewRows([]string{"file_id", "from", "to", "received_file_id"}).
		AddRow("file-123", "sender-1", "recipient-1", sql.NullString{Valid: false})

	mock.ExpectQuery(`SELECT n\.file_id, n\."from", n\."to", n\."received_file_id" FROM notifications n WHERE n\.id = \$1`).
		WithArgs(notificationID).
		WillReturnRows(notifRows)

	// Mock fetching view-only metadata
	metadataRows := sqlmock.NewRows([]string{"metadata"}).
		AddRow(`{"view_key": "view_encrypted_key"}`)

	mock.ExpectQuery(`SELECT metadata FROM shared_files_view WHERE sender_id = \$1 AND recipient_id = \$2 AND file_id = \$3`).
		WithArgs("sender-1", "recipient-1", "file-123").
		WillReturnRows(metadataRows)

	// Mock fetching file details
	fileRows := sqlmock.NewRows([]string{"file_name", "file_type", "cid", "file_size"}).
		AddRow("document.pdf", "application/pdf", "QmTest123", int64(1024))

	mock.ExpectQuery(`SELECT file_name, file_type, cid, file_size FROM files WHERE id = \$1`).
		WithArgs("file-123").
		WillReturnRows(fileRows)

	body := map[string]string{"id": notificationID, "status": status}
	req := NewJSONRequest(t, http.MethodPost, "/notifications/respond", body)
	rr := httptest.NewRecorder()

	fh.RespondToShareRequestHandler(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)

	var response map[string]interface{}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))
	assert.True(t, response["success"].(bool))

	fileData := response["fileData"].(map[string]interface{})
	assert.True(t, fileData["viewOnly"].(bool))

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRespondToShareRequestHandler_DeclinedStatus(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	notificationID := "notif-123"
	status := "declined"

	mock.ExpectExec("UPDATE notifications SET status = \\$1, read = TRUE WHERE id = \\$2").
		WithArgs(status, notificationID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	body := map[string]string{"id": notificationID, "status": status}
	req := NewJSONRequest(t, http.MethodPost, "/notifications/respond", body)
	rr := httptest.NewRecorder()

	fh.RespondToShareRequestHandler(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRespondToShareRequestHandler_WrongMethod(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodGet, "/notifications/respond", nil)
	rr := httptest.NewRecorder()

	fh.RespondToShareRequestHandler(rr, req)

	require.Equal(t, http.StatusMethodNotAllowed, rr.Code)
}

func TestRespondToShareRequestHandler_InvalidStatus(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	body := map[string]string{"id": "notif-123", "status": "invalid"}
	req := NewJSONRequest(t, http.MethodPost, "/notifications/respond", body)
	rr := httptest.NewRecorder()

	fh.RespondToShareRequestHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)

	var response map[string]interface{}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))
	assert.Contains(t, response["error"], "Invalid status")
}

func TestRespondToShareRequestHandler_MissingFields(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	body := map[string]string{"id": "", "status": "accepted"}
	req := NewJSONRequest(t, http.MethodPost, "/notifications/respond", body)
	rr := httptest.NewRecorder()

	fh.RespondToShareRequestHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)

	var response map[string]interface{}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))
	assert.Equal(t, "Missing ID or status", response["error"])
}

func TestRespondToShareRequestHandler_NotificationNotFound(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	notificationID := "nonexistent"
	status := "accepted"

	mock.ExpectExec("UPDATE notifications SET status = \\$1, read = TRUE WHERE id = \\$2").
		WithArgs(status, notificationID).
		WillReturnResult(sqlmock.NewResult(0, 0)) // 0 rows affected

	body := map[string]string{"id": notificationID, "status": status}
	req := NewJSONRequest(t, http.MethodPost, "/notifications/respond", body)
	rr := httptest.NewRecorder()

	fh.RespondToShareRequestHandler(rr, req)

	require.Equal(t, http.StatusNotFound, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

// --- Tests for ClearNotificationHandler ---

func TestClearNotificationHandler_Success(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	notificationID := "notif-123"

	mock.ExpectExec("DELETE FROM notifications WHERE id = \\$1").
		WithArgs(notificationID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	body := map[string]string{"id": notificationID}
	req := NewJSONRequest(t, http.MethodPost, "/notifications/clear", body)
	rr := httptest.NewRecorder()

	fh.ClearNotificationHandler(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)

	var response map[string]interface{}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))
	assert.True(t, response["success"].(bool))
	assert.Equal(t, "Notification deleted", response["message"])

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestClearNotificationHandler_NotificationNotFound(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	notificationID := "nonexistent"

	mock.ExpectExec("DELETE FROM notifications WHERE id = \\$1").
		WithArgs(notificationID).
		WillReturnResult(sqlmock.NewResult(0, 0)) // 0 rows affected

	body := map[string]string{"id": notificationID}
	req := NewJSONRequest(t, http.MethodPost, "/notifications/clear", body)
	rr := httptest.NewRecorder()

	fh.ClearNotificationHandler(rr, req)

	require.Equal(t, http.StatusNotFound, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestClearNotificationHandler_WrongMethod(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodGet, "/notifications/clear", nil)
	rr := httptest.NewRecorder()

	fh.ClearNotificationHandler(rr, req)

	require.Equal(t, http.StatusMethodNotAllowed, rr.Code)
}

func TestClearNotificationHandler_MissingID(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	body := map[string]string{"id": ""}
	req := NewJSONRequest(t, http.MethodPost, "/notifications/clear", body)
	rr := httptest.NewRecorder()

	fh.ClearNotificationHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)
}

// --- Tests for AddNotificationHandler ---

func TestAddNotificationHandler_SuccessWithReceivedFileID(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	notification := map[string]interface{}{
		"type":           "share_request",
		"from":           "sender-1",
		"to":             "recipient-1",
		"file_name":      "document.pdf",
		"file_id":        "file-123",
		"message":        "File shared with you",
		"receivedFileID": "received-456",
		"viewOnly":       false,
	}

	rows := sqlmock.NewRows([]string{"id"}).AddRow("new-notif-123")

	mock.ExpectQuery(`INSERT INTO notifications \(type, "from", "to", file_name, file_id, received_file_id, message, status\) VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7, 'pending'\) RETURNING id`).
		WithArgs("share_request", "sender-1", "recipient-1", "document.pdf", "file-123", "received-456", "File shared with you").
		WillReturnRows(rows)

	req := NewJSONRequest(t, http.MethodPost, "/notifications/add", notification)
	rr := httptest.NewRecorder()

	fh.AddNotificationHandler(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)

	var response map[string]interface{}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))
	assert.True(t, response["success"].(bool))
	assert.Equal(t, "new-notif-123", response["id"])

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestAddNotificationHandler_SuccessViewOnly(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	notification := map[string]interface{}{
		"type":      "share_request",
		"from":      "sender-1",
		"to":        "recipient-1",
		"file_name": "document.pdf",
		"file_id":   "file-123",
		"message":   "View-only file shared",
		"viewOnly":  true,
	}

	rows := sqlmock.NewRows([]string{"id"}).AddRow("new-notif-456")

	mock.ExpectQuery(`INSERT INTO notifications \(type, "from", "to", file_name, file_id, message, status\) VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, 'pending'\) RETURNING id`).
		WithArgs("share_request", "sender-1", "recipient-1", "document.pdf", "file-123", "View-only file shared").
		WillReturnRows(rows)

	req := NewJSONRequest(t, http.MethodPost, "/notifications/add", notification)
	rr := httptest.NewRecorder()

	fh.AddNotificationHandler(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)

	var response map[string]interface{}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))
	assert.True(t, response["success"].(bool))
	assert.Equal(t, "new-notif-456", response["id"])

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestAddNotificationHandler_WrongMethod(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodGet, "/notifications/add", nil)
	rr := httptest.NewRecorder()

	fh.AddNotificationHandler(rr, req)

	require.Equal(t, http.StatusMethodNotAllowed, rr.Code)
}

func TestAddNotificationHandler_MissingRequiredFields(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	notification := map[string]interface{}{
		"type": "share_request",
		"from": "",  // missing
		"to":   "recipient-1",
		// other required fields missing
	}

	req := NewJSONRequest(t, http.MethodPost, "/notifications/add", notification)
	rr := httptest.NewRecorder()

	fh.AddNotificationHandler(rr, req)

	require.Equal(t, http.StatusBadRequest, rr.Code)

	var response map[string]interface{}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))
	assert.Equal(t, "Missing required fields", response["error"])
}

func TestAddNotificationHandler_DBError(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	notification := map[string]interface{}{
		"type":      "share_request",
		"from":      "sender-1",
		"to":        "recipient-1",
		"file_name": "document.pdf",
		"file_id":   "file-123",
		"message":   "File shared",
		"viewOnly":  true,
	}

	mock.ExpectQuery(`INSERT INTO notifications`).
		WillReturnError(sql.ErrConnDone)

	req := NewJSONRequest(t, http.MethodPost, "/notifications/add", notification)
	rr := httptest.NewRecorder()

	fh.AddNotificationHandler(rr, req)

	require.Equal(t, http.StatusInternalServerError, rr.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

// --- Table-driven tests for status validation ---

func TestValidStatusValues(t *testing.T) {
	tests := []struct {
		name   string
		status string
		valid  bool
	}{
		{"Valid accepted", "accepted", true},
		{"Valid declined", "declined", true},
		{"Valid pending", "pending", true},
		{"Invalid status", "invalid", false},
		{"Empty status", "", false},
		{"Case sensitive", "ACCEPTED", false},
	}

	mockDB, cleanup := SetupMockDB(t)
	defer cleanup()

	// Set up expectations for all valid status updates
	for _, tt := range tests {
		if tt.valid {
			mockDB.ExpectExec("UPDATE notifications SET status = \\$1, read = TRUE WHERE id = \\$2").
				WithArgs(tt.status, "notif-123").
				WillReturnResult(sqlmock.NewResult(1, 1))
		}
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body := map[string]string{"id": "notif-123", "status": tt.status}
			req := NewJSONRequest(t, http.MethodPost, "/notifications/respond", body)
			rr := httptest.NewRecorder()

			fh.RespondToShareRequestHandler(rr, req)

			if tt.valid {
				assert.NotEqual(t, http.StatusBadRequest, rr.Code)
			} else {
				assert.Equal(t, http.StatusBadRequest, rr.Code)
			}
		})
	}
}