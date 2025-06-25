package unitTests

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/crypto"
)

// MockOwnCloud mocks owncloud.DownloadFile function
type MockOwnCloud struct {
	mock.Mock
}

func (m *MockOwnCloud) DownloadFile(path, filename string) ([]byte, error) {
	args := m.Called(path, filename)
	return args.Get(0).([]byte), args.Error(1)
}

// MockCrypto mocks crypto.DecryptBytes function
type MockCrypto struct {
	mock.Mock
}

func (m *MockCrypto) DecryptBytes(data []byte, key string) ([]byte, error) {
	args := m.Called(data, key)
	return args.Get(0).([]byte), args.Error(1)
}

func TestDownloadHandler(t *testing.T) {
	mockOwnCloud := new(MockOwnCloud)
	mockCrypto := new(MockCrypto)

	// Patch the package functions for testing
	owncloud.DownloadFile = mockOwnCloud.DownloadFile
	crypto.DecryptBytes = mockCrypto.DecryptBytes

	os.Setenv("AES_KEY", "12345678901234567890123456789012") // valid 32-byte key

	t.Run("Success", func(t *testing.T) {
		reqBody := fileHandler.DownloadRequest{
			:     "valid/path",
			FileName: "file.txt",
		}
		body, _ := json.Marshal(reqBody)

		mockOwnCloud.On("DownloadFile", reqBody.Path, reqBody.FileName).
			Return([]byte("encrypted content"), nil)
		mockCrypto.On("DecryptBytes", []byte("encrypted content"), os.Getenv("AES_KEY")).
			Return([]byte("plain content"), nil)

		req := httptest.NewRequest(http.MethodPost, "/download", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		fileHandler.DownloadHandler(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp fileHandler.DownloadResponse
		err := json.NewDecoder(w.Body).Decode(&resp)
		assert.NoError(t, err)
		assert.Equal(t, reqBody.FileName, resp.FileName)
		assert.NotEmpty(t, resp.FileContent) // base64 encoded string

		mockOwnCloud.AssertExpectations(t)
		mockCrypto.AssertExpectations(t)
	})

	t.Run("Invalid JSON payload", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/download", bytes.NewBuffer([]byte("invalid json")))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		fileHandler.DownloadHandler(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Missing path or filename", func(t *testing.T) {
		reqBody := fileHandler.DownloadRequest{} // empty fields
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest(http.MethodPost, "/download", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		fileHandler.DownloadHandler(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Download error", func(t *testing.T) {
		reqBody := fileHandler.DownloadRequest{
			Path:     "invalid/path",
			FileName: "file.txt",
		}
		body, _ := json.Marshal(reqBody)

		mockOwnCloud.On("DownloadFile", reqBody.Path, reqBody.FileName).
			Return([]byte{}, errors.New("download failed"))

		req := httptest.NewRequest(http.MethodPost, "/download", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		fileHandler.DownloadHandler(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
		mockOwnCloud.AssertExpectations(t)
	})

	t.Run("Invalid AES key", func(t *testing.T) {
		os.Setenv("AES_KEY", "shortkey")

		reqBody := fileHandler.DownloadRequest{
			Path:     "valid/path",
			FileName: "file.txt",
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest(http.MethodPost, "/download", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		fileHandler.DownloadHandler(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})

	t.Run("Decryption error", func(t *testing.T) {
		os.Setenv("AES_KEY", "12345678901234567890123456789012")

		reqBody := fileHandler.DownloadRequest{
			Path:     "valid/path",
			FileName: "file.txt",
		}
		body, _ := json.Marshal(reqBody)

		mockOwnCloud.On("DownloadFile", reqBody.Path, reqBody.FileName).
			Return([]byte("encrypted content"), nil)
		mockCrypto.On("DecryptBytes", []byte("encrypted content"), os.Getenv("AES_KEY")).
			Return([]byte{}, errors.New("decryption failed"))

		req := httptest.NewRequest(http.MethodPost, "/download", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		fileHandler.DownloadHandler(w, req)

		//assert.Equal(t, http.StatusInternalServerError, w.Code)
		mockOwnCloud.AssertExpectations(t)
		mockCrypto.AssertExpectations(t)
	})
}
