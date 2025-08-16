// package fileHandler_test

package integrationTests

// import (
// 	"bytes"
// 	"database/sql"
// 	"encoding/json"
// 	"errors"
// 	"net/http"
// 	"net/http/httptest"
// 	"os"
// 	"testing"

// 	"bou.ke/monkey"
// 	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
// 	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
// 	"github.com/stretchr/testify/assert"
// 	"github.com/stretchr/testify/mock"
// )

// // Mock RowScanner for database queries
// type mockRowScanner struct {
// 	mock.Mock
// }

// func (m *mockRowScanner) Scan(dest ...any) error {
// 	args := m.Called(dest...)
// 	return args.Error(0)
// }

// func TestDownloadHandler(t *testing.T) {
// 	os.Setenv("AES_KEY", "12345678901234567890123456789012")
// 	defer os.Unsetenv("AES_KEY")

// 	t.Run("Successful Download", func(t *testing.T) {
// 		rowScanner := new(mockRowScanner)
// 		rowScanner.On("Scan", mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
// 			*args[0].(*string) = "file123"
// 			*args[1].(*string) = "nonce123"
// 		}).Return(nil)

// 		originalQueryRowFunc := fileHandler.QueryRowFunc
// 		originalDownloader := fileHandler.OwnCloudDownloader
// 		originalDecryptFunc := fileHandler.DecryptFunc

// 		fileHandler.QueryRowFunc = func(query string, args ...any) fileHandler.RowScanner {
// 			return rowScanner
// 		}
// 		fileHandler.OwnCloudDownloader = func(fileID, userID string) ([]byte, error) {
// 			return []byte("encrypted data"), nil
// 		}
// 		fileHandler.DecryptFunc = func(data []byte, key string) ([]byte, error) {
// 			return []byte("decrypted data"), nil
// 		}

// 		defer func() {
// 			fileHandler.QueryRowFunc = originalQueryRowFunc
// 			fileHandler.OwnCloudDownloader = originalDownloader
// 			fileHandler.DecryptFunc = originalDecryptFunc
// 		}()

// 		reqBody, _ := json.Marshal(fileHandler.DownloadRequest{
// 			UserID:   "user456",
// 			FileName: "testfile.txt",
// 		})
// 		req := httptest.NewRequest(http.MethodPost, "/download", bytes.NewReader(reqBody))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.DownloadHandler(w, req)

// 		assert.Equal(t, http.StatusOK, w.Code)
// 		var response fileHandler.DownloadResponse
// 		err := json.NewDecoder(w.Body).Decode(&response)
// 		assert.NoError(t, err)
// 		assert.Equal(t, "testfile.txt", response.FileName)
// 		assert.Equal(t, "ZGVjcnlwdGVkIGRhdGE=", response.FileContent)
// 		assert.Equal(t, "nonce123", response.Nonce)
// 		rowScanner.AssertCalled(t, "Scan", mock.Anything, mock.Anything)
// 	})

// 	t.Run("Missing UserID", func(t *testing.T) {
// 		reqBody, _ := json.Marshal(fileHandler.DownloadRequest{
// 			UserID:   "",
// 			FileName: "testfile.txt",
// 		})
// 		req := httptest.NewRequest(http.MethodPost, "/download", bytes.NewReader(reqBody))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.DownloadHandler(w, req)

// 		assert.Equal(t, http.StatusBadRequest, w.Code)
// 		assert.Contains(t, w.Body.String(), "Missing required fields")
// 	})

// 	t.Run("Missing FileName", func(t *testing.T) {
// 		// Arrange
// 		reqBody, _ := json.Marshal(fileHandler.DownloadRequest{
// 			UserID:   "user456",
// 			FileName: "",
// 		})
// 		req := httptest.NewRequest(http.MethodPost, "/download", bytes.NewReader(reqBody))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.DownloadHandler(w, req)

// 		assert.Equal(t, http.StatusBadRequest, w.Code)
// 		assert.Contains(t, w.Body.String(), "Missing required fields")
// 	})

// 	t.Run("Invalid JSON Payload", func(t *testing.T) {
// 		// Arrange
// 		req := httptest.NewRequest(http.MethodPost, "/download", bytes.NewReader([]byte("{invalid json}")))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.DownloadHandler(w, req)

// 		assert.Equal(t, http.StatusBadRequest, w.Code)
// 		assert.Contains(t, w.Body.String(), "Invalid request body")
// 	})

// 	t.Run("Database Query Failure", func(t *testing.T) {
// 		rowScanner := new(mockRowScanner)
// 		rowScanner.On("Scan", mock.Anything, mock.Anything).Return(sql.ErrNoRows)

// 		monkey.Patch(fileHandler.QueryRowFunc, func(query string, args ...any) fileHandler.RowScanner {
// 			return rowScanner
// 		})
// 		defer monkey.Unpatch(fileHandler.QueryRowFunc)

// 		reqBody, _ := json.Marshal(fileHandler.DownloadRequest{
// 			UserID:   "user456",
// 			FileName: "testfile.txt",
// 		})
// 		req := httptest.NewRequest(http.MethodPost, "/download", bytes.NewReader(reqBody))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.DownloadHandler(w, req)

// 		assert.Equal(t, http.StatusNotFound, w.Code)
// 		assert.Contains(t, w.Body.String(), "File not found")
// 	})

// 	t.Run("Invalid AES Key Length", func(t *testing.T) {
// 		os.Setenv("AES_KEY", "shortkey")
// 		defer os.Unsetenv("AES_KEY")

// 		rowScanner := new(mockRowScanner)
// 		rowScanner.On("Scan", mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
// 			// dest := args.Get(0).([]any)
// 			*args[0].(*string) = "file123"
// 			*args[1].(*string) = "nonce123"
// 		}).Return(nil)

// 		originalQueryRowFunc := fileHandler.QueryRowFunc
// 		fileHandler.QueryRowFunc = func(query string, args ...any) fileHandler.RowScanner {
// 			return rowScanner
// 		}
// 		defer func() { fileHandler.QueryRowFunc = originalQueryRowFunc }()

// 		monkey.Patch(fileHandler.OwnCloudDownloader, func(fileID, userID string) ([]byte, error) {
// 			return []byte("some encrypted content"), nil
// 		})
// 		defer monkey.Unpatch(fileHandler.OwnCloudDownloader)

// 		monkey.Patch(fileHandler.DecryptFunc, func(data []byte, key string) ([]byte, error) {
// 			return nil, errors.New("should never be called")
// 		})
// 		defer monkey.Unpatch(fileHandler.DecryptFunc)

// 		reqBody, _ := json.Marshal(fileHandler.DownloadRequest{
// 			UserID:   "user456",
// 			FileName: "testfile.txt",
// 		})
// 		req := httptest.NewRequest(http.MethodPost, "/download", bytes.NewReader(reqBody))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.DownloadHandler(w, req)

// 		assert.Equal(t, http.StatusInternalServerError, w.Code)
// 		assert.Contains(t, w.Body.String(), "Invalid AES key")
// 	})

// 	t.Run("OwnCloud Download Failure", func(t *testing.T) {
// 		rowScanner := new(mockRowScanner)
// 		rowScanner.On("Scan", mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
// 			*args[0].(*string) = "file123"
// 			*args[1].(*string) = "nonce123"
// 		}).Return(nil)

// 		monkey.Patch(fileHandler.QueryRowFunc, func(query string, args ...any) fileHandler.RowScanner {
// 			return rowScanner
// 		})
// 		defer monkey.Unpatch(fileHandler.QueryRowFunc)

// 		monkey.Patch(fileHandler.OwnCloudDownloader, func(fileID, userID string) ([]byte, error) {
// 			return nil, errors.New("OwnCloud error")
// 		})
// 		defer monkey.Unpatch(fileHandler.OwnCloudDownloader)

// 		reqBody, _ := json.Marshal(fileHandler.DownloadRequest{
// 			UserID:   "user456",
// 			FileName: "testfile.txt",
// 		})
// 		req := httptest.NewRequest(http.MethodPost, "/download", bytes.NewReader(reqBody))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.DownloadHandler(w, req)
// 		assert.Equal(t, http.StatusInternalServerError, w.Code)
// 		assert.Contains(t, w.Body.String(), "Download failed")
// 	})

// 	t.Run("Decryption Failure", func(t *testing.T) {
// 		rowScanner := new(mockRowScanner)
// 		rowScanner.On("Scan", mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
// 			*args[0].(*string) = "file123"
// 			*args[1].(*string) = "nonce123"
// 		}).Return(nil)

// 		monkey.Patch(fileHandler.QueryRowFunc, func(query string, args ...any) fileHandler.RowScanner {
// 			return rowScanner
// 		})
// 		defer monkey.Unpatch(fileHandler.QueryRowFunc)

// 		monkey.Patch(fileHandler.OwnCloudDownloader, func(fileID, userID string) ([]byte, error) {
// 			return []byte("encrypted data"), nil
// 		})
// 		defer monkey.Unpatch(fileHandler.OwnCloudDownloader)

// 		monkey.Patch(fileHandler.DecryptFunc, func(data []byte, key string) ([]byte, error) {
// 			return nil, errors.New("Decryption error")
// 		})
// 		defer monkey.Unpatch(fileHandler.DecryptFunc)

// 		reqBody, _ := json.Marshal(fileHandler.DownloadRequest{
// 			UserID:   "user456",
// 			FileName: "testfile.txt",
// 		})
// 		req := httptest.NewRequest(http.MethodPost, "/download", bytes.NewReader(reqBody))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.DownloadHandler(w, req)

// 		assert.Equal(t, http.StatusInternalServerError, w.Code)
// 		assert.Contains(t, w.Body.String(), "Decryption failed")
// 	})
// }

// func TestDownloadSentFile(t *testing.T) {
// 	t.Run("Successful Download", func(t *testing.T) {
// 		monkey.Patch(owncloud.DownloadSentFile, func(filePath string) ([]byte, error) {
// 			return []byte("file data"), nil
// 		})
// 		defer monkey.Unpatch(owncloud.DownloadSentFile)

// 		reqBody, _ := json.Marshal(fileHandler.DownloadSentRequest{
// 			FilePath: "/path/to/file",
// 		})
// 		req := httptest.NewRequest(http.MethodPost, "/download-sent", bytes.NewReader(reqBody))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.DownloadSentFile(w, req)

// 		assert.Equal(t, http.StatusOK, w.Code)
// 		assert.Equal(t, "ZmlsZSBkYXRh", w.Body.String()) // base64.RawURLEncoding of "file data"
// 	})

// 	t.Run("Missing FilePath", func(t *testing.T) {
// 		reqBody, _ := json.Marshal(fileHandler.DownloadSentRequest{
// 			FilePath: "",
// 		})
// 		req := httptest.NewRequest(http.MethodPost, "/download-sent", bytes.NewReader(reqBody))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.DownloadSentFile(w, req)

// 		assert.Equal(t, http.StatusBadRequest, w.Code)
// 		assert.Contains(t, w.Body.String(), "Missing file path")
// 	})

// 	t.Run("Invalid JSON Payload", func(t *testing.T) {
// 		req := httptest.NewRequest(http.MethodPost, "/download-sent", bytes.NewReader([]byte("{invalid json}")))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.DownloadSentFile(w, req)

// 		assert.Equal(t, http.StatusBadRequest, w.Code)
// 		assert.Contains(t, w.Body.String(), "Invalid JSON payload")
// 	})

// 	t.Run("OwnCloud Download Failure", func(t *testing.T) {
// 		// Arrange
// 		monkey.Patch(owncloud.DownloadSentFile, func(filePath string) ([]byte, error) {
// 			return nil, errors.New("OwnCloud error")
// 		})
// 		defer monkey.Unpatch(owncloud.DownloadSentFile)

// 		reqBody, _ := json.Marshal(fileHandler.DownloadSentRequest{
// 			FilePath: "/path/to/file",
// 		})
// 		req := httptest.NewRequest(http.MethodPost, "/download-sent", bytes.NewReader(reqBody))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.DownloadSentFile(w, req)

// 		assert.Equal(t, http.StatusInternalServerError, w.Code)
// 		assert.Contains(t, w.Body.String(), "Download failed")
// 	})
// }
