package unitTests

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/joho/godotenv"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/crypto"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)

// MockWebDavClient is a mock implementation of the WebDavClient interface
type MockWebDavClient struct {
	mock.Mock
}

func (m *MockWebDavClient) MkdirAll(path string, perm os.FileMode) error {
	args := m.Called(path, perm)
	return args.Error(0)
}

func (m *MockWebDavClient) Write(name string, data []byte, perm os.FileMode) error {
	args := m.Called(name, data, perm)
	return args.Error(0)
}

func (m *MockWebDavClient) Read(name string) ([]byte, error) {
	args := m.Called(name)
	return args.Get(0).([]byte), args.Error(1)
}

func (m *MockWebDavClient) Remove(path string) error {
	args := m.Called(path)
	return args.Error(0)
}

func TestUploadHandler(t *testing.T) {
	// Load .env file
	err := godotenv.Load("../.env")
	if err != nil {
		log.Println("Warning: Error loading .env file")
	}

	// Set up mock database and OwnCloud client
	db, mockDB, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Failed to create mock database: %v", err)
	}
	defer db.Close()

	mockClient := &MockWebDavClient{}
	originalClient := owncloud.GetClient()
	owncloud.SetClient(mockClient)
	defer func() { owncloud.SetClient(originalClient) }()

	// Set database client
	fileHandler.SetPostgreClient(db)

	// Set AES key for encryption
	os.Setenv("AES_KEY", "12345678901234567890123456789012") // 32-byte key
	defer os.Unsetenv("AES_KEY")

	t.Run("Success", func(t *testing.T) {
		reqBody := fileHandler.UploadRequest{
			FileName:    "testfile.txt",
			FileType:    "text/plain",
			UserID:      "user123",
			Nonce:       "nonce123",
			Description: "Test file",
			Tags:        []string{"tag1", "tag2"},
			Path:        "files/user123",
			FileContent: base64.StdEncoding.EncodeToString([]byte("test data")),
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest(http.MethodPost, "/upload", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		// Mock database queries
		mockDB.ExpectExec(regexp.QuoteMeta(`
            INSERT INTO users (id)
            SELECT $1
            WHERE NOT EXISTS (
            SELECT 1 FROM users WHERE id = $1
            )`)).
			WithArgs(reqBody.UserID).
			WillReturnResult(sqlmock.NewResult(0, 1))

		mockDB.ExpectQuery(regexp.QuoteMeta(`
            INSERT INTO files (
                owner_id, file_name, file_type, file_size, cid, nonce, description, tags, created_at
            )
            VALUES ($1, $2, $3, $4, '', $5, $6, $7, $8)
            RETURNING id`)).
			WithArgs(
				reqBody.UserID,
				reqBody.FileName,
				reqBody.FileType,
				9, // len("test data")
				reqBody.Nonce,
				reqBody.Description,
				sqlmock.AnyArg(), // tags (pq.Array)
				sqlmock.AnyArg(), // created_at (time.Now())
			).
			WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow("file123"))

		// Mock OwnCloud upload
		mockClient.On("MkdirAll", reqBody.Path, os.FileMode(0755)).Return(nil)
		mockClient.On("Write", reqBody.Path+"/file123", mock.Anything, os.FileMode(0644)).Return(nil)

		// Mock CID update
		mockDB.ExpectExec(regexp.QuoteMeta(`UPDATE files SET cid = $1 WHERE id = $2`)).
			WithArgs(reqBody.Path+"/file123", "file123").
			WillReturnResult(sqlmock.NewResult(0, 1))

		fileHandler.UploadHandler(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		var resp map[string]string
		err := json.NewDecoder(w.Body).Decode(&resp)
		assert.NoError(t, err)
		assert.Equal(t, "File uploaded and metadata stored", resp["message"])
		assert.Equal(t, "file123", resp["fileId"])
		assert.NoError(t, mockDB.ExpectationsWereMet())
		mockClient.AssertExpectations(t)
	})

	t.Run("Invalid JSON payload", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/upload", bytes.NewBuffer([]byte("invalid json")))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		fileHandler.UploadHandler(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "Invalid JSON payload")
	})

	t.Run("Missing required fields", func(t *testing.T) {
		reqBody := fileHandler.UploadRequest{
			FileName: "",
			UserID:   "user123",
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest(http.MethodPost, "/upload", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		fileHandler.UploadHandler(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "Missing required fields")
	})

	t.Run("Invalid base64 file content", func(t *testing.T) {
		reqBody := fileHandler.UploadRequest{
			FileName:    "testfile.txt",
			FileType:    "text/plain",
			UserID:      "user123",
			Nonce:       "nonce123",
			Description: "Test file",
			Tags:        []string{"tag1", "tag2"},
			Path:        "files/user123",
			FileContent: "invalid-base64",
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest(http.MethodPost, "/upload", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		fileHandler.UploadHandler(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "Invalid base64 file content")
	})

	t.Run("Invalid AES key", func(t *testing.T) {
		os.Setenv("AES_KEY", "short-key")
		defer os.Setenv("AES_KEY", "12345678901234567890123456789012")

		reqBody := fileHandler.UploadRequest{
			FileName:    "testfile.txt",
			FileType:    "text/plain",
			UserID:      "user123",
			Nonce:       "nonce123",
			Description: "Test file",
			Tags:        []string{"tag1", "tag2"},
			Path:        "files/user123",
			FileContent: base64.StdEncoding.EncodeToString([]byte("test data")),
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest(http.MethodPost, "/upload", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		fileHandler.UploadHandler(w, req)
		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "Invalid AES key")
	})

	t.Run("Database error - user insertion", func(t *testing.T) {
		reqBody := fileHandler.UploadRequest{
			FileName:    "testfile.txt",
			FileType:    "text/plain",
			UserID:      "user123",
			Nonce:       "nonce123",
			Description: "Test file",
			Tags:        []string{"tag1", "tag2"},
			Path:        "files/user123",
			FileContent: base64.StdEncoding.EncodeToString([]byte("test data")),
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest(http.MethodPost, "/upload", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		mockDB.ExpectExec(regexp.QuoteMeta(`
            INSERT INTO users (id)
            SELECT $1
            WHERE NOT EXISTS (
            SELECT 1 FROM users WHERE id = $1
            )`)).
			WithArgs(reqBody.UserID).
			WillReturnError(sqlmock.ErrCancelled)

		fileHandler.UploadHandler(w, req)
		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "User verification failed")
		assert.NoError(t, mockDB.ExpectationsWereMet())
	})

	t.Run("Database error - metadata insertion", func(t *testing.T) {
		reqBody := fileHandler.UploadRequest{
			FileName:    "testfile.txt",
			FileType:    "text/plain",
			UserID:      "user123",
			Nonce:       "nonce123",
			Description: "Test file",
			Tags:        []string{"tag1", "tag2"},
			Path:        "files/user123",
			FileContent: base64.StdEncoding.EncodeToString([]byte("test data")),
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest(http.MethodPost, "/upload", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		mockDB.ExpectExec(regexp.QuoteMeta(`
            INSERT INTO users (id)
            SELECT $1
            WHERE NOT EXISTS (
            SELECT 1 FROM users WHERE id = $1
            )`)).
			WithArgs(reqBody.UserID).
			WillReturnResult(sqlmock.NewResult(0, 1))

		mockDB.ExpectQuery(regexp.QuoteMeta(`
            INSERT INTO files (
                owner_id, file_name, file_type, file_size, cid, nonce, description, tags, created_at
            )
            VALUES ($1, $2, $3, $4, '', $5, $6, $7, $8)
            RETURNING id`)).
			WithArgs(
				reqBody.UserID,
				reqBody.FileName,
				reqBody.FileType,
				9,
				reqBody.Nonce,
				reqBody.Description,
				sqlmock.AnyArg(),
				sqlmock.AnyArg(),
			).
			WillReturnError(sqlmock.ErrCancelled)

		fileHandler.UploadHandler(w, req)
		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "Metadata storage failed")
		assert.NoError(t, mockDB.ExpectationsWereMet())
	})

	t.Run("OwnCloud upload failure", func(t *testing.T) {

		originalUploadFile := owncloud.UploadFile
		defer func() {
			owncloud.UploadFile = originalUploadFile
		}()

		owncloud.UploadFile = func(path, filename string, data []byte) error {
			return errors.New("upload failed")
		}

		reqBody := fileHandler.UploadRequest{
			FileName:    "testfile.txt",
			FileType:    "text/plain",
			UserID:      "user123",
			Nonce:       "nonce123",
			Description: "Test file",
			Tags:        []string{"tag1", "tag2"},
			Path:        "files/user123",
			FileContent: base64.StdEncoding.EncodeToString([]byte("test data")),
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest(http.MethodPost, "/upload", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		mockDB.ExpectExec(regexp.QuoteMeta(`
            INSERT INTO users (id)
            SELECT $1
            WHERE NOT EXISTS (
            SELECT 1 FROM users WHERE id = $1
            )`)).
			WithArgs(reqBody.UserID).
			WillReturnResult(sqlmock.NewResult(0, 1))

		mockDB.ExpectQuery(regexp.QuoteMeta(`
            INSERT INTO files (
                owner_id, file_name, file_type, file_size, cid, nonce, description, tags, created_at
            )
            VALUES ($1, $2, $3, $4, '', $5, $6, $7, $8)
            RETURNING id`)).
			WithArgs(
				reqBody.UserID,
				reqBody.FileName,
				reqBody.FileType,
				9,
				reqBody.Nonce,
				reqBody.Description,
				sqlmock.AnyArg(),
				sqlmock.AnyArg(),
			).
			WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow("file123"))

		mockClient.On("MkdirAll", reqBody.Path, os.FileMode(0755)).Return(nil)
		mockClient.On("Write", reqBody.Path+"/file123", mock.Anything, os.FileMode(0644)).
			Return(errors.New("upload failed"))

		fileHandler.UploadHandler(w, req)
		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "File upload failed")
		assert.NoError(t, mockDB.ExpectationsWereMet())
		mockClient.AssertExpectations(t)
	})

	t.Run("Database error - CID update (non-fatal)", func(t *testing.T) {
		reqBody := fileHandler.UploadRequest{
			FileName:    "testfile.txt",
			FileType:    "text/plain",
			UserID:      "user123",
			Nonce:       "nonce123",
			Description: "Test file",
			Tags:        []string{"tag1", "tag2"},
			Path:        "files/user123",
			FileContent: base64.StdEncoding.EncodeToString([]byte("test data")),
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest(http.MethodPost, "/upload", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		mockDB.ExpectExec(regexp.QuoteMeta(`
            INSERT INTO users (id)
            SELECT $1
            WHERE NOT EXISTS (
            SELECT 1 FROM users WHERE id = $1
            )`)).
			WithArgs(reqBody.UserID).
			WillReturnResult(sqlmock.NewResult(0, 1))

		mockDB.ExpectQuery(regexp.QuoteMeta(`
            INSERT INTO files (
                owner_id, file_name, file_type, file_size, cid, nonce, description, tags, created_at
            )
            VALUES ($1, $2, $3, $4, '', $5, $6, $7, $8)
            RETURNING id`)).
			WithArgs(
				reqBody.UserID,
				reqBody.FileName,
				reqBody.FileType,
				9,
				reqBody.Nonce,
				reqBody.Description,
				sqlmock.AnyArg(),
				sqlmock.AnyArg(),
			).
			WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow("file123"))

		mockClient.On("MkdirAll", reqBody.Path, os.FileMode(0755)).Return(nil)
		mockClient.On("Write", reqBody.Path+"/file123", mock.Anything, os.FileMode(0644)).Return(nil)

		mockDB.ExpectExec(regexp.QuoteMeta(`UPDATE files SET cid = $1 WHERE id = $2`)).
			WithArgs(reqBody.Path+"/file123", "file123").
			WillReturnError(sqlmock.ErrCancelled)

		fileHandler.UploadHandler(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		var resp map[string]string
		err := json.NewDecoder(w.Body).Decode(&resp)
		assert.NoError(t, err)
		assert.Equal(t, "File uploaded and metadata stored", resp["message"])
		assert.Equal(t, "file123", resp["fileId"])
		assert.NoError(t, mockDB.ExpectationsWereMet())
		mockClient.AssertExpectations(t)
	})

	t.Run("Encryption error", func(t *testing.T) {
		reqBody := fileHandler.UploadRequest{
			FileName:    "testfile.txt",
			FileType:    "text/plain",
			UserID:      "user123",
			Nonce:       "nonce123",
			Description: "Test file",
			Tags:        []string{"tag1", "tag2"},
			Path:        "files/user123",
			FileContent: base64.StdEncoding.EncodeToString([]byte("test data")),
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest(http.MethodPost, "/upload", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		// Temporarily override crypto.EncryptBytes to simulate an error
		originalEncrypt := crypto.EncryptBytes
		crypto.EncryptBytes = func(data []byte, key string) ([]byte, error) {
			return nil, errors.New("encryption failed")
		}
		defer func() { crypto.EncryptBytes = originalEncrypt }()

		fileHandler.UploadHandler(w, req)
		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "Encryption failed")
		assert.NoError(t, mockDB.ExpectationsWereMet())
	})
}
