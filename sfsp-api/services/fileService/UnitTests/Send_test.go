package unitTests_test

import (
	"bytes"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/metadata"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
	"github.com/stretchr/testify/assert"
)

func TestSendFileHandler_Success(t *testing.T) {
	originalUpload := owncloud.UploadFile
	originalInsertReceived := metadata.InsertReceivedFile
	originalInsertSent := metadata.InsertSentFile
	defer func() {
		owncloud.UploadFile = originalUpload
		metadata.InsertReceivedFile = originalInsertReceived
		metadata.InsertSentFile = originalInsertSent
	}()

	owncloud.UploadFile = func(path, fileID string, data []byte) error {
		return nil
	}
	metadata.InsertReceivedFile = func(_ *sql.DB, _, _, _, _ string, _ time.Time) error {
		return nil
	}
	metadata.InsertSentFile = func(_ *sql.DB, _, _, _, _, _ string) error {
		return nil
	}

	payload := fileHandler.SendFilePayload{
		FileID:          "file123",
		FilePath:        "file/path",
		UserID:          "user123",
		RecipientID:     "user456",
		EncryptedFile:   base64.RawURLEncoding.EncodeToString([]byte("fake content")),
		EncryptedAESKey: "encrypted-key",
		EKPublicKey:     "epk",
		Metadata: map[string]interface{}{
			"nonce": "abc",
		},
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/send", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	fileHandler.SendFileHandler(w, req)

	assert.Equal(t, http.StatusOK, w.Result().StatusCode)

	var res map[string]string
	_ = json.NewDecoder(w.Body).Decode(&res)
	assert.Equal(t, "File sent successfully", res["message"])
}

func TestSendFileHandler_InvalidJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/send", bytes.NewBuffer([]byte("{invalid json")))
	w := httptest.NewRecorder()

	fileHandler.SendFileHandler(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Result().StatusCode)
}

func TestSendFileHandler_InvalidBase64(t *testing.T) {
	payload := fileHandler.SendFilePayload{
		EncryptedFile: "invalid-base64$$$",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/send", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	fileHandler.SendFileHandler(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Result().StatusCode)
}

func TestSendFileHandler_UploadFails(t *testing.T) {
	originalUpload := owncloud.UploadFile
	defer func() { owncloud.UploadFile = originalUpload }()
	owncloud.UploadFile = func(_, _ string, _ []byte) error {
		return errors.New("upload failed")
	}

	payload := fileHandler.SendFilePayload{
		FileID:        "file123",
		UserID:        "user123",
		RecipientID:   "user456",
		EncryptedFile: base64.RawURLEncoding.EncodeToString([]byte("fake content")),
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/send", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	fileHandler.SendFileHandler(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Result().StatusCode)
}

func TestSendFileHandler_MetadataMarshalFails(t *testing.T) {
	originalUpload := owncloud.UploadFile
	defer func() { owncloud.UploadFile = originalUpload }()
	owncloud.UploadFile = func(_, _ string, _ []byte) error {
		return nil
	}

	payload := fileHandler.SendFilePayload{
		EncryptedFile: base64.RawURLEncoding.EncodeToString([]byte("abc")),
		Metadata: map[string]interface{}{
			"invalid": make(chan int), // not serializable
		},
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/send", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	fileHandler.SendFileHandler(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Result().StatusCode)
}

func TestSendFileHandler_InsertReceivedFails(t *testing.T) {
	originalUpload := owncloud.UploadFile
	originalInsertReceived := metadata.InsertReceivedFile
	defer func() {
		owncloud.UploadFile = originalUpload
		metadata.InsertReceivedFile = originalInsertReceived
	}()

	owncloud.UploadFile = func(_, _ string, _ []byte) error {
		return nil
	}
	metadata.InsertReceivedFile = func(_ *sql.DB, _, _, _, _ string, _ time.Time) error {
		return errors.New("insert failed")
	}

	payload := fileHandler.SendFilePayload{
		FileID:        "file123",
		UserID:        "user123",
		RecipientID:   "user456",
		EncryptedFile: base64.RawURLEncoding.EncodeToString([]byte("abc")),
		Metadata: map[string]interface{}{
			"nonce": "abc",
		},
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/send", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	fileHandler.SendFileHandler(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Result().StatusCode)
}