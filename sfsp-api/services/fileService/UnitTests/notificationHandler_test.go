package unitTests

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/joho/godotenv"
	"github.com/stretchr/testify/assert"

	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
)

func init() {
	err := godotenv.Load("../.env")
	if err != nil {
		log.Println("Warning: Error loading .env file")
	}
}

func TestSimpleNotification(t *testing.T) {
	assert.True(t, true, "This should always pass")
}

func TestNotificationHandler(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock database: %v", err)
	}
	defer db.Close()

	originalDB := fileHandler.DB
	fileHandler.DB = db
	defer func() { fileHandler.DB = originalDB }()

	t.Run("Success", func(t *testing.T) {
		userID := "user123"
		req := httptest.NewRequest(http.MethodGet, "/notifications?id="+userID, nil)
		w := httptest.NewRecorder()

		rows := sqlmock.NewRows([]string{"id", "type", "from", "to", "file_name", "file_id", "message", "timestamp", "status", "read"}).
			AddRow("notif1", "share", "user456", userID, "document.pdf", "file123", "Shared a file with you", "2025-06-25T10:00:00Z", "pending", false).
			AddRow("notif2", "access", "user789", userID, "image.jpg", "file456", "Accessed your file", "2025-06-25T11:00:00Z", "completed", true)

		mock.ExpectQuery(regexp.QuoteMeta(`SELECT id, type, "from", "to", file_name, file_id, message, timestamp, status, read 
		FROM notifications WHERE "to" = $1`)).
			WithArgs(userID).
			WillReturnRows(rows)

		fileHandler.NotificationHandler(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		var resp map[string]interface{}
		err := json.NewDecoder(w.Body).Decode(&resp)
		assert.NoError(t, err)
		assert.Equal(t, true, resp["success"])

		notifications, ok := resp["notifications"].([]interface{})
		assert.True(t, ok)
		assert.Len(t, notifications, 2)

		assert.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("Method not allowed", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/notifications?id=user123", nil)
		w := httptest.NewRecorder()

		fileHandler.NotificationHandler(w, req)
		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)

		var resp map[string]interface{}
		err := json.NewDecoder(w.Body).Decode(&resp)
		assert.NoError(t, err)
		assert.Equal(t, false, resp["success"])
		assert.Equal(t, "Method not allowed", resp["error"])
	})

	t.Run("Missing user ID", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/notifications", nil)
		w := httptest.NewRecorder()

		fileHandler.NotificationHandler(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)

		var resp map[string]interface{}
		err := json.NewDecoder(w.Body).Decode(&resp)
		assert.NoError(t, err)
		assert.Equal(t, false, resp["success"])
		assert.Equal(t, "Missing user ID", resp["error"])
	})

	t.Run("Database error", func(t *testing.T) {
		userID := "user123"
		req := httptest.NewRequest(http.MethodGet, "/notifications?id="+userID, nil)
		w := httptest.NewRecorder()

		mock.ExpectQuery(regexp.QuoteMeta(`SELECT id, type, "from", "to", file_name, file_id, message, timestamp, status, read 
		FROM notifications WHERE "to" = $1`)).
			WithArgs(userID).
			WillReturnError(sqlmock.ErrCancelled)

		fileHandler.NotificationHandler(w, req)
		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.NoError(t, mock.ExpectationsWereMet())
	})
}

func TestMarkAsReadHandler(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock database: %v", err)
	}
	defer db.Close()

	originalDB := fileHandler.DB
	fileHandler.DB = db
	defer func() { fileHandler.DB = originalDB }()

	t.Run("Success", func(t *testing.T) {
		reqBody := map[string]string{
			"id": "notification123",
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest(http.MethodPost, "/notifications/markAsRead", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		mock.ExpectExec("UPDATE notifications SET read = TRUE WHERE id = \\$1").
			WithArgs(reqBody["id"]).
			WillReturnResult(sqlmock.NewResult(0, 1))

		fileHandler.MarkAsReadHandler(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp map[string]interface{}
		err := json.NewDecoder(w.Body).Decode(&resp)
		assert.NoError(t, err)
		assert.Equal(t, true, resp["success"])
		assert.Equal(t, "Notification marked as read", resp["message"])
		assert.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("Method not allowed", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/notifications/markAsRead", nil)
		w := httptest.NewRecorder()

		fileHandler.MarkAsReadHandler(w, req)
		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
	})

	t.Run("Invalid JSON payload", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/notifications/markAsRead", bytes.NewBuffer([]byte("invalid json")))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		fileHandler.MarkAsReadHandler(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Missing notification ID", func(t *testing.T) {
		reqBody := map[string]string{
			"id": "",
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest(http.MethodPost, "/notifications/markAsRead", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		fileHandler.MarkAsReadHandler(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Notification not found", func(t *testing.T) {
		reqBody := map[string]string{
			"id": "nonexistent",
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest(http.MethodPost, "/notifications/markAsRead", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		mock.ExpectExec("UPDATE notifications SET read = TRUE WHERE id = \\$1").
			WithArgs(reqBody["id"]).
			WillReturnResult(sqlmock.NewResult(0, 0))

		fileHandler.MarkAsReadHandler(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)

		assert.NoError(t, mock.ExpectationsWereMet())
	})
}

func TestRespondToShareRequestHandler(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock database: %v", err)
	}
	defer db.Close()

	originalDB := fileHandler.DB
	fileHandler.DB = db
	defer func() { fileHandler.DB = originalDB }()

	t.Run("Success - Accept", func(t *testing.T) {
		reqBody := map[string]string{
			"id":     "notification123",
			"status": "accepted",
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest(http.MethodPost, "/notifications/respond", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		mock.ExpectExec("UPDATE notifications SET status = \\$1, read = TRUE WHERE id = \\$2").
			WithArgs(reqBody["status"], reqBody["id"]).
			WillReturnResult(sqlmock.NewResult(0, 1))

		fileHandler.RespondToShareRequestHandler(w, req)
		assert.Equal(t, http.StatusOK, w.Code)
		assert.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("Success - Decline", func(t *testing.T) {
		reqBody := map[string]string{
			"id":     "notification123",
			"status": "declined",
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest(http.MethodPost, "/notifications/respond", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		mock.ExpectExec("UPDATE notifications SET status = \\$1, read = TRUE WHERE id = \\$2").
			WithArgs(reqBody["status"], reqBody["id"]).
			WillReturnResult(sqlmock.NewResult(0, 1))

		fileHandler.RespondToShareRequestHandler(w, req)
		assert.Equal(t, http.StatusOK, w.Code)
		assert.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("Invalid status", func(t *testing.T) {
		reqBody := map[string]string{
			"id":     "notification123",
			"status": "invalid",
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest(http.MethodPost, "/notifications/respond", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		fileHandler.RespondToShareRequestHandler(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Notification not found", func(t *testing.T) {
		reqBody := map[string]string{
			"id":     "nonexistent",
			"status": "accepted",
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest(http.MethodPost, "/notifications/respond", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		mock.ExpectExec("UPDATE notifications SET status = \\$1, read = TRUE WHERE id = \\$2").
			WithArgs(reqBody["status"], reqBody["id"]).
			WillReturnResult(sqlmock.NewResult(0, 0))

		fileHandler.RespondToShareRequestHandler(w, req)
		assert.Equal(t, http.StatusNotFound, w.Code)
		assert.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("Database error", func(t *testing.T) {
		reqBody := map[string]string{
			"id":     "notification123",
			"status": "accepted",
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest(http.MethodPost, "/notifications/respond", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		mock.ExpectExec("UPDATE notifications SET status = \\$1, read = TRUE WHERE id = \\$2").
			WithArgs(reqBody["status"], reqBody["id"]).
			WillReturnError(sqlmock.ErrCancelled)

		fileHandler.RespondToShareRequestHandler(w, req)
		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.NoError(t, mock.ExpectationsWereMet())
	})
}
