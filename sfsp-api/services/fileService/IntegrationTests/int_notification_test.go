// package fileHandler_test

package integration_test

// import (
// 	"bytes"
// 	"database/sql"
// 	"encoding/json"
// 	"fmt"
// 	"net/http"
// 	"net/http/httptest"
// 	"testing"

// 	"github.com/google/uuid"

// 	_ "github.com/lib/pq"
// 	"github.com/stretchr/testify/assert"
// 	"github.com/stretchr/testify/require"

// 	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler" // Adjust import path as needed
// )

// var (
// 	testDBHost     = "localhost"
// 	testDBPort     = 5432
// 	testDBUser     = "admin"
// 	testDBPassword = "admin"
// 	testDBName     = "file_service_db"
// )

// type testNotification struct {
// 	ID        string `json:"id"`
// 	Type      string `json:"type"`
// 	From      string `json:"from"`
// 	To        string `json:"to"`
// 	FileName  string `json:"file_name"`
// 	FileID    string `json:"file_id"`
// 	Message   string `json:"message"`
// 	Timestamp string `json:"timestamp"`
// 	Status    string `json:"status"`
// 	Read      bool   `json:"read"`
// }

// func setupTestDB(t *testing.T) func() {
// 	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
// 		testDBHost, testDBPort, testDBUser, testDBPassword, testDBName)

// 	db, err := sql.Open("postgres", dsn)
// 	require.NoError(t, err, "Failed to connect to test database")

// 	fileHandler.DB = db

// 	createTables(t, db)

// 	return func() {
// 		cleanupTables(t, db)
// 		db.Close()
// 	}
// }

// func createTables(t *testing.T, db *sql.DB) {
// 	_, err := db.Exec(`
// 		CREATE TABLE IF NOT EXISTS notifications (
// 			id SERIAL PRIMARY KEY,
// 			type VARCHAR(50) NOT NULL,
// 			"from" VARCHAR(255) NOT NULL,
// 			"to" VARCHAR(255) NOT NULL,
// 			file_name VARCHAR(255) NOT NULL,
// 			file_id VARCHAR(255) NOT NULL,
// 			message TEXT,
// 			timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
// 			status VARCHAR(20) DEFAULT 'pending',
// 			read BOOLEAN DEFAULT FALSE
// 		)
// 	`)
// 	require.NoError(t, err, "Failed to create notifications table")

// 	_, err = db.Exec(`
// 		CREATE TABLE IF NOT EXISTS files (
// 			id VARCHAR(255) PRIMARY KEY,
// 			file_name VARCHAR(255) NOT NULL,
// 			file_type VARCHAR(100),
// 			cid VARCHAR(255),
// 			file_size BIGINT,
// 			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// 		)
// 	`)
// 	require.NoError(t, err, "Failed to create files table")

// 	_, err = db.Exec(`
// 		CREATE TABLE IF NOT EXISTS received_files (
// 			id SERIAL PRIMARY KEY,
// 			file_id VARCHAR(255) NOT NULL,
// 			recipient_id VARCHAR(255) NOT NULL,
// 			metadata TEXT,
// 			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// 		)
// 	`)
// 	require.NoError(t, err, "Failed to create received_files table")
// }

// func cleanupTables(t *testing.T, db *sql.DB) {
// 	tables := []string{"notifications", "files", "received_files"}
// 	for _, table := range tables {
// 		_, err := db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s", table))
// 		if err != nil {
// 			t.Logf("Warning: Failed to drop table %s: %v", table, err)
// 		}
// 	}
// }

// // Helper function to insert test data
// func insertTestData(t *testing.T, db *sql.DB) (string, string, string, string) {
// 	fileID := uuid.New().String()
// 	senderID := uuid.New().String()
// 	recipientID := uuid.New().String()

// 	_, err := db.Exec(`INSERT INTO users (id) VALUES ($1)`, senderID)
// 	require.NoError(t, err)

// 	_, err = db.Exec(`INSERT INTO users (id) VALUES ($1)`, recipientID)
// 	require.NoError(t, err)

// 	_, err = db.Exec(`
// 		INSERT INTO files (id, file_name, file_type, cid, file_size, owner_id)
// 		VALUES ($1, $2, $3, $4, $5, $6)
// 	`, fileID, "test-document.pdf", "application/pdf", "QmTest123", 1024, senderID)
// 	require.NoError(t, err)

// 	_, err = db.Exec(`
// 		INSERT INTO received_files (file_id, recipient_id, metadata)
// 		VALUES ($1, $2, $3)
// 	`, fileID, recipientID, `{"encrypted": true, "key": "test-key"}`)
// 	require.NoError(t, err)

// 	var notificationID string
// 	err = db.QueryRow(`
// 		INSERT INTO notifications (type, "from", "to", file_name, file_id, message, status)
// 		VALUES ($1, $2, $3, $4, $5, $6, $7)
// 		RETURNING id
// 	`, "share_request", senderID, recipientID, "test-document.pdf", fileID, "Please review this document", "pending").Scan(&notificationID)
// 	require.NoError(t, err)

// 	return notificationID, fileID, senderID, recipientID
// }

// func TestNotificationHandler(t *testing.T) {
// 	cleanup := setupTestDB(t)
// 	defer cleanup()

// 	notificationID, fileID, senderID, recipientID := insertTestData(t, fileHandler.DB)

// 	tests := []struct {
// 		name           string
// 		method         string
// 		queryParams    string
// 		expectedStatus int
// 		expectedCount  int
// 	}{
// 		{
// 			name:           "Get notifications successfully",
// 			method:         "GET",
// 			queryParams:    fmt.Sprintf("?id=%s", recipientID),
// 			expectedStatus: http.StatusOK,
// 			expectedCount:  1,
// 		},
// 		{
// 			name:           "Missing user ID",
// 			method:         "GET",
// 			queryParams:    "",
// 			expectedStatus: http.StatusBadRequest,
// 			expectedCount:  0,
// 		},
// 		{
// 			name:           "Invalid method",
// 			method:         "POST",
// 			queryParams:    fmt.Sprintf("?id=%s", recipientID),
// 			expectedStatus: http.StatusMethodNotAllowed,
// 			expectedCount:  0,
// 		},
// 		{
// 			name:           "User with no notifications",
// 			method:         "GET",
// 			queryParams:    "?id=nonexistent-user",
// 			expectedStatus: http.StatusOK,
// 			expectedCount:  0,
// 		},
// 	}

// 	for _, tt := range tests {
// 		t.Run(tt.name, func(t *testing.T) {
// 			req := httptest.NewRequest(tt.method, "/notifications"+tt.queryParams, nil)
// 			w := httptest.NewRecorder()

// 			fileHandler.NotificationHandler(w, req)

// 			assert.Equal(t, tt.expectedStatus, w.Code)

// 			if tt.expectedStatus == http.StatusOK {
// 				var response struct {
// 					Success       bool               `json:"success"`
// 					Notifications []testNotification `json:"notifications"`
// 				}
// 				err := json.Unmarshal(w.Body.Bytes(), &response)
// 				require.NoError(t, err)

// 				assert.True(t, response.Success)
// 				assert.Len(t, response.Notifications, tt.expectedCount)

// 				if tt.expectedCount > 0 {
// 					notification := response.Notifications[0]
// 					assert.Equal(t, notificationID, notification.ID)
// 					assert.Equal(t, "share_request", notification.Type)
// 					assert.Equal(t, senderID, notification.From)
// 					assert.Equal(t, recipientID, notification.To)
// 					assert.Equal(t, "test-document.pdf", notification.FileName)
// 					assert.Equal(t, fileID, notification.FileID)
// 					assert.Equal(t, "pending", notification.Status)
// 					assert.False(t, notification.Read)
// 				}
// 			}
// 		})
// 	}
// }

// func TestMarkAsReadHandler(t *testing.T) {
// 	cleanup := setupTestDB(t)
// 	defer cleanup()

// 	notificationID, _, _, _ := insertTestData(t, fileHandler.DB)

// 	tests := []struct {
// 		name           string
// 		method         string
// 		requestBody    interface{}
// 		expectedStatus int
// 		expectedRead   bool
// 	}{
// 		{
// 			name:           "Mark notification as read successfully",
// 			method:         "POST",
// 			requestBody:    map[string]string{"id": notificationID},
// 			expectedStatus: http.StatusOK,
// 			expectedRead:   true,
// 		},
// 		{
// 			name:           "Missing notification ID",
// 			method:         "POST",
// 			requestBody:    map[string]string{},
// 			expectedStatus: http.StatusBadRequest,
// 			expectedRead:   false,
// 		},
// 		{
// 			name:           "Invalid request body",
// 			method:         "POST",
// 			requestBody:    "invalid json",
// 			expectedStatus: http.StatusBadRequest,
// 			expectedRead:   false,
// 		},
// 		{
// 			name:           "Notification not found",
// 			method:         "POST",
// 			requestBody:    map[string]string{"id": "99999"},
// 			expectedStatus: http.StatusNotFound,
// 			expectedRead:   false,
// 		},
// 		{
// 			name:           "Invalid method",
// 			method:         "GET",
// 			requestBody:    map[string]string{"id": notificationID},
// 			expectedStatus: http.StatusMethodNotAllowed,
// 			expectedRead:   false,
// 		},
// 	}

// 	for _, tt := range tests {
// 		t.Run(tt.name, func(t *testing.T) {
// 			var body bytes.Buffer
// 			if tt.requestBody != nil {
// 				json.NewEncoder(&body).Encode(tt.requestBody)
// 			}

// 			req := httptest.NewRequest(tt.method, "/notifications/mark-read", &body)
// 			req.Header.Set("Content-Type", "application/json")
// 			w := httptest.NewRecorder()

// 			fileHandler.MarkAsReadHandler(w, req)

// 			assert.Equal(t, tt.expectedStatus, w.Code)

// 			if tt.expectedStatus == http.StatusOK {
// 				var response map[string]interface{}
// 				err := json.Unmarshal(w.Body.Bytes(), &response)
// 				require.NoError(t, err)

// 				assert.True(t, response["success"].(bool))
// 				assert.Equal(t, "Notification marked as read", response["message"])

// 				var read bool
// 				err = fileHandler.DB.QueryRow("SELECT read FROM notifications WHERE id = $1", notificationID).Scan(&read)
// 				require.NoError(t, err)
// 				assert.True(t, read)
// 			}
// 		})
// 	}
// }

// func TestRespondToShareRequestHandler(t *testing.T) {
// 	cleanup := setupTestDB(t)
// 	defer cleanup()

// 	notificationID, fileID, senderID, recipientID := insertTestData(t, fileHandler.DB)

// 	tests := []struct {
// 		name           string
// 		method         string
// 		requestBody    interface{}
// 		expectedStatus int
// 		expectedData   bool
// 	}{
// 		{
// 			name:           "Accept share request successfully",
// 			method:         "POST",
// 			requestBody:    map[string]string{"id": notificationID, "status": "accepted"},
// 			expectedStatus: http.StatusOK,
// 			expectedData:   true,
// 		},
// 		{
// 			name:           "Decline share request successfully",
// 			method:         "POST",
// 			requestBody:    map[string]string{"id": notificationID, "status": "declined"},
// 			expectedStatus: http.StatusOK,
// 			expectedData:   false,
// 		},
// 		{
// 			name:           "Invalid status",
// 			method:         "POST",
// 			requestBody:    map[string]string{"id": notificationID, "status": "invalid"},
// 			expectedStatus: http.StatusBadRequest,
// 			expectedData:   false,
// 		},
// 		{
// 			name:           "Missing ID",
// 			method:         "POST",
// 			requestBody:    map[string]string{"status": "accepted"},
// 			expectedStatus: http.StatusBadRequest,
// 			expectedData:   false,
// 		},
// 		{
// 			name:           "Missing status",
// 			method:         "POST",
// 			requestBody:    map[string]string{"id": notificationID},
// 			expectedStatus: http.StatusBadRequest,
// 			expectedData:   false,
// 		},
// 		{
// 			name:           "Notification not found",
// 			method:         "POST",
// 			requestBody:    map[string]string{"id": "99999", "status": "accepted"},
// 			expectedStatus: http.StatusNotFound,
// 			expectedData:   false,
// 		},
// 		{
// 			name:           "Invalid method",
// 			method:         "GET",
// 			requestBody:    map[string]string{"id": notificationID, "status": "accepted"},
// 			expectedStatus: http.StatusMethodNotAllowed,
// 			expectedData:   false,
// 		},
// 	}

// 	for _, tt := range tests {
// 		t.Run(tt.name, func(t *testing.T) {
// 			_, err := fileHandler.DB.Exec("UPDATE notifications SET status = 'pending', read = FALSE WHERE id = $1", notificationID)
// 			require.NoError(t, err)

// 			var body bytes.Buffer
// 			if tt.requestBody != nil {
// 				json.NewEncoder(&body).Encode(tt.requestBody)
// 			}

// 			req := httptest.NewRequest(tt.method, "/notifications/respond", &body)
// 			req.Header.Set("Content-Type", "application/json")
// 			w := httptest.NewRecorder()

// 			fileHandler.RespondToShareRequestHandler(w, req)

// 			assert.Equal(t, tt.expectedStatus, w.Code)

// 			if tt.expectedStatus == http.StatusOK {
// 				var response map[string]interface{}
// 				err := json.Unmarshal(w.Body.Bytes(), &response)
// 				require.NoError(t, err)

// 				assert.True(t, response["success"].(bool))
// 				assert.Equal(t, "Notification status updated", response["message"])

// 				if tt.expectedData {
// 					fileData, exists := response["fileData"].(map[string]interface{})
// 					assert.True(t, exists)
// 					assert.Equal(t, fileID, fileData["file_id"])
// 					assert.Equal(t, senderID, fileData["sender_id"])
// 					assert.Equal(t, recipientID, fileData["recipient_id"])
// 					assert.Equal(t, "test-document.pdf", fileData["file_name"])
// 					assert.Equal(t, "application/pdf", fileData["file_type"])
// 					assert.Equal(t, "QmTest123", fileData["cid"])
// 					assert.Equal(t, float64(1024), fileData["file_size"])
// 					assert.Equal(t, `{"encrypted": true, "key": "test-key"}`, fileData["metadata"])
// 				} else {
// 					_, exists := response["fileData"]
// 					assert.False(t, exists)
// 				}
// 			}
// 		})
// 	}
// }

// func TestClearNotificationHandler(t *testing.T) {
// 	cleanup := setupTestDB(t)
// 	defer cleanup()

// 	notificationID, _, _, _ := insertTestData(t, fileHandler.DB)

// 	tests := []struct {
// 		name           string
// 		method         string
// 		requestBody    interface{}
// 		expectedStatus int
// 	}{
// 		{
// 			name:           "Clear notification successfully",
// 			method:         "POST",
// 			requestBody:    map[string]string{"id": notificationID},
// 			expectedStatus: http.StatusOK,
// 		},
// 		{
// 			name:           "Missing notification ID",
// 			method:         "POST",
// 			requestBody:    map[string]string{},
// 			expectedStatus: http.StatusBadRequest,
// 		},
// 		{
// 			name:           "Invalid request body",
// 			method:         "POST",
// 			requestBody:    "invalid json",
// 			expectedStatus: http.StatusBadRequest,
// 		},
// 		{
// 			name:           "Notification not found",
// 			method:         "POST",
// 			requestBody:    map[string]string{"id": "99999"},
// 			expectedStatus: http.StatusNotFound,
// 		},
// 		{
// 			name:           "Invalid method",
// 			method:         "GET",
// 			requestBody:    map[string]string{"id": notificationID},
// 			expectedStatus: http.StatusMethodNotAllowed,
// 		},
// 	}

// 	for _, tt := range tests {
// 		t.Run(tt.name, func(t *testing.T) {
// 			if tt.name != "Clear notification successfully" {
// 				_, err := fileHandler.DB.Exec(`
// 					INSERT INTO notifications (id, type, "from", "to", file_name, file_id, message, status)
// 					VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
// 					ON CONFLICT (id) DO NOTHING
// 				`, notificationID, "share_request", "user-123", "user-456", "test-document.pdf", "test-file-123", "Test message", "pending")
// 				if err != nil {
// 					t.Logf("Note: Notification may already exist: %v", err)
// 				}
// 			}

// 			var body bytes.Buffer
// 			if tt.requestBody != nil {
// 				json.NewEncoder(&body).Encode(tt.requestBody)
// 			}

// 			req := httptest.NewRequest(tt.method, "/notifications/clear", &body)
// 			req.Header.Set("Content-Type", "application/json")
// 			w := httptest.NewRecorder()

// 			fileHandler.ClearNotificationHandler(w, req)

// 			assert.Equal(t, tt.expectedStatus, w.Code)

// 			if tt.expectedStatus == http.StatusOK {
// 				var response map[string]interface{}
// 				err := json.Unmarshal(w.Body.Bytes(), &response)
// 				require.NoError(t, err)

// 				assert.True(t, response["success"].(bool))
// 				assert.Equal(t, "Notification deleted", response["message"])

// 				var count int
// 				err = fileHandler.DB.QueryRow("SELECT COUNT(*) FROM notifications WHERE id = $1", notificationID).Scan(&count)
// 				require.NoError(t, err)
// 				assert.Equal(t, 0, count)
// 			}
// 		})
// 	}
// }

// func TestAddNotificationHandler(t *testing.T) {
// 	cleanup := setupTestDB(t)
// 	defer cleanup()

// 	tests := []struct {
// 		name           string
// 		method         string
// 		requestBody    interface{}
// 		expectedStatus int
// 	}{
// 		{
// 			name:   "Add notification successfully",
// 			method: "POST",
// 			requestBody: map[string]string{
// 				"type":      "share_request",
// 				"from":      "user-789",
// 				"to":        "user-456",
// 				"file_name": "new-document.pdf",
// 				"file_id":   "new-file-456",
// 				"message":   "Please review this new document",
// 			},
// 			expectedStatus: http.StatusOK,
// 		},
// 		{
// 			name:   "Missing required fields",
// 			method: "POST",
// 			requestBody: map[string]string{
// 				"type": "share_request",
// 				"from": "user-789",
// 			},
// 			expectedStatus: http.StatusBadRequest,
// 		},
// 		{
// 			name:           "Invalid request body",
// 			method:         "POST",
// 			requestBody:    "invalid json",
// 			expectedStatus: http.StatusBadRequest,
// 		},
// 		{
// 			name:   "Invalid method",
// 			method: "GET",
// 			requestBody: map[string]string{
// 				"type":      "share_request",
// 				"from":      "user-789",
// 				"to":        "user-456",
// 				"file_name": "new-document.pdf",
// 				"file_id":   "new-file-456",
// 				"message":   "Please review this new document",
// 			},
// 			expectedStatus: http.StatusMethodNotAllowed,
// 		},
// 	}

// 	for _, tt := range tests {
// 		t.Run(tt.name, func(t *testing.T) {
// 			var body bytes.Buffer
// 			if tt.requestBody != nil {
// 				json.NewEncoder(&body).Encode(tt.requestBody)
// 			}

// 			req := httptest.NewRequest(tt.method, "/notifications/add", &body)
// 			req.Header.Set("Content-Type", "application/json")
// 			w := httptest.NewRecorder()

// 			fileHandler.AddNotificationHandler(w, req)

// 			assert.Equal(t, tt.expectedStatus, w.Code)

// 			if tt.expectedStatus == http.StatusOK {
// 				var response map[string]interface{}
// 				err := json.Unmarshal(w.Body.Bytes(), &response)
// 				require.NoError(t, err)

// 				assert.True(t, response["success"].(bool))
// 				assert.Equal(t, "Notification added", response["message"])
// 				assert.NotEmpty(t, response["id"])

// 				var count int
// 				notificationID := response["id"].(string)
// 				err = fileHandler.DB.QueryRow("SELECT COUNT(*) FROM notifications WHERE id = $1", notificationID).Scan(&count)
// 				require.NoError(t, err)
// 				assert.Equal(t, 1, count)
// 			}
// 		})
// 	}
// }

// func TestDatabaseNotInitialized(t *testing.T) {
// 	originalDB := fileHandler.DB
// 	fileHandler.DB = nil
// 	defer func() {
// 		fileHandler.DB = originalDB
// 	}()

// 	tests := []struct {
// 		name    string
// 		handler http.HandlerFunc
// 		method  string
// 		path    string
// 		body    interface{}
// 	}{
// 		{"NotificationHandler", fileHandler.NotificationHandler, "GET", "/notifications?id=test", nil},
// 		{"MarkAsReadHandler", fileHandler.MarkAsReadHandler, "POST", "/notifications/mark-read", map[string]string{"id": "test"}},
// 		{"RespondToShareRequestHandler", fileHandler.RespondToShareRequestHandler, "POST", "/notifications/respond", map[string]string{"id": "test", "status": "accepted"}},
// 		{"ClearNotificationHandler", fileHandler.ClearNotificationHandler, "POST", "/notifications/clear", map[string]string{"id": "test"}},
// 		{"AddNotificationHandler", fileHandler.AddNotificationHandler, "POST", "/notifications/add", map[string]string{"type": "test", "from": "user1", "to": "user2", "file_name": "test.pdf", "file_id": "123", "message": "test"}},
// 	}

// 	for _, tt := range tests {
// 		t.Run(tt.name, func(t *testing.T) {
// 			var body bytes.Buffer
// 			if tt.body != nil {
// 				json.NewEncoder(&body).Encode(tt.body)
// 			}

// 			req := httptest.NewRequest(tt.method, tt.path, &body)
// 			if tt.body != nil {
// 				req.Header.Set("Content-Type", "application/json")
// 			}
// 			w := httptest.NewRecorder()

// 			tt.handler(w, req)

// 			assert.Equal(t, http.StatusInternalServerError, w.Code)

// 			var response map[string]interface{}
// 			err := json.Unmarshal(w.Body.Bytes(), &response)
// 			require.NoError(t, err)

// 			assert.False(t, response["success"].(bool))
// 			assert.Equal(t, "Database not initialized", response["error"])
// 		})
// 	}
// }

// func BenchmarkNotificationHandler(b *testing.B) {
// 	cleanup := setupTestDB(&testing.T{})
// 	defer cleanup()

// 	// Insert test data
// 	insertTestData(&testing.T{}, fileHandler.DB)

// 	b.ResetTimer()
// 	for i := 0; i < b.N; i++ {
// 		req := httptest.NewRequest("GET", "/notifications?id=user-456", nil)
// 		w := httptest.NewRecorder()
// 		fileHandler.NotificationHandler(w, req)
// 	}
// }

// func BenchmarkAddNotificationHandler(b *testing.B) {
// 	cleanup := setupTestDB(&testing.T{})
// 	defer cleanup()

// 	requestBody := map[string]string{
// 		"type":      "share_request",
// 		"from":      "user-789",
// 		"to":        "user-456",
// 		"file_name": "benchmark-document.pdf",
// 		"file_id":   "benchmark-file-456",
// 		"message":   "Benchmark test",
// 	}

// 	b.ResetTimer()
// 	for i := 0; i < b.N; i++ {
// 		var body bytes.Buffer
// 		json.NewEncoder(&body).Encode(requestBody)

// 		req := httptest.NewRequest("POST", "/notifications/add", &body)
// 		req.Header.Set("Content-Type", "application/json")
// 		w := httptest.NewRecorder()

// 		fileHandler.AddNotificationHandler(w, req)
// 	}
// }
