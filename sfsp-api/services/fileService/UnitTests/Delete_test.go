package unitTests

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/metadata"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)

var (
	originalDeleteFromOwnCloud = owncloud.DeleteFile
	originalDeleteFromMetadata = metadata.DeleteFileMetadata
)

func restoreOriginals() {
	owncloud.DeleteFile = originalDeleteFromOwnCloud
	metadata.DeleteFileMetadata = originalDeleteFromMetadata
}

func TestDeleteFileHandler_Success(t *testing.T) {
	defer restoreOriginals()

	owncloud.DeleteFile = func(fileID, userID string) error {
		return nil
	}
	metadata.DeleteFileMetadata = func(fileID string) error {
		return nil
	}

	reqBody := map[string]string{
		"fileId": "abc123",
		"userId": "user789",
	}
	bodyBytes, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/delete", bytes.NewReader(bodyBytes))
	w := httptest.NewRecorder()

	fileHandler.DeleteFileHandler(w, req)

	resp := w.Result()
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Contains(t, w.Body.String(), "File successfully deleted")
}

func TestDeleteFileHandler_InvalidJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/delete", bytes.NewBufferString("invalid-json"))
	w := httptest.NewRecorder()

	fileHandler.DeleteFileHandler(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid JSON payload")
}

func TestDeleteFileHandler_MissingFileId(t *testing.T) {
	body := `{"userId":"user123"}`
	req := httptest.NewRequest(http.MethodPost, "/delete", bytes.NewBufferString(body))
	w := httptest.NewRecorder()

	fileHandler.DeleteFileHandler(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Missing fileId")
}

func TestDeleteFileHandler_MissingUserId(t *testing.T) {
	body := `{"fileId":"file123"}`
	req := httptest.NewRequest(http.MethodPost, "/delete", bytes.NewBufferString(body))
	w := httptest.NewRecorder()

	fileHandler.DeleteFileHandler(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Missing UserID")
}

func TestDeleteFileHandler_OwnCloudError(t *testing.T) {
	defer restoreOriginals()

	owncloud.DeleteFile = func(fileID, userID string) error {
		return errors.New("failed to delete from owncloud")
	}
	metadata.DeleteFileMetadata = func(fileID string) error {
		return nil
	}

	body := `{"fileId":"file123", "userId":"user456"}`
	req := httptest.NewRequest(http.MethodPost, "/delete", bytes.NewBufferString(body))
	w := httptest.NewRecorder()

	fileHandler.DeleteFileHandler(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "File delete failed")
}

func TestDeleteFileHandler_MetadataError(t *testing.T) {
	defer restoreOriginals()

	owncloud.DeleteFile = func(fileID, userID string) error {
		return nil
	}
	metadata.DeleteFileMetadata = func(fileID string) error {
		return errors.New("metadata deletion failed")
	}

	body := `{"fileId":"fileXYZ", "userId":"user123"}`
	req := httptest.NewRequest(http.MethodPost, "/delete", bytes.NewBufferString(body))
	w := httptest.NewRecorder()

	fileHandler.DeleteFileHandler(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "File delete failed")
}
