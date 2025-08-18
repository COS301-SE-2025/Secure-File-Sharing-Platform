package unitTests

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
)


func TestCreateFolderHandler_Success(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	testUserID := "user123"
	testFolderName := "MyFolder"
	testDescription := "Test folder description"
	testFolderID := "folder456"

	mock.ExpectQuery(`INSERT INTO files`).
		WithArgs(
			testUserID,
			testFolderName,
			testFolderName, 
			testDescription,
			pq.Array([]string{"folder"}),
		).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(testFolderID))

	reqBody := map[string]interface{}{
		"userId":      testUserID,
		"folderName":  testFolderName,
		"description": testDescription,
	}
	jsonBody, _ := json.Marshal(reqBody)

	req, err := http.NewRequest("POST", "/create-folder", bytes.NewBuffer(jsonBody))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()

	fileHandler.CreateFolderHandler(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))
	assert.Equal(t, "*", rr.Header().Get("Access-Control-Allow-Origin"))
	assert.Equal(t, "Content-Type", rr.Header().Get("Access-Control-Allow-Headers"))

	var response map[string]string
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, testFolderID, response["folderId"])
	assert.Equal(t, testFolderName, response["cid"])

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestCreateFolderHandler_SuccessWithParentPath(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	testUserID := "user123"
	testFolderName := "SubFolder"
	testParentPath := "my/docs/"
	testDescription := "Test sub folder"
	testFolderID := "folder789"
	expectedCID := "my/docs/SubFolder"
	mock.ExpectQuery(`INSERT INTO files`).
		WithArgs(
			testUserID,
			testFolderName,
			expectedCID,
			testDescription,
			pq.Array([]string{"folder"}),
		).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(testFolderID))

	reqBody := map[string]interface{}{
		"userId":      testUserID,
		"folderName":  testFolderName,
		"parentPath":  testParentPath,
		"description": testDescription,
	}
	jsonBody, _ := json.Marshal(reqBody)

	req, err := http.NewRequest("POST", "/create-folder", bytes.NewBuffer(jsonBody))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	fileHandler.CreateFolderHandler(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)

	var response map[string]string
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, testFolderID, response["folderId"])
	assert.Equal(t, expectedCID, response["cid"])

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestCreateFolderHandler_SuccessWithParentPathNoTrailingSlash(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	testUserID := "user123"
	testFolderName := "SubFolder"
	testParentPath := "my/docs"
	testDescription := "Test sub folder"
	testFolderID := "folder789"
	expectedCID := "my/docs/SubFolder"

	mock.ExpectQuery(`INSERT INTO files`).
		WithArgs(
			testUserID,
			testFolderName,
			expectedCID,
			testDescription,
			pq.Array([]string{"folder"}),
		).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(testFolderID))

	reqBody := map[string]interface{}{
		"userId":      testUserID,
		"folderName":  testFolderName,
		"parentPath":  testParentPath,
		"description": testDescription,
	}
	jsonBody, _ := json.Marshal(reqBody)

	req, err := http.NewRequest("POST", "/create-folder", bytes.NewBuffer(jsonBody))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()

	fileHandler.CreateFolderHandler(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var response map[string]string
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, expectedCID, response["cid"])

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestCreateFolderHandler_InvalidJSON(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	req, err := http.NewRequest("POST", "/create-folder", bytes.NewBuffer([]byte("invalid json")))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()

	fileHandler.CreateFolderHandler(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid JSON")
}

func TestCreateFolderHandler_MissingUserID(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	reqBody := map[string]interface{}{
		"folderName":  "TestFolder",
		"description": "Test description",
	}
	jsonBody, _ := json.Marshal(reqBody)

	req, err := http.NewRequest("POST", "/create-folder", bytes.NewBuffer(jsonBody))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()

	fileHandler.CreateFolderHandler(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Missing userId or folderName")
}

func TestCreateFolderHandler_MissingFolderName(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	reqBody := map[string]interface{}{
		"userId":      "user123",
		"description": "Test description",
	}
	jsonBody, _ := json.Marshal(reqBody)

	req, err := http.NewRequest("POST", "/create-folder", bytes.NewBuffer(jsonBody))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()

	fileHandler.CreateFolderHandler(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Missing userId or folderName")
}

func TestCreateFolderHandler_EmptyUserID(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	reqBody := map[string]interface{}{
		"userId":      "",
		"folderName":  "TestFolder",
		"description": "Test description",
	}
	jsonBody, _ := json.Marshal(reqBody)

	req, err := http.NewRequest("POST", "/create-folder", bytes.NewBuffer(jsonBody))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()

	fileHandler.CreateFolderHandler(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Missing userId or folderName")
}

func TestCreateFolderHandler_EmptyFolderName(t *testing.T) {
	_, cleanup := SetupMockDB(t)
	defer cleanup()

	reqBody := map[string]interface{}{
		"userId":      "user123",
		"folderName":  "",
		"description": "Test description",
	}
	jsonBody, _ := json.Marshal(reqBody)

	req, err := http.NewRequest("POST", "/create-folder", bytes.NewBuffer(jsonBody))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()

	fileHandler.CreateFolderHandler(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Missing userId or folderName")
}

func TestCreateFolderHandler_DatabaseError(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	testUserID := "user123"
	testFolderName := "TestFolder"
	testDescription := "Test description"

	mock.ExpectQuery(`INSERT INTO files`).
		WithArgs(
			testUserID,
			testFolderName,
			testFolderName,
			testDescription,
			pq.Array([]string{"folder"}),
		).
		WillReturnError(sql.ErrConnDone)

	reqBody := map[string]interface{}{
		"userId":      testUserID,
		"folderName":  testFolderName,
		"description": testDescription,
	}
	jsonBody, _ := json.Marshal(reqBody)

	req, err := http.NewRequest("POST", "/create-folder", bytes.NewBuffer(jsonBody))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()

	fileHandler.CreateFolderHandler(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to create folder")

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestCreateFolderHandler_OptionalFields(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	testUserID := "user123"
	testFolderName := "MinimalFolder"
	testFolderID := "folder999"

	mock.ExpectQuery(`INSERT INTO files`).
		WithArgs(
			testUserID,
			testFolderName,
			testFolderName,
			"", 
			pq.Array([]string{"folder"}),
		).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(testFolderID))

	reqBody := map[string]interface{}{
		"userId":     testUserID,
		"folderName": testFolderName,
	}
	jsonBody, _ := json.Marshal(reqBody)

	req, err := http.NewRequest("POST", "/create-folder", bytes.NewBuffer(jsonBody))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()

	fileHandler.CreateFolderHandler(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var response map[string]string
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, testFolderID, response["folderId"])
	assert.Equal(t, testFolderName, response["cid"])

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestCreateFolderHandler_CORSHeaders(t *testing.T) {
	mock, cleanup := SetupMockDB(t)
	defer cleanup()

	mock.ExpectQuery(`INSERT INTO files`).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow("test-id"))

	reqBody := map[string]interface{}{
		"userId":     "user123",
		"folderName": "TestFolder",
	}
	jsonBody, _ := json.Marshal(reqBody)

	req, err := http.NewRequest("POST", "/create-folder", bytes.NewBuffer(jsonBody))
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	fileHandler.CreateFolderHandler(rr, req)

	assert.Equal(t, "*", rr.Header().Get("Access-Control-Allow-Origin"))
	assert.Equal(t, "Content-Type", rr.Header().Get("Access-Control-Allow-Headers"))
}