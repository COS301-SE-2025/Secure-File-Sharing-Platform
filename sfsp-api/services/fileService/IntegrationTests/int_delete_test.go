// package fileHandler_test

package integrationTests

// import (
// 	"bytes"
// 	"encoding/json"
// 	"errors"
// 	"net/http"
// 	"net/http/httptest"
// 	"testing"

// 	"bou.ke/monkey"
// 	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
// 	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/metadata"
// 	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
// 	"github.com/stretchr/testify/assert"
// )

// func TestDeleteFileHandler(t *testing.T) {
// 	t.Run("Successful Deletion", func(t *testing.T) {: Patch owncloud and metadata functions
// 		monkey.Patch(owncloud.DeleteFile, func(fileID, userID string) error {
// 			return nil
// 		})
// 		defer monkey.Unpatch(owncloud.DeleteFile)

// 		monkey.Patch(metadata.DeleteFileMetadata, func(fileID string) error {
// 			return nil
// 		})
// 		defer monkey.Unpatch(metadata.DeleteFileMetadata)

// 		reqBody, _ := json.Marshal(fileHandler.DeleteRequest{
// 			FileId: "file123",
// 			UserID: "user456",
// 		})
// 		req := httptest.NewRequest(http.MethodPost, "/delete", bytes.NewReader(reqBody))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.DeleteFileHandler(w, req)

// 		assert.Equal(t, http.StatusOK, w.Code)
// 		var response map[string]string
// 		err := json.NewDecoder(w.Body).Decode(&response)
// 		assert.NoError(t, err)
// 		assert.Equal(t, "File successfully deleted", response["message"])
// 	})

// 	t.Run("Missing FileID", func(t *testing.T) {
// 		reqBody, _ := json.Marshal(fileHandler.DeleteRequest{
// 			FileId: "",
// 			UserID: "user456",
// 		})
// 		req := httptest.NewRequest(http.MethodPost, "/delete", bytes.NewReader(reqBody))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.DeleteFileHandler(w, req)
// 		assert.Equal(t, http.StatusBadRequest, w.Code)
// 		assert.Contains(t, w.Body.String(), "Missing fileId")
// 	})

// 	t.Run("Missing UserID", func(t *testing.T) {
// 		reqBody, _ := json.Marshal(fileHandler.DeleteRequest{
// 			FileId: "file123",
// 			UserID: "",
// 		})
// 		req := httptest.NewRequest(http.MethodPost, "/delete", bytes.NewReader(reqBody))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.DeleteFileHandler(w, req)

// 		assert.Equal(t, http.StatusBadRequest, w.Code)
// 		assert.Contains(t, w.Body.String(), "Missing UserID")
// 	})

// 	t.Run("Invalid JSON Payload", func(t *testing.T) {
// 		req := httptest.NewRequest(http.MethodPost, "/delete", bytes.NewReader([]byte("{invalid json}")))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.DeleteFileHandler(w, req)

// 		assert.Equal(t, http.StatusBadRequest, w.Code)
// 		assert.Contains(t, w.Body.String(), "Invalid JSON payload")
// 	})

// 	t.Run("OwnCloud Delete Failure", func(t *testing.T) {
// 		monkey.Patch(owncloud.DeleteFile, func(fileID, userID string) error {
// 			return errors.New("OwnCloud error")
// 		})
// 		defer monkey.Unpatch(owncloud.DeleteFile)

// 		monkey.Patch(metadata.DeleteFileMetadata, func(fileID string) error {
// 			return nil
// 		})
// 		defer monkey.Unpatch(metadata.DeleteFileMetadata)

// 		reqBody, _ := json.Marshal(fileHandler.DeleteRequest{
// 			FileId: "file123",
// 			UserID: "user456",
// 		})
// 		req := httptest.NewRequest(http.MethodPost, "/delete", bytes.NewReader(reqBody))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.DeleteFileHandler(w, req)

// 		assert.Equal(t, http.StatusInternalServerError, w.Code)
// 		assert.Contains(t, w.Body.String(), "File delete failed")
// 	})

// 	t.Run("Metadata Delete Failure", func(t *testing.T) {
// 		monkey.Patch(owncloud.DeleteFile, func(fileID, userID string) error {
// 			return nil
// 		})
// 		defer monkey.Unpatch(owncloud.DeleteFile)

// 		monkey.Patch(metadata.DeleteFileMetadata, func(fileID string) error {
// 			return errors.New("Metadata error")
// 		})
// 		defer monkey.Unpatch(metadata.DeleteFileMetadata)

// 		reqBody, _ := json.Marshal(fileHandler.DeleteRequest{
// 			FileId: "file123",
// 			UserID: "user456",
// 		})
// 		req := httptest.NewRequest(http.MethodPost, "/delete", bytes.NewReader(reqBody))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.DeleteFileHandler(w, req)

// 		assert.Equal(t, http.StatusInternalServerError, w.Code)
// 		assert.Contains(t, w.Body.String(), "File delete failed")
// 	})
// }
