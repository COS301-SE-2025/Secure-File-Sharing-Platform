package unitTests

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)

// --- Mocking ---

type mockRow struct {
	fileID string
	nonce  string
	err    error
}

func (m *mockRow) Scan(dest ...any) error {
	if m.err != nil {
		return m.err
	}
	if len(dest) < 2 {
		return errors.New("not enough arguments to Scan")
	}

	// Use type assertion to *string, then assign
	if p, ok := dest[0].(*string); ok {
		*p = m.fileID
	} else {
		return errors.New("Scan dest[0] not *string")
	}

	if p, ok := dest[1].(*string); ok {
		*p = m.nonce
	} else {
		return errors.New("Scan dest[1] not *string")
	}

	return nil
}

type rowWrapper struct {
	*mockRow
}

func (rw *rowWrapper) Scan(dest ...any) error {
	return rw.mockRow.Scan(dest...)
}

func TestDownloadHandler_Success(t *testing.T) {
	os.Setenv("AES_KEY", "12345678901234567890123456789012")
	defer os.Unsetenv("AES_KEY")

	fileHandler.OwnCloudDownloader = func(fileID, userID string) ([]byte, error) {
		return []byte("encrypteddata"), nil
	}
	fileHandler.DecryptFunc = func(data []byte, key string) ([]byte, error) {
		assert.Equal(t, "12345678901234567890123456789012", key)
		return []byte("decryptedcontent"), nil
	}
	fileHandler.QueryRowFunc = func(query string, args ...any) fileHandler.RowScanner {
		return &mockRow{fileID: "file123", nonce: "xyz", err: nil}
	}

	reqBody := fileHandler.DownloadRequest{UserID: "user1", FileName: "testfile.txt"}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/download", bytes.NewReader(body))
	w := httptest.NewRecorder()

	fileHandler.DownloadHandler(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var res fileHandler.DownloadResponse
	err := json.NewDecoder(w.Body).Decode(&res)
	require.NoError(t, err)
	assert.Equal(t, "testfile.txt", res.FileName)
	assert.Equal(t, base64.StdEncoding.EncodeToString([]byte("decryptedcontent")), res.FileContent)
	assert.Equal(t, "xyz", res.Nonce)
}

func TestDownloadHandler_InvalidJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/download", bytes.NewBuffer([]byte("{invalid")))
	w := httptest.NewRecorder()

	fileHandler.DownloadHandler(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDownloadHandler_MissingFields(t *testing.T) {
	body, _ := json.Marshal(fileHandler.DownloadRequest{})
	req := httptest.NewRequest(http.MethodPost, "/download", bytes.NewReader(body))
	w := httptest.NewRecorder()

	fileHandler.DownloadHandler(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDownloadHandler_QueryFails(t *testing.T) {
	fileHandler.QueryRowFunc = func(query string, args ...any) fileHandler.RowScanner {
		return &mockRow{err: errors.New("not found")}
	}

	body, _ := json.Marshal(fileHandler.DownloadRequest{UserID: "u", FileName: "f"})
	req := httptest.NewRequest(http.MethodPost, "/download", bytes.NewReader(body))
	w := httptest.NewRecorder()

	fileHandler.DownloadHandler(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestDownloadHandler_DownloadFails(t *testing.T) {
	fileHandler.QueryRowFunc = func(query string, args ...any) fileHandler.RowScanner {
		return &mockRow{fileID: "id", nonce: "n", err: nil}
	}
	fileHandler.OwnCloudDownloader = func(_, _ string) ([]byte, error) {
		return nil, errors.New("owncloud error")
	}

	body, _ := json.Marshal(fileHandler.DownloadRequest{UserID: "u", FileName: "f"})
	req := httptest.NewRequest(http.MethodPost, "/download", bytes.NewReader(body))
	w := httptest.NewRecorder()

	fileHandler.DownloadHandler(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDownloadHandler_InvalidAESKey(t *testing.T) {
	os.Setenv("AES_KEY", "shortkey")
	defer os.Unsetenv("AES_KEY")

	fileHandler.QueryRowFunc = func(query string, args ...any) fileHandler.RowScanner {
		return &mockRow{fileID: "id", nonce: "n", err: nil}
	}
	fileHandler.OwnCloudDownloader = func(_, _ string) ([]byte, error) {
		return []byte("enc"), nil
	}

	body, _ := json.Marshal(fileHandler.DownloadRequest{UserID: "u", FileName: "f"})
	req := httptest.NewRequest(http.MethodPost, "/download", bytes.NewReader(body))
	w := httptest.NewRecorder()

	fileHandler.DownloadHandler(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDownloadHandler_DecryptFails(t *testing.T) {
	os.Setenv("AES_KEY", "12345678901234567890123456789012")
	defer os.Unsetenv("AES_KEY")

	fileHandler.QueryRowFunc = func(query string, args ...any) fileHandler.RowScanner {
		return &mockRow{fileID: "id", nonce: "n", err: nil}
	}
	fileHandler.OwnCloudDownloader = func(_, _ string) ([]byte, error) {
		return []byte("enc"), nil
	}
	fileHandler.DecryptFunc = func(_ []byte, _ string) ([]byte, error) {
		return nil, errors.New("decryption error")
	}

	body, _ := json.Marshal(fileHandler.DownloadRequest{UserID: "u", FileName: "f"})
	req := httptest.NewRequest(http.MethodPost, "/download", bytes.NewReader(body))
	w := httptest.NewRecorder()

	fileHandler.DownloadHandler(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDownloadSentFile_Success(t *testing.T) {
	owncloud.DownloadSentFile = func(path string) ([]byte, error) {
		return []byte("sent file data"), nil
	}
	defer func() { owncloud.DownloadSentFile = nil }()

	body, _ := json.Marshal(fileHandler.DownloadSentRequest{FilePath: "files/abc"})
	req := httptest.NewRequest(http.MethodPost, "/download/sent", bytes.NewReader(body))
	w := httptest.NewRecorder()

	fileHandler.DownloadSentFile(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	decoded, err := base64.RawURLEncoding.DecodeString(w.Body.String())
	require.NoError(t, err)
	assert.Equal(t, []byte("sent file data"), decoded)
}

func TestDownloadSentFile_InvalidJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/download/sent", bytes.NewBuffer([]byte("{invalid")))
	w := httptest.NewRecorder()

	fileHandler.DownloadSentFile(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDownloadSentFile_MissingPath(t *testing.T) {
	body, _ := json.Marshal(fileHandler.DownloadSentRequest{})
	req := httptest.NewRequest(http.MethodPost, "/download/sent", bytes.NewReader(body))
	w := httptest.NewRecorder()

	fileHandler.DownloadSentFile(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDownloadSentFile_Failure(t *testing.T) {
	owncloud.DownloadSentFile = func(path string) ([]byte, error) {
		return nil, errors.New("OC failed")
	}
	defer func() { owncloud.DownloadSentFile = nil }()

	body, _ := json.Marshal(fileHandler.DownloadSentRequest{FilePath: "files/bad"})
	req := httptest.NewRequest(http.MethodPost, "/download/sent", bytes.NewReader(body))
	w := httptest.NewRecorder()

	fileHandler.DownloadSentFile(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}
