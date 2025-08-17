// package fileHandler_test

package integration_test

// import (
// 	"bytes"
// 	"database/sql"
// 	"encoding/base64"
// 	"encoding/json"
// 	"fmt"
// 	"net/http"
// 	"net/http/httptest"
// 	"testing"
// 	"time"

// 	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
// 	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/metadata"
// 	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
// 	"github.com/stretchr/testify/assert"
// 	"github.com/stretchr/testify/mock"
// )

// // Mock dependencies
// type MockOwnCloud struct {
// 	mock.Mock
// }

// func (m *MockOwnCloud) UploadFile(targetPath, fileID string, fileBytes []byte) error {
// 	args := m.Called(targetPath, fileID, fileBytes)
// 	return args.Error(0)
// }

// type MockMetadata struct {
// 	mock.Mock
// }

// func (m *MockMetadata) InsertReceivedFile(db *sql.DB, recipientId, senderId, fileId, metadataJson string, expiresAt time.Time) error {
// 	args := m.Called(db, recipientId, senderId, fileId, metadataJson, expiresAt)
// 	return args.Error(0)
// }

// func (m *MockMetadata) InsertSentFile(db *sql.DB, senderId, recipientId, fileId, encryptedFileKey, x3dhEphemeralPubKey string) error {
// 	args := m.Called(db, senderId, recipientId, fileId, encryptedFileKey, x3dhEphemeralPubKey)
// 	return args.Error(0)
// }

// func TestSendFileHandler(t *testing.T) {
// 	// Mock dependencies
// 	mockOwnCloud := new(MockOwnCloud)
// 	mockMetadata := new(MockMetadata)
// 	originalOwnCloud := owncloud.UploadFile
// 	originalInsertReceivedFile := metadata.InsertReceivedFile
// 	originalInsertSentFile := metadata.InsertSentFile

// 	// Override with mocks
// 	owncloud.UploadFile = mockOwnCloud.UploadFile
// 	metadata.InsertReceivedFile = mockMetadata.InsertReceivedFile
// 	metadata.InsertSentFile = mockMetadata.InsertSentFile

// 	// Restore original functions after tests
// 	defer func() {
// 		owncloud.UploadFile = originalOwnCloud
// 		metadata.InsertReceivedFile = originalInsertReceivedFile
// 		metadata.InsertSentFile = originalInsertSentFile
// 	}()

// 	// Mock DB
// 	var mockDB *sql.DB
// 	fileHandler.DB = mockDB

// 	t.Run("Successful file send", func(t *testing.T) {
// 		// Prepare test payload
// 		payload := fileHandler.SendFilePayload{
// 			FileID:          "file123",
// 			FilePath:        "testfile.txt",
// 			UserID:          "user1",
// 			RecipientID:     "user2",
// 			EncryptedFile:   base64.RawURLEncoding.EncodeToString([]byte("test file content")),
// 			EncryptedAESKey: "encryptedKey",
// 			EKPublicKey:     "publicKey",
// 			Metadata: map[string]interface{}{
// 				"nonce": "abc123",
// 				"ikPub": "publicKey123",
// 				"size":  1024,
// 			},
// 		}
// 		payloadBytes, _ := json.Marshal(payload)

// 		// Setup mocks
// 		mockOwnCloud.On("UploadFile", "files/user1/sent", "file123", mock.Anything).Return(nil)
// 		mockMetadata.On(
// 			"InsertReceivedFile",
// 			mock.Anything, // *sql.DB
// 			"user2",
// 			"user1",
// 			"file123",
// 			mock.MatchedBy(func(metadata string) bool {
// 				var meta map[string]interface{}
// 				err := json.Unmarshal([]byte(metadata), &meta)
// 				return err == nil && meta["nonce"] == "abc123" && meta["ikPub"] == "publicKey123" && meta["size"] == float64(1024)
// 			}),
// 			mock.AnythingOfType("time.Time"),
// 		).Return(nil)
// 		mockMetadata.On("InsertSentFile", mock.Anything, "user1", "user2", "file123", "encryptedKey", "publicKey").Return(nil)

// 		// Create HTTP request
// 		req, err := http.NewRequest("POST", "/send-file", bytes.NewBuffer(payloadBytes))
// 		assert.NoError(t, err)
// 		req.Header.Set("Content-Type", "application/json")

// 		// Create response recorder
// 		rr := httptest.NewRecorder()

// 		// Call handler
// 		fileHandler.SendFileHandler(rr, req)

// 		// Assert response
// 		assert.Equal(t, http.StatusOK, rr.Code)
// 		var response map[string]string
// 		err = json.NewDecoder(rr.Body).Decode(&response)
// 		assert.NoError(t, err)
// 		assert.Equal(t, "File sent successfully", response["message"])

// 		// Verify mocks
// 		mockOwnCloud.AssertExpectations(t)
// 		mockMetadata.AssertExpectations(t)
// 	})

// 	t.Run("Invalid JSON payload", func(t *testing.T) {
// 		// Invalid JSON
// 		invalidPayload := []byte(`{invalid json}`)
// 		req, err := http.NewRequest("POST", "/send-file", bytes.NewBuffer(invalidPayload))
// 		assert.NoError(t, err)
// 		req.Header.Set("Content-Type", "application/json")

// 		rr := httptest.NewRecorder()
// 		fileHandler.SendFileHandler(rr, req)

// 		assert.Equal(t, http.StatusBadRequest, rr.Code)
// 		assert.Contains(t, rr.Body.String(), "Invalid JSON payload")
// 	})

// 	t.Run("Invalid base64 encrypted file", func(t *testing.T) {
// 		payload := fileHandler.SendFilePayload{
// 			FileID:          "file123",
// 			UserID:          "user1",
// 			RecipientID:     "user2",
// 			EncryptedFile:   "invalid-base64-!!", // Invalid base64
// 			EncryptedAESKey: "encryptedKey",
// 			EKPublicKey:     "publicKey",
// 			Metadata:        map[string]interface{}{"nonce": "abc123"},
// 		}
// 		payloadBytes, _ := json.Marshal(payload)

// 		req, err := http.NewRequest("POST", "/send-file", bytes.NewBuffer(payloadBytes))
// 		assert.NoError(t, err)
// 		req.Header.Set("Content-Type", "application/json")

// 		rr := httptest.NewRecorder()
// 		fileHandler.SendFileHandler(rr, req)

// 		assert.Equal(t, http.StatusBadRequest, rr.Code)
// 		assert.Contains(t, rr.Body.String(), "Invalid encrypted file format")
// 	})

// 	t.Run("OwnCloud upload failure", func(t *testing.T) {
// 		payload := fileHandler.SendFilePayload{
// 			FileID:          "file123",
// 			UserID:          "user1",
// 			RecipientID:     "user2",
// 			EncryptedFile:   base64.RawURLEncoding.EncodeToString([]byte("test file content")),
// 			EncryptedAESKey: "encryptedKey",
// 			EKPublicKey:     "publicKey",
// 			Metadata:        map[string]interface{}{"nonce": "abc123"},
// 		}
// 		payloadBytes, _ := json.Marshal(payload)

// 		// Setup mock to return error
// 		mockOwnCloud.On("UploadFile", "files/user1/sent", "file123", mock.Anything).Return(fmt.Errorf("upload failed"))

// 		// No mocks for InsertReceivedFile or InsertSentFile, as handler exits early

// 		req, err := http.NewRequest("POST", "/send-file", bytes.NewBuffer(payloadBytes))
// 		assert.NoError(t, err)
// 		req.Header.Set("Content-Type", "application/json")

// 		rr := httptest.NewRecorder()
// 		fileHandler.SendFileHandler(rr, req)

// 		assert.Equal(t, http.StatusInternalServerError, rr.Code)
// 		assert.Contains(t, rr.Body.String(), "Failed to store encrypted file")

// 		// Verify mocks
// 		mockOwnCloud.AssertExpectations(t)
// 	})

// 	t.Run("Invalid metadata format", func(t *testing.T) {
// 		// Create payload with unserializable metadata
// 		payload := fileHandler.SendFilePayload{
// 			FileID:          "file123",
// 			UserID:          "user1",
// 			RecipientID:     "user2",
// 			EncryptedFile:   base64.RawURLEncoding.EncodeToString([]byte("test file content")),
// 			EncryptedAESKey: "encryptedKey",
// 			EKPublicKey:     "publicKey",
// 			Metadata: map[string]interface{}{
// 				"invalid": make(chan int), // Unserializable type
// 			},
// 		}
// 		payloadBytes, _ := json.Marshal(payload)

// 		// Setup mocks
// 		mockOwnCloud.On("UploadFile", "files/user1/sent", "file123", mock.Anything).Return(nil)

// 		req, err := http.NewRequest("POST", "/send-file", bytes.NewBuffer(payloadBytes))
// 		assert.NoError(t, err)
// 		req.Header.Set("Content-Type", "application/json")

// 		rr := httptest.NewRecorder()
// 		fileHandler.SendFileHandler(rr, req)

// 		assert.Equal(t, http.StatusBadRequest, rr.Code)
// 		assert.Contains(t, rr.Body.String(), "Invalid metadata format")
// 	})

// 	t.Run("Insert received file failure", func(t *testing.T) {
// 		payload := fileHandler.SendFilePayload{
// 			FileID:          "file123",
// 			UserID:          "user1",
// 			RecipientID:     "user2",
// 			EncryptedFile:   base64.RawURLEncoding.EncodeToString([]byte("test file content")),
// 			EncryptedAESKey: "encryptedKey",
// 			EKPublicKey:     "publicKey",
// 			Metadata:        map[string]interface{}{"nonce": "abc123"},
// 		}
// 		payloadBytes, _ := json.Marshal(payload)

// 		// Setup mocks
// 		mockOwnCloud.On("UploadFile", "files/user1/sent", "file123", mock.Anything).Return(nil)
// 		mockMetadata.On(
// 			"InsertReceivedFile",
// 			mock.Anything, // *sql.DB
// 			"user2",
// 			"user1",
// 			"file123",
// 			mock.MatchedBy(func(metadata string) bool {
// 				var meta map[string]interface{}
// 				err := json.Unmarshal([]byte(metadata), &meta)
// 				return err == nil && meta["nonce"] == "abc123"
// 			}),
// 			mock.AnythingOfType("time.Time"),
// 		).Return(fmt.Errorf("db error"))

// 		req, err := http.NewRequest("POST", "/send-file", bytes.NewBuffer(payloadBytes))
// 		assert.NoError(t, err)
// 		req.Header.Set("Content-Type", "application/json")

// 		rr := httptest.NewRecorder()
// 		fileHandler.SendFileHandler(rr, req)

// 		assert.Equal(t, http.StatusInternalServerError, rr.Code)
// 		assert.Contains(t, rr.Body.String(), "Failed to track received file")

// 		// Verify mocks
// 		mockOwnCloud.AssertExpectations(t)
// 		mockMetadata.AssertExpectations(t)
// 	})
// }
