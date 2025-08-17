//go:build integration
// +build integration

package integration_test

import (
	"bytes"
	"database/sql"
	//"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	monkey "bou.ke/monkey"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	fh "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/metadata"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
)

/* ------------------------------ helpers ----------------------------------- */

//type memStore struct{ m map[string][]byte }

// func (s *memStore) put(key string, data []byte) { s.m[key] = append([]byte(nil), data...) }
// func (s *memStore) get(key string) ([]byte, bool) {
// 	b, ok := s.m[key]
// 	if !ok {
// 		return nil, false
// 	}
// 	return append([]byte(nil), b...), true
// }
// func (s *memStore) del(key string) { delete(s.m, key) }

func patchOwncloud(t *testing.T, s *memStore, opts ...func(path, name string) error) {
	t.Helper()

	// optional hook for simulating errors on UploadFileStream
	var uploadHook func(path, name string) error
	if len(opts) > 0 {
		uploadHook = opts[0]
	}

	monkey.Patch(owncloud.UploadFileStream, func(path, name string, r io.Reader) error {
		if uploadHook != nil {
			if err := uploadHook(path, name); err != nil {
				return err
			}
		}
		key := strings.TrimSuffix(path, "/") + "/" + name
		data, _ := io.ReadAll(r)
		s.put(key, data)
		return nil
	})
	monkey.Patch(owncloud.DownloadFileStreamTemp, func(chunkPath string) (io.ReadCloser, error) {
		if b, ok := s.get(chunkPath); ok {
			return io.NopCloser(bytes.NewReader(b)), nil
		}
		return nil, fmt.Errorf("temp chunk not found: %s", chunkPath)
	})
	monkey.Patch(owncloud.DeleteFileTemp, func(chunkPath string) error {
		s.del(chunkPath)
		return nil
	})
}

// Build a multipart/form-data body with fields and one file part.
func makeMultipart(t *testing.T, fields map[string]string, fileField, fileName string, fileBytes []byte) (*bytes.Buffer, string) {
	t.Helper()
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	for k, v := range fields {
		require.NoError(t, w.WriteField(k, v))
	}
	if fileField != "" {
		fw, err := w.CreateFormFile(fileField, fileName)
		require.NoError(t, err)
		_, _ = fw.Write(fileBytes)
	}
	require.NoError(t, w.Close())
	return &buf, w.FormDataContentType()
}

/* ------------------------------ tests ------------------------------------- */

func TestSendFileHandler_InvalidContentType(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)

	// Not multipart => ParseMultipartForm fails
	req := httptest.NewRequest(http.MethodPost, "/send", bytes.NewBufferString(`{"x":1}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	fh.SendFileHandler(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid multipart form")
}

func TestSendFileHandler_MissingFields(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)
	s := &memStore{m: map[string][]byte{}}
	patchOwncloud(t, s)

	body, ctype := makeMultipart(t, map[string]string{
		"userId": "u1",
		// missing most required fields
	}, "encryptedFile", "x.bin", []byte("x"))
	req := httptest.NewRequest(http.MethodPost, "/send", body)
	req.Header.Set("Content-Type", ctype)
	rr := httptest.NewRecorder()

	fh.SendFileHandler(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Missing required form fields")
}

func TestSendFileHandler_InvalidIndicesOrMissingFile(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)
	s := &memStore{m: map[string][]byte{}}
	patchOwncloud(t, s)

	// invalid chunkIndex
	body, ctype := makeMultipart(t, map[string]string{
		"fileid":         "f1",
		"userId":         "u1",
		"recipientUserId":"u2",
		"metadata":       `{}`,
		"chunkIndex":     "bad",
		"totalChunks":    "1",
	}, "encryptedFile", "x.bin", []byte("x"))
	req := httptest.NewRequest(http.MethodPost, "/send", body)
	req.Header.Set("Content-Type", ctype)
	rr := httptest.NewRecorder()
	fh.SendFileHandler(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid chunkIndex")

	// missing file part
	body2, ctype2 := makeMultipart(t, map[string]string{
		"fileid":         "f1",
		"userId":         "u1",
		"recipientUserId":"u2",
		"metadata":       `{}`,
		"chunkIndex":     "0",
		"totalChunks":    "1",
	}, "", "", nil)
	req2 := httptest.NewRequest(http.MethodPost, "/send", body2)
	req2.Header.Set("Content-Type", ctype2)
	rr2 := httptest.NewRecorder()
	fh.SendFileHandler(rr2, req2)
	assert.Equal(t, http.StatusBadRequest, rr2.Code)
	assert.Contains(t, rr2.Body.String(), "Missing encrypted file chunk")
}

func TestSendFileHandler_TempUploadFail(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)
	s := &memStore{m: map[string][]byte{}}
	// Fail only when writing to "temp"
	patchOwncloud(t, s, func(path, name string) error {
		if path == "temp" {
			return fmt.Errorf("simulated temp upload error")
		}
		return nil
	})
	// Patch metadata to ensure it's not called (but harmless if it is)
	monkey.Patch(metadata.InsertReceivedFile, func(db *sql.DB, recipientID, senderID, fileID, metadataJSON string, expiresAt time.Time) (string, error) {
		return "", fmt.Errorf("should not be called")
	})

	body, ctype := makeMultipart(t, map[string]string{
		"fileid":         "f1",
		"userId":         "u1",
		"recipientUserId":"u2",
		"metadata":       `{}`,
		"chunkIndex":     "0",
		"totalChunks":    "1",
	}, "encryptedFile", "x.bin", []byte("x"))
	req := httptest.NewRequest(http.MethodPost, "/send", body)
	req.Header.Set("Content-Type", ctype)
	rr := httptest.NewRecorder()
	fh.SendFileHandler(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Chunk upload failed")
}

func TestSendFileHandler_AckIntermediateChunk(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)
	s := &memStore{m: map[string][]byte{}}
	patchOwncloud(t, s)
	// Patch metadata to avoid DB usage if handler tried (it shouldn't for non-final)
	monkey.Patch(metadata.InsertReceivedFile, func(db *sql.DB, recipientID, senderID, fileID, metadataJSON string, expiresAt time.Time) (string, error) {
		return "", nil
	})

	fields := map[string]string{
		"fileid":         "f1",
		"userId":         "u1",
		"recipientUserId":"u2",
		"metadata":       `{"a":1}`,
		"chunkIndex":     "0",
		"totalChunks":    "2",
	}
	body, ctype := makeMultipart(t, fields, "encryptedFile", "c0.bin", []byte("AAA"))
	req := httptest.NewRequest(http.MethodPost, "/send", body)
	req.Header.Set("Content-Type", ctype)
	rr := httptest.NewRecorder()

	fh.SendFileHandler(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), `"Chunk 0 uploaded"`)
	// chunk persisted in temp
	got, ok := s.get("temp/f1_chunk_0")
	require.True(t, ok)
	assert.Equal(t, []byte("AAA"), got)
}

func TestSendFileHandler_FinalMerge_Success_AndDBTracking(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)
	s := &memStore{m: map[string][]byte{}}
	patchOwncloud(t, s)

	// Pre-store first chunk in temp to simulate previous request
	s.put("temp/F2_chunk_0", []byte("HELLO "))

	// Patch metadata layer
	var gotRecip, gotSender, gotFile, gotMeta string
	var gotExpire time.Time
	monkey.Patch(metadata.InsertReceivedFile, func(db *sql.DB, recipientID, senderID, fileID, metadataJSON string, expiresAt time.Time) (string, error) {
		gotRecip, gotSender, gotFile, gotMeta, gotExpire = recipientID, senderID, fileID, metadataJSON, expiresAt
		return "rf-123", nil
	})
	var sentCalled bool
	monkey.Patch(metadata.InsertSentFile, func(db *sql.DB, senderID, recipientID, fileID, metadataJSON string) error {
		sentCalled = true
		return nil
	})

	fields := map[string]string{
		"fileid":         "F2",
		"userId":         "SENDER",
		"recipientUserId":"RECIP",
		"metadata":       `{"k":"v"}`,
		"chunkIndex":     "1",
		"totalChunks":    "2",
	}
	body, ctype := makeMultipart(t, fields, "encryptedFile", "c1.bin", []byte("WORLD"))
	req := httptest.NewRequest(http.MethodPost, "/send", body)
	req.Header.Set("Content-Type", ctype)
	rr := httptest.NewRecorder()

	fh.SendFileHandler(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), `"message":"File sent successfully"`)
	assert.Contains(t, rr.Body.String(), `"receivedFileID":"rf-123"`)

	// Verify final uploaded content at files/SENDER/sent/F2
	finalKey := "files/SENDER/sent/F2"
	got, ok := s.get(finalKey)
	require.True(t, ok)
	assert.Equal(t, []byte("HELLO WORLD"), got)

	// Verify metadata.InsertReceivedFile args
	assert.Equal(t, "RECIP", gotRecip)
	assert.Equal(t, "SENDER", gotSender)
	assert.Equal(t, "F2", gotFile)
	assert.Equal(t, `{"k":"v"}`, gotMeta)
	assert.WithinDuration(t, time.Now().Add(48*time.Hour), gotExpire, time.Hour)

	// InsertSentFile was called (non-fatal if it fails)
	assert.True(t, sentCalled)
}

func TestSendFileHandler_FinalUploadFail(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)
	s := &memStore{m: map[string][]byte{}}
	patchOwncloud(t, s)

	s.put("temp/F3_chunk_0", []byte("A"))
	monkey.Patch(owncloud.UploadFileStream, func(path, name string, r io.Reader) error {
		_, _ = io.Copy(io.Discard, r)
		if strings.HasPrefix(path, "files/") && strings.HasSuffix(path, "/sent") {
			return fmt.Errorf("simulated final upload error")
		}
		key := strings.TrimSuffix(path, "/") + "/" + name
		data, _ := io.ReadAll(bytes.NewReader(nil))
		s.put(key, data)
		return nil
	})

	body, ctype := makeMultipart(t, map[string]string{
		"fileid":         "F3",
		"userId":         "S",
		"recipientUserId":"R",
		"metadata":       `{}`,
		"chunkIndex":     "1",
		"totalChunks":    "2",
	}, "encryptedFile", "c1.bin", []byte("B"))

	req := httptest.NewRequest(http.MethodPost, "/send", body)
	req.Header.Set("Content-Type", ctype)
	rr := httptest.NewRecorder()

	fh.SendFileHandler(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to store encrypted file")
}

func TestSendFileHandler_InsertReceivedFileFails(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)
	s := &memStore{m: map[string][]byte{}}
	patchOwncloud(t, s)
	// Pre-store chunk 0
	s.put("temp/F4_chunk_0", []byte("A"))

	monkey.Patch(metadata.InsertReceivedFile, func(db *sql.DB, recipientID, senderID, fileID, metadataJSON string, expiresAt time.Time) (string, error) {
		return "", fmt.Errorf("db error on received")
	})
	// InsertSentFile shouldn't matter; handler 500s before using it.

	body, ctype := makeMultipart(t, map[string]string{
		"fileid":         "F4",
		"userId":         "S",
		"recipientUserId":"R",
		"metadata":       `{}`,
		"chunkIndex":     "1",
		"totalChunks":    "2",
	}, "encryptedFile", "c1.bin", []byte("B"))
	req := httptest.NewRequest(http.MethodPost, "/send", body)
	req.Header.Set("Content-Type", ctype)
	rr := httptest.NewRecorder()

	fh.SendFileHandler(rr, req)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to track received file")
}

func TestSendFileHandler_InsertSentFileFails_ButResponseStillOK(t *testing.T) {
	t.Cleanup(monkey.UnpatchAll)
	s := &memStore{m: map[string][]byte{}}
	patchOwncloud(t, s)
	// Pre-store chunk 0
	s.put("temp/F5_chunk_0", []byte("LEFT-"))

	monkey.Patch(metadata.InsertReceivedFile, func(db *sql.DB, recipientID, senderID, fileID, metadataJSON string, expiresAt time.Time) (string, error) {
		return "rf-999", nil
	})
	monkey.Patch(metadata.InsertSentFile, func(db *sql.DB, senderID, recipientID, fileID, metadataJSON string) error {
		return fmt.Errorf("sent insert failed (non-fatal)")
	})

	body, ctype := makeMultipart(t, map[string]string{
		"fileid":         "F5",
		"userId":         "S",
		"recipientUserId":"R",
		"metadata":       `{}`,
		"chunkIndex":     "1",
		"totalChunks":    "2",
	}, "encryptedFile", "c1.bin", []byte("RIGHT"))
	req := httptest.NewRequest(http.MethodPost, "/send", body)
	req.Header.Set("Content-Type", ctype)
	rr := httptest.NewRecorder()

	fh.SendFileHandler(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), `"receivedFileID":"rf-999"`)

	// Final content present
	got, ok := s.get("files/S/sent/F5")
	require.True(t, ok)
	assert.Equal(t, []byte("LEFT-RIGHT"), got)
}
