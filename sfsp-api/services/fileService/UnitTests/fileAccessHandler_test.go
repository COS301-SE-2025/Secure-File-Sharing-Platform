package unitTests

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"net/http/httptest"
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

func TestSimple(t *testing.T) {
	assert.True(t, true, "This should always pass")
}

func TestAddAccesslogHandler(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock database: %v", err)
	}
	defer func() {
		if err := db.Close(); err != nil {
			log.Println("error closing db:", err)
		}
	}()

	fileHandler.DB = db

	t.Run("Success", func(t *testing.T) {
		reqBody := map[string]string{
			"file_id": "file123",
			"user_id": "user456",
			"action":  "download",
			"message": "File downloaded successfully",
		}
		body, _ := json.Marshal(reqBody)

		mock.ExpectExec("INSERT INTO access_logs").
			WithArgs(reqBody["file_id"], reqBody["user_id"], reqBody["action"], reqBody["message"]).
			WillReturnResult(sqlmock.NewResult(1, 1))

		req := httptest.NewRequest(http.MethodPost, "/addAccesslog", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		fileHandler.AddAccesslogHandler(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)

		var resp map[string]string
		err := json.NewDecoder(w.Body).Decode(&resp)
		assert.NoError(t, err)
		assert.Equal(t, "Access log added successfully", resp["message"])

		assert.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("Invalid JSON payload", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/addAccesslog", bytes.NewBuffer([]byte("invalid json")))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		fileHandler.AddAccesslogHandler(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Missing required fields", func(t *testing.T) {
		reqBody := map[string]string{
			"file_id": "file123",
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest(http.MethodPost, "/addAccesslog", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		fileHandler.AddAccesslogHandler(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Database error", func(t *testing.T) {
		reqBody := map[string]string{
			"file_id": "file123",
			"user_id": "user456",
			"action":  "download",
			"message": "File downloaded successfully",
		}
		body, _ := json.Marshal(reqBody)
		mock.ExpectExec("INSERT INTO access_logs").
			WithArgs(reqBody["file_id"], reqBody["user_id"], reqBody["action"], reqBody["message"]).
			WillReturnError(sql.ErrConnDone)

		req := httptest.NewRequest(http.MethodPost, "/addAccesslog", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		fileHandler.AddAccesslogHandler(w, req)
		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.NoError(t, mock.ExpectationsWereMet())
	})
}

func TestGetAccesslogHandler(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock database: %v", err)
	}
	defer func() {
		if err := db.Close(); err != nil {
			log.Println("error closing db:", err)
		}
	}()
	fileHandler.DB = db

	t.Run("Get logs with file_id filter", func(t *testing.T) {
		fileID := "file123"
		rows := sqlmock.NewRows([]string{"id", "file_id", "user_id", "action", "message", "timestamp"}).
			AddRow("1", fileID, "user456", "download", "File downloaded", "2025-06-25T10:00:00Z").
			AddRow("2", fileID, "user789", "view", "File viewed", "2025-06-25T11:00:00Z")

		mock.ExpectQuery("SELECT id, file_id, user_id, action, message, timestamp FROM access_logs WHERE file_id").
			WithArgs(fileID).
			WillReturnRows(rows)

		req := httptest.NewRequest(http.MethodGet, "/getAccesslog?file_id="+fileID, nil)
		w := httptest.NewRecorder()

		fileHandler.GetAccesslogHandler(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		var logs []map[string]interface{}
		err := json.NewDecoder(w.Body).Decode(&logs)
		assert.NoError(t, err)
		assert.Len(t, logs, 2)
		assert.Equal(t, fileID, logs[0]["file_id"])
		assert.Equal(t, "download", logs[0]["action"])

		assert.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("Get all logs", func(t *testing.T) {
		rows := sqlmock.NewRows([]string{"id", "file_id", "user_id", "action", "message", "timestamp"}).
			AddRow("1", "file123", "user456", "download", "File downloaded", "2025-06-25T10:00:00Z").
			AddRow("2", "file456", "user789", "view", "File viewed", "2025-06-25T11:00:00Z")

		mock.ExpectQuery("SELECT id, file_id, user_id, action, message, timestamp FROM access_logs ORDER BY").
			WillReturnRows(rows)

		req := httptest.NewRequest(http.MethodGet, "/getAccesslog", nil)
		w := httptest.NewRecorder()

		fileHandler.GetAccesslogHandler(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		var logs []map[string]interface{}
		err := json.NewDecoder(w.Body).Decode(&logs)
		assert.NoError(t, err)
		assert.Len(t, logs, 2)
		assert.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("Database error", func(t *testing.T) {
		mock.ExpectQuery("SELECT id, file_id, user_id, action, message, timestamp FROM access_logs ORDER BY").
			WillReturnError(sql.ErrConnDone)

		req := httptest.NewRequest(http.MethodGet, "/getAccesslog", nil)
		w := httptest.NewRecorder()
		fileHandler.GetAccesslogHandler(w, req)
		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.NoError(t, mock.ExpectationsWereMet())
	})
}
