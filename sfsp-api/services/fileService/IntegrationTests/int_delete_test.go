//go:build integration
// +build integration

package integration_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	monkey "bou.ke/monkey"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	fh "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/metadata"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)

func doDeleteReq(t *testing.T, body any) (*httptest.ResponseRecorder, []byte) {
	t.Helper()

	var rdr io.Reader
	switch v := body.(type) {
	case string:
		rdr = bytes.NewBufferString(v)
	case []byte:
		rdr = bytes.NewBuffer(v)
	default:
		b, err := json.Marshal(v)
		require.NoError(t, err)
		rdr = bytes.NewBuffer(b)
	}

	req := httptest.NewRequest(http.MethodPost, "/delete", rdr)
	rr := httptest.NewRecorder()

	fh.DeleteFileHandler(rr, req)
	return rr, rr.Body.Bytes()
}

func TestDeleteFileHandler_InvalidJSON(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)

	rr, body := doDeleteReq(t, `{"fileId": "abc", "userId":`)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, string(body), "Invalid JSON payload")
}

func TestDeleteFileHandler_MissingFileID(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)

	rr, body := doDeleteReq(t, map[string]string{
		"fileId": "",
		"userId": "user-1",
	})
	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, string(body), "Missing fileId")
}

func TestDeleteFileHandler_MissingUserID(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)

	rr, body := doDeleteReq(t, map[string]string{
		"fileId": "file-1",
		"userId": "",
	})
	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, string(body), "Missing UserID")
}

func TestDeleteFileHandler_OwnCloudDeleteFails(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)

	var gotFileID, gotUserID string
	monkey.Patch(owncloud.DeleteFile, func(fileID, userID string) error {
		gotFileID, gotUserID = fileID, userID
		return fmt.Errorf("simulated owncloud failure")
	})
	monkey.Patch(metadata.DeleteFileMetadata, func(fileID string) error {
		return fmt.Errorf("metadata should not have been called")
	})

	rr, body := doDeleteReq(t, map[string]string{
		"fileId": "file-123",
		"userId": "user-abc",
	})

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, string(body), "File delete failed")
	assert.Equal(t, "file-123", gotFileID)
	assert.Equal(t, "user-abc", gotUserID)
}

func TestDeleteFileHandler_MetadataDeleteFails(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)

	var owncloudCalled bool
	monkey.Patch(owncloud.DeleteFile, func(fileID, userID string) error {
		owncloudCalled = true
		return nil
	})
	monkey.Patch(metadata.DeleteFileMetadata, func(fileID string) error {
		return fmt.Errorf("simulated metadata failure")
	})

	rr, body := doDeleteReq(t, map[string]string{
		"fileId": "file-xyz",
		"userId": "user-999",
	})

	assert.True(t, owncloudCalled, "owncloud.DeleteFile should be called before metadata")
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, string(body), "File delete failed")
}

func TestDeleteFileHandler_Success(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)

	var owncloudCalled, metadataCalled bool
	var ocFile, ocUser, mdFile string

	monkey.Patch(owncloud.DeleteFile, func(fileID, userID string) error {
		owncloudCalled = true
		ocFile, ocUser = fileID, userID
		return nil
	})
	monkey.Patch(metadata.DeleteFileMetadata, func(fileID string) error {
		metadataCalled = true
		mdFile = fileID
		return nil
	})

	rr, body := doDeleteReq(t, map[string]string{
		"fileId": "f-42",
		"userId": "u-7",
	})

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Header().Get("Content-Type"), "application/json")
	assert.Contains(t, string(body), "File successfully deleted")

	assert.True(t, owncloudCalled)
	assert.True(t, metadataCalled)
	assert.Equal(t, "f-42", ocFile)
	assert.Equal(t, "u-7", ocUser)
	assert.Equal(t, "f-42", mdFile)
}
