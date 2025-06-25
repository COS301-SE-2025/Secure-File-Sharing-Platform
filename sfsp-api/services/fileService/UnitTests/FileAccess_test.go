// package unitTests

// import (
// 	"bytes"
// 	"database/sql"
// 	"encoding/json"
// 	"errors"
// 	"net/http"
// 	"net/http/httptest"
// 	"testing"
// 	//"time"

// 	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
// 	"github.com/stretchr/testify/assert"
// )

// type mockDB struct {
// 	execFunc  func(query string, args ...interface{}) (sql.Result, error)
// 	queryFunc func(query string, args ...interface{}) (*sql.Rows, error)
// }

// func (m *mockDB) Exec(query string, args ...interface{}) (sql.Result, error) {
// 	return m.execFunc(query, args...)
// }

// func (m *mockDB) Query(query string, args ...interface{}) (*sql.Rows, error) {
// 	return m.queryFunc(query, args...)
// }

// func injectMockDB(execFunc func(string, ...interface{}) (sql.Result, error), queryFunc func(string, ...interface{}) (*sql.Rows, error)) {
// 	fileHandler.DB = &mockDB{
// 		execFunc:  execFunc,
// 		queryFunc: queryFunc,
// 	}
// }

// func TestAddAccesslogHandler_Success(t *testing.T) {
// 	injectMockDB(
// 		func(query string, args ...interface{}) (sql.Result, error) {
// 			return nil, nil
// 		},
// 		nil,
// 	)

// 	body := map[string]string{
// 		"file_id": "file123",
// 		"user_id": "user123",
// 		"action":  "read",
// 	}
// 	jsonBody, _ := json.Marshal(body)
// 	req := httptest.NewRequest(http.MethodPost, "/add-log", bytes.NewBuffer(jsonBody))
// 	w := httptest.NewRecorder()

// 	fileHandler.AddAccesslogHandler(w, req)

// 	assert.Equal(t, http.StatusCreated, w.Result().StatusCode)
// 	assert.Contains(t, w.Body.String(), "Access log added successfully")
// }

// func TestAddAccesslogHandler_InvalidJSON(t *testing.T) {
// 	req := httptest.NewRequest(http.MethodPost, "/add-log", bytes.NewBuffer([]byte("{invalid json")))
// 	w := httptest.NewRecorder()

// 	fileHandler.AddAccesslogHandler(w, req)

// 	assert.Equal(t, http.StatusBadRequest, w.Result().StatusCode)
// }

// func TestAddAccesslogHandler_MissingFields(t *testing.T) {
// 	body := map[string]string{
// 		"file_id": "file123",
// 	}
// 	jsonBody, _ := json.Marshal(body)
// 	req := httptest.NewRequest(http.MethodPost, "/add-log", bytes.NewBuffer(jsonBody))
// 	w := httptest.NewRecorder()

// 	fileHandler.AddAccesslogHandler(w, req)

// 	assert.Equal(t, http.StatusBadRequest, w.Result().StatusCode)
// }

// func TestAddAccesslogHandler_DBError(t *testing.T) {
// 	injectMockDB(
// 		func(query string, args ...interface{}) (sql.Result, error) {
// 			return nil, errors.New("db error")
// 		},
// 		nil,
// 	)

// 	body := map[string]string{
// 		"file_id": "file123",
// 		"user_id": "user123",
// 		"action":  "read",
// 	}
// 	jsonBody, _ := json.Marshal(body)
// 	req := httptest.NewRequest(http.MethodPost, "/add-log", bytes.NewBuffer(jsonBody))
// 	w := httptest.NewRecorder()

// 	fileHandler.AddAccesslogHandler(w, req)

// 	assert.Equal(t, http.StatusInternalServerError, w.Result().StatusCode)
// }

// func TestRemoveAccesslogHandler_Success(t *testing.T) {
// 	injectMockDB(
// 		func(query string, args ...interface{}) (sql.Result, error) {
// 			return nil, nil
// 		},
// 		nil,
// 	)

// 	req := httptest.NewRequest(http.MethodDelete, "/remove-log?id=123", nil)
// 	w := httptest.NewRecorder()

// 	fileHandler.RemoveAccesslogHandler(w, req)

// 	assert.Equal(t, http.StatusOK, w.Result().StatusCode)
// 	assert.Contains(t, w.Body.String(), "Access log removed successfully")
// }

// func TestRemoveAccesslogHandler_MissingID(t *testing.T) {
// 	req := httptest.NewRequest(http.MethodDelete, "/remove-log", nil)
// 	w := httptest.NewRecorder()

// 	fileHandler.RemoveAccesslogHandler(w, req)

// 	assert.Equal(t, http.StatusBadRequest, w.Result().StatusCode)
// }

// func TestRemoveAccesslogHandler_DBError(t *testing.T) {
// 	injectMockDB(
// 		func(query string, args ...interface{}) (sql.Result, error) {
// 			return nil, errors.New("delete error")
// 		},
// 		nil,
// 	)

// 	req := httptest.NewRequest(http.MethodDelete, "/remove-log?id=123", nil)
// 	w := httptest.NewRecorder()

// 	fileHandler.RemoveAccesslogHandler(w, req)

// 	assert.Equal(t, http.StatusInternalServerError, w.Result().StatusCode)
// }
