package unitTests

// import (
// 	"bytes"
// 	"context"
// 	"encoding/base64"
// 	"encoding/json"
// 	"errors"
// 	"net/http"
// 	"net/http/httptest"
// 	"os"
// 	"testing"
// 	//"time"

// 	"github.com/stretchr/testify/assert"
// 	"github.com/stretchr/testify/mock"

// 	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/crypto"
// 	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
// 	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
// 	"go.mongodb.org/mongo-driver/mongo"
// )

// // Mock for crypto.EncryptBytes
// // type MockCrypto struct {
// // 	mock.Mock
// // }

// func (m *MockCrypto) EncryptBytes(data []byte, key string) ([]byte, error) {
// 	args := m.Called(data, key)
// 	return args.Get(0).([]byte), args.Error(1)
// }

// // Mock for owncloud.UploadFile
// // type MockOwnCloud struct {
// // 	mock.Mock
// // }

// func (m *MockOwnCloud) UploadFile(path, filename string, data []byte) error {
// 	args := m.Called(path, filename, data)
// 	return args.Error(0)
// }

// // Mock for MongoDB collection
// type MockCollection struct {
// 	mock.Mock
// }

// func (m *MockCollection) InsertOne(ctx context.Context, doc interface{}) (interface{}, error) {
// 	args := m.Called(ctx, doc)
// 	return args.Get(0), args.Error(1)
// }

// // Mock for MongoDB client with Database method returning mock collection
// type MockMongoClient struct {
// 	mock.Mock
// }

// func (m *MockMongoClient) Database(name string) mongo.Database {
// 	args := m.Called(name)
// 	return args.Get(0).(mongo.Database)
// }

// func (m *MockMongoClient) Collection(name string) *MockCollection {
// 	args := m.Called(name)
// 	return args.Get(0).(*MockCollection)
// }

// func TestUploadHandler(t *testing.T) {
// 	mockCrypto := new(MockCrypto)
// 	mockOwnCloud := new(MockOwnCloud)
// 	//mockCollection := new(MockCollection)

// 	//  originalGetCollection := fileHandler.GetCollection
//     //  fileHandler.GetCollection = func() *mongo.Collection {
//     //     // Here you must return *mongo.Collection, but since you can't,
//     //     // you can define UploadHandler to accept interface or
//     //     // extract InsertOne call to a var and mock it.

//     //     // As a workaround, you can create a dummy *mongo.Collection and
//     //     // patch its InsertOne method via monkey patching with a library,
//     //     // or refactor UploadHandler to accept an interface for collection.
//     //     // This is the main limitation of testing mongo directly without abstraction.

//     //     // For now, panic or skip test if no refactor possible.
//     //     panic("Replace Mongo collection with mock or refactor handler")
//     // }

// 	// Override global funcs/vars for test
// 	origEncrypt := crypto.EncryptBytes
// 	origUpload := owncloud.UploadFile
// 	origMongoClient := fileHandler.MongoClient

// 	defer func() {
// 		crypto.EncryptBytes = origEncrypt
// 		owncloud.UploadFile = origUpload
// 		fileHandler.MongoClient = origMongoClient
// 	}()

// 	crypto.EncryptBytes = mockCrypto.EncryptBytes
// 	owncloud.UploadFile = mockOwnCloud.UploadFile

// 	// Setup MongoClient with mocked Collection method
// 	mockClient := &mongo.Client{}
// 	fileHandler.MongoClient = mockClient

// 	// We patch Collection method on client.Database("sfsp")
// 	// For simplicity, we create a local function
// 	// mockClient.Database = func(name string) mongo.Database {
// 	// 	return mockDatabase{name: name, collection: mockCollection}
// 	// }

// 	// Test values
// 	fileContent := "VGhpcyBpcyBhIHRlc3QgZmlsZSBjb250ZW50Lg==" // base64 "This is a test file content."
// 	fileBytes, _ := base64.StdEncoding.DecodeString(fileContent)

// 	t.Run("success", func(t *testing.T) {
// 		reqData := fileHandler.UploadRequest{
// 			FileName:      "file.txt",
// 			FileType:      "text/plain",
// 			UserID:        "user123",
// 			EncryptionKey: "encryptionKey",
// 			Description:   "desc",
// 			Tags:          []string{"tag1", "tag2"},
// 			Path:          "files",
// 			FileContent:   fileContent,
// 		}
// 		reqBody, _ := json.Marshal(reqData)

// 		mockCrypto.On("EncryptBytes", fileBytes, mock.Anything).Return([]byte("encrypted"), nil)
// 		mockOwnCloud.On("UploadFile", "files", "file.txt", []byte("encrypted")).Return(nil)
// 		//mockCollection.On("InsertOne", mock.Anything, mock.Anything).Return(nil, nil)

// 		os.Setenv("AES_KEY", "12345678901234567890123456789012")

// 		req := httptest.NewRequest("POST", "/upload", bytes.NewBuffer(reqBody))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.UploadHandler(w, req)
// 		//assert.Equal(t, http.StatusCreated, w.Result().StatusCode)
// 		//assert.Contains(t, w.Body.String(), "File uploaded and metadata stored")

// 		mockCrypto.AssertExpectations(t)
// 		mockOwnCloud.AssertExpectations(t)
// 		//mockCollection.AssertExpectations(t)
// 	})

// 	t.Run("invalid JSON", func(t *testing.T) {
// 		req := httptest.NewRequest("POST", "/upload", bytes.NewBuffer([]byte("invalid json")))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.UploadHandler(w, req)

// 		assert.Equal(t, http.StatusBadRequest, w.Result().StatusCode)
// 		assert.Contains(t, w.Body.String(), "Invalid JSON payload")
// 	})

// 	t.Run("missing required fields", func(t *testing.T) {
// 		reqData := fileHandler.UploadRequest{}
// 		reqBody, _ := json.Marshal(reqData)

// 		req := httptest.NewRequest("POST", "/upload", bytes.NewBuffer(reqBody))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.UploadHandler(w, req)

// 		assert.Equal(t, http.StatusBadRequest, w.Result().StatusCode)
// 		assert.Contains(t, w.Body.String(), "Missing required fields")
// 	})

// 	t.Run("invalid base64 content", func(t *testing.T) {
// 		reqData := fileHandler.UploadRequest{
// 			FileName:    "file.txt",
// 			FileContent: "!!!notbase64!!!",
// 		}
// 		reqBody, _ := json.Marshal(reqData)

// 		req := httptest.NewRequest("POST", "/upload", bytes.NewBuffer(reqBody))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.UploadHandler(w, req)

// 		assert.Equal(t, http.StatusBadRequest, w.Result().StatusCode)
// 		assert.Contains(t, w.Body.String(), "Invalid base64 file content")
// 	})

// 	t.Run("invalid AES key length", func(t *testing.T) {
// 		reqData := fileHandler.UploadRequest{
// 			FileName:    "file.txt",
// 			FileContent: fileContent,
// 		}
// 		reqBody, _ := json.Marshal(reqData)

// 		os.Setenv("AES_KEY", "badkey")

// 		req := httptest.NewRequest("POST", "/upload", bytes.NewBuffer(reqBody))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.UploadHandler(w, req)

// 		assert.Equal(t, http.StatusInternalServerError, w.Result().StatusCode)
// 		assert.Contains(t, w.Body.String(), "Invalid AES key")
// 	})

// 	t.Run("encryption failure", func(t *testing.T) {
// 		reqData := fileHandler.UploadRequest{
// 			FileName:    "file.txt",
// 			FileContent: fileContent,
// 		}
// 		reqBody, _ := json.Marshal(reqData)

// 		os.Setenv("AES_KEY", "12345678901234567890123456789012")

// 		mockCrypto.On("EncryptBytes", fileBytes, mock.Anything).Return(nil, errors.New("encryption error"))

// 		req := httptest.NewRequest("POST", "/upload", bytes.NewBuffer(reqBody))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.UploadHandler(w, req)

// 		assert.Equal(t, http.StatusInternalServerError, w.Result().StatusCode)
// 		//assert.Contains(t, w.Body.String(), "Encryption failed")

// 		mockCrypto.AssertExpectations(t)
// 	})

// 	t.Run("upload failure", func(t *testing.T) {
// 		reqData := fileHandler.UploadRequest{
// 			FileName:    "file.txt",
// 			FileContent: fileContent,
// 		}
// 		reqBody, _ := json.Marshal(reqData)

// 		os.Setenv("AES_KEY", "12345678901234567890123456789012")

// 		mockCrypto.On("EncryptBytes", fileBytes, mock.Anything).Return([]byte("encrypted"), nil)
// 		mockOwnCloud.On("UploadFile", "files", "file.txt", []byte("encrypted")).Return(errors.New("upload error"))

// 		req := httptest.NewRequest("POST", "/upload", bytes.NewBuffer(reqBody))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.UploadHandler(w, req)

// 		assert.Equal(t, http.StatusInternalServerError, w.Result().StatusCode)
// 		//assert.Contains(t, w.Body.String(), "Upload failed")

// 		mockCrypto.AssertExpectations(t)
// 		mockOwnCloud.AssertExpectations(t)
// 	})

// 	t.Run("metadata storage failure", func(t *testing.T) {
// 		reqData := fileHandler.UploadRequest{
// 			FileName:    "file.txt",
// 			FileContent: fileContent,
// 		}
// 		reqBody, _ := json.Marshal(reqData)

// 		os.Setenv("AES_KEY", "12345678901234567890123456789012")

// 		mockCrypto.On("EncryptBytes", fileBytes, mock.Anything).Return([]byte("encrypted"), nil)
// 		mockOwnCloud.On("UploadFile", "files", "file.txt", []byte("encrypted")).Return(nil)
// 		//mockCollection.On("InsertOne", mock.Anything, mock.Anything).Return(nil, errors.New("db error"))

// 		req := httptest.NewRequest("POST", "/upload", bytes.NewBuffer(reqBody))
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.UploadHandler(w, req)

// 		assert.Equal(t, http.StatusInternalServerError, w.Result().StatusCode)
// 		//assert.Contains(t, w.Body.String(), "Metadata storage failed")

// 		mockCrypto.AssertExpectations(t)
// 		mockOwnCloud.AssertExpectations(t)
// 		//mockCollection.AssertExpectations(t)
// 	})
// }

// type mockDatabase struct {
// 	name       string
// 	collection *MockCollection
// }
