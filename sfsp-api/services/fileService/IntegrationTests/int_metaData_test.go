//go:build integration
// +build integration

package integration_test

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	//"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	md "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/metadata"
)

const schemaFilesTagsText = `
CREATE TABLE files (
	id TEXT PRIMARY KEY DEFAULT md5(random()::text),
	owner_id TEXT NOT NULL,
	file_name TEXT NOT NULL,
	file_type TEXT DEFAULT 'file',
	file_size BIGINT DEFAULT 0,
	description TEXT DEFAULT '',
	tags TEXT DEFAULT '',
	created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	cid TEXT DEFAULT ''
);
`

const schemaFilesTagsArray = `
CREATE TABLE files (
	id TEXT PRIMARY KEY DEFAULT md5(random()::text),
	owner_id TEXT NOT NULL,
	file_name TEXT NOT NULL,
	file_type TEXT DEFAULT 'file',
	file_size BIGINT DEFAULT 0,
	description TEXT DEFAULT '',
	tags TEXT[] DEFAULT '{}',
	created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	cid TEXT DEFAULT ''
);
`

const schemaSharing = `
CREATE TABLE received_files (
	id TEXT PRIMARY KEY DEFAULT md5(random()::text),
	sender_id TEXT NOT NULL,
	recipient_id TEXT NOT NULL,
	file_id TEXT NOT NULL,
	received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	expires_at TIMESTAMPTZ NOT NULL,
	metadata TEXT NOT NULL,
	accepted BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE sent_files (
	id TEXT PRIMARY KEY DEFAULT md5(random()::text),
	sender_id TEXT NOT NULL,
	recipient_id TEXT NOT NULL,
	file_id TEXT NOT NULL,
	encrypted_file_key TEXT,
	x3dh_ephemeral_pubkey TEXT,
	sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE users (
	id TEXT PRIMARY KEY
);
CREATE TABLE one_time_pre_keys (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL
);
`

func execSQL(t *testing.T, db *sql.DB, ddl string) {
	t.Helper()
	_, err := db.Exec(ddl)
	require.NoError(t, err)
}

func TestGetUserFilesHandler_InvalidJSON_And_MissingUser(t *testing.T) {
	pg := startPostgres(t)
	if pg.Container != nil {
		t.Cleanup(func() { _ = pg.Container.Terminate(context.Background()) })
	}
	db := openDB(t, pg.DSN)
	t.Cleanup(func() { _ = db.Close() })

	prev := md.DB
	md.SetPostgreClient(db)
	t.Cleanup(func() { md.SetPostgreClient(prev) })

	req := httptest.NewRequest(http.MethodPost, "/files/get", bytes.NewBufferString(`{"userId":`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	md.GetUserFilesHandler(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)

	rr2, _ := doJSON(t, http.MethodPost, "/files/get", map[string]any{"userId": ""}, md.GetUserFilesHandler)
	assert.Equal(t, http.StatusBadRequest, rr2.Code)
}

func TestGetUserFilesHandler_DBErr_NoSchema(t *testing.T) {
	pg := startPostgres(t)
	if pg.Container != nil {
		t.Cleanup(func() { _ = pg.Container.Terminate(context.Background()) })
	}
	db := openDB(t, pg.DSN)
	t.Cleanup(func() { _ = db.Close() })

	prev := md.DB
	md.SetPostgreClient(db)
	t.Cleanup(func() { md.SetPostgreClient(prev) })

	rr, _ := doJSON(t, http.MethodPost, "/files/get", map[string]any{"userId": "u1"}, md.GetUserFilesHandler)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestGetUserFilesHandler_Success_WithStringTagsColumn(t *testing.T) {
	pg := startPostgres(t)
	if pg.Container != nil {
		t.Cleanup(func() { _ = pg.Container.Terminate(context.Background()) })
	}
	db := openDB(t, pg.DSN)
	t.Cleanup(func() { _ = db.Close() })
	execSQL(t, db, schemaFilesTagsText)

	prev := md.DB
	md.SetPostgreClient(db)
	t.Cleanup(func() { md.SetPostgreClient(prev) })

	_, err := db.Exec(`INSERT INTO files (id,owner_id,file_name,file_type,file_size,description,tags,cid)
		VALUES ('f1','u1','doc.txt','text/plain',123,'desc','["a","b"]','files/u1/f1')`)
	require.NoError(t, err)

	rr, _ := doJSON(t, http.MethodPost, "/files/get", map[string]any{"userId": "u1"}, md.GetUserFilesHandler)
	assert.Equal(t, http.StatusOK, rr.Code)

	var out []map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &out))
	require.Len(t, out, 1)
	assert.Equal(t, "f1", out[0]["fileId"])
	assert.Equal(t, "doc.txt", out[0]["fileName"])
	assert.Equal(t, "files/u1/f1", out[0]["cid"])
}

func TestListFileMetadataHandler_InvalidJSON_And_MissingUser(t *testing.T) {
	pg := startPostgres(t)
	if pg.Container != nil {
		t.Cleanup(func() { _ = pg.Container.Terminate(context.Background()) })
	}
	db := openDB(t, pg.DSN)
	t.Cleanup(func() { _ = db.Close() })

	prev := md.DB
	md.SetPostgreClient(db)
	t.Cleanup(func() { md.SetPostgreClient(prev) })

	req := httptest.NewRequest(http.MethodPost, "/meta/list", bytes.NewBufferString(`{`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	md.ListFileMetadataHandler(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)

	rr2, _ := doJSON(t, http.MethodPost, "/meta/list", map[string]any{"userId": ""}, md.ListFileMetadataHandler)
	assert.Equal(t, http.StatusBadRequest, rr2.Code)
}

func TestListFileMetadataHandler_DBErr_NoSchema(t *testing.T) {
	pg := startPostgres(t)
	if pg.Container != nil {
		t.Cleanup(func() { _ = pg.Container.Terminate(context.Background()) })
	}
	db := openDB(t, pg.DSN)
	t.Cleanup(func() { _ = db.Close() })

	prev := md.DB
	md.SetPostgreClient(db)
	t.Cleanup(func() { md.SetPostgreClient(prev) })

	rr, _ := doJSON(t, http.MethodPost, "/meta/list", map[string]any{"userId": "u1"}, md.ListFileMetadataHandler)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestListFileMetadataHandler_Success_ArrayTags(t *testing.T) {
	pg := startPostgres(t)
	if pg.Container != nil {
		t.Cleanup(func() { _ = pg.Container.Terminate(context.Background()) })
	}
	db := openDB(t, pg.DSN)
	t.Cleanup(func() { _ = db.Close() })
	execSQL(t, db, schemaFilesTagsArray)

	prev := md.DB
	md.SetPostgreClient(db)
	t.Cleanup(func() { md.SetPostgreClient(prev) })

	_, err := db.Exec(`INSERT INTO files (id,owner_id,file_name,file_type,file_size,description,tags)
		VALUES ('f2','u2','img.jpg','image/jpeg',999,'pic',ARRAY['x','y'])`)
	require.NoError(t, err)

	rr, _ := doJSON(t, http.MethodPost, "/meta/list", map[string]any{"userId": "u2"}, md.ListFileMetadataHandler)
	assert.Equal(t, http.StatusOK, rr.Code)

	var out []struct {
		FileID   string   `json:"fileId"`
		FileName string   `json:"fileName"`
		Tags     []string `json:"tags"`
	}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &out))
	require.Len(t, out, 1)
	assert.Equal(t, "f2", out[0].FileID)
	assert.ElementsMatch(t, []string{"x", "y"}, out[0].Tags)
}

func TestGetUserFileCountHandler_BadJSON_And_Missing(t *testing.T) {
	pg := startPostgres(t)
	if pg.Container != nil {
		t.Cleanup(func() { _ = pg.Container.Terminate(context.Background()) })
	}
	db := openDB(t, pg.DSN)
	t.Cleanup(func() { _ = db.Close() })

	prev := md.DB
	md.SetPostgreClient(db)
	t.Cleanup(func() { md.SetPostgreClient(prev) })

	req := httptest.NewRequest(http.MethodPost, "/count", bytes.NewBufferString(`zzz`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	md.GetUserFileCountHandler(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)

	rr2, _ := doJSON(t, http.MethodPost, "/count", map[string]any{"userId": ""}, md.GetUserFileCountHandler)
	assert.Equal(t, http.StatusBadRequest, rr2.Code)
}

func TestGetUserFileCountHandler_Success_ExcludesFolders(t *testing.T) {
	pg := startPostgres(t)
	if pg.Container != nil {
		t.Cleanup(func() { _ = pg.Container.Terminate(context.Background()) })
	}
	db := openDB(t, pg.DSN)
	t.Cleanup(func() { _ = db.Close() })
	execSQL(t, db, schemaFilesTagsArray)

	prev := md.DB
	md.SetPostgreClient(db)
	t.Cleanup(func() { md.SetPostgreClient(prev) })

	_, _ = db.Exec(`INSERT INTO files (id,owner_id,file_name,file_type) VALUES 
		('a','u3','doc1','file'),('b','u3','doc2','file'),('c','u3','fold','folder')`)

	rr, _ := doJSON(t, http.MethodPost, "/count", map[string]any{"userId": "u3"}, md.GetUserFileCountHandler)
	assert.Equal(t, http.StatusOK, rr.Code)

	var out map[string]int
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &out))
	assert.Equal(t, 2, out["userFileCount"])
}

func TestAddReceivedFileHandler_And_GetPendingFilesHandler(t *testing.T) {
	pg := startPostgres(t)
	if pg.Container != nil {
		t.Cleanup(func() { _ = pg.Container.Terminate(context.Background()) })
	}
	db := openDB(t, pg.DSN)
	t.Cleanup(func() { _ = db.Close() })
	execSQL(t, db, schemaSharing)

	prev := md.DB
	md.SetPostgreClient(db)
	t.Cleanup(func() { md.SetPostgreClient(prev) })

	rrBad, _ := doJSON(t, http.MethodPost, "/received/add",
		map[string]any{"senderId": "", "recipientId": "", "fileId": ""},
		md.AddReceivedFileHandler)
	assert.Equal(t, http.StatusBadRequest, rrBad.Code)

	rr, _ := doJSON(t, http.MethodPost, "/received/add",
		map[string]any{
			"senderId":    "S",
			"recipientId": "R",
			"fileId":      "F",
			"metadata":    map[string]any{"note": "hello"},
		}, md.AddReceivedFileHandler)
	assert.Equal(t, http.StatusCreated, rr.Code)

	_, _ = db.Exec(`INSERT INTO received_files (sender_id,recipient_id,file_id,received_at,expires_at,metadata,accepted)
		VALUES 
		('S','U','Fx', NOW()-'2h'::interval, NOW()-'1h'::interval, '{}' , FALSE),
		('S','U','Fy', NOW(), NOW()+'2h'::interval, '{}' , FALSE),
		('S','U','Fz', NOW(), NOW()+'2h'::interval, '{}' , TRUE)`)

	rr2, _ := doJSON(t, http.MethodPost, "/received/pending", map[string]any{"userId": "U"}, md.GetPendingFilesHandler)
	assert.Equal(t, http.StatusOK, rr2.Code)

	var wrap struct {
		Data []map[string]any `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rr2.Body.Bytes(), &wrap))
	require.Len(t, wrap.Data, 1)
	assert.Equal(t, "Fy", wrap.Data[0]["fileId"])
}

func TestAddSentFileHandler_And_GetSentFilesHandler(t *testing.T) {
	pg := startPostgres(t)
	if pg.Container != nil {
		t.Cleanup(func() { _ = pg.Container.Terminate(context.Background()) })
	}
	db := openDB(t, pg.DSN)
	t.Cleanup(func() { _ = db.Close() })
	execSQL(t, db, schemaSharing)

	prev := md.DB
	md.SetPostgreClient(db)
	t.Cleanup(func() { md.SetPostgreClient(prev) })

	rrBad, _ := doJSON(t, http.MethodPost, "/sent/add",
		map[string]any{"senderId": "", "recipientId": "", "fileId": ""},
		md.AddSentFileHandler)
	assert.Equal(t, http.StatusBadRequest, rrBad.Code)

	rr, _ := doJSON(t, http.MethodPost, "/sent/add",
		map[string]any{"senderId": "A", "recipientId": "B", "fileId": "F"},
		md.AddSentFileHandler)
	assert.Equal(t, http.StatusCreated, rr.Code)

	rr2, _ := doJSON(t, http.MethodPost, "/sent/get", map[string]any{"userId": "A"}, md.GetSentFilesHandler)
	assert.Equal(t, http.StatusOK, rr2.Code)

	var out []map[string]any
	require.NoError(t, json.Unmarshal(rr2.Body.Bytes(), &out))
	require.Len(t, out, 1)
	assert.Equal(t, "B", out[0]["recipientId"])
	assert.Equal(t, "F", out[0]["fileId"])
}

func TestDeleteFileMetadata_RemovesAllRows(t *testing.T) {
	pg := startPostgres(t)
	if pg.Container != nil {
		t.Cleanup(func() { _ = pg.Container.Terminate(context.Background()) })
	}
	db := openDB(t, pg.DSN)
	t.Cleanup(func() { _ = db.Close() })
	execSQL(t, db, schemaFilesTagsArray)
	execSQL(t, db, schemaSharing)

	prev := md.DB
	md.SetPostgreClient(db)
	t.Cleanup(func() { md.SetPostgreClient(prev) })

	_, _ = db.Exec(`INSERT INTO files (id,owner_id,file_name) VALUES ('F1','U','doc')`)
	_, _ = db.Exec(`INSERT INTO sent_files (sender_id,recipient_id,file_id) VALUES ('U','R','F1')`)
	_, _ = db.Exec(`INSERT INTO received_files (sender_id,recipient_id,file_id,expires_at,metadata) VALUES ('U','R','F1', NOW()+'1d'::interval,'{}')`)

	err := md.DeleteFileMetadata("F1")
	require.NoError(t, err)

	var c1, c2, c3 int
	_ = db.QueryRow(`SELECT COUNT(*) FROM files WHERE id='F1'`).Scan(&c1)
	_ = db.QueryRow(`SELECT COUNT(*) FROM sent_files WHERE file_id='F1'`).Scan(&c2)
	_ = db.QueryRow(`SELECT COUNT(*) FROM received_files WHERE file_id='F1'`).Scan(&c3)
	assert.Equal(t, 0, c1+c2+c3)
}

func TestRemoveTagsFromFileHandler_And_AddTagsHandler(t *testing.T) {
	pg := startPostgres(t)
	if pg.Container != nil {
		t.Cleanup(func() { _ = pg.Container.Terminate(context.Background()) })
	}
	db := openDB(t, pg.DSN)
	t.Cleanup(func() { _ = db.Close() })
	execSQL(t, db, schemaFilesTagsArray)

	prev := md.DB
	md.SetPostgreClient(db)
	t.Cleanup(func() { md.SetPostgreClient(prev) })

	_, _ = db.Exec(`INSERT INTO files (id,owner_id,file_name,tags) VALUES ('Fx','U','doc', ARRAY['a','b','c'])`)

	rr, _ := doJSON(t, http.MethodPost, "/tags/remove", map[string]any{"fileId": "Fx", "tags": []string{"b"}}, md.RemoveTagsFromFileHandler)
	assert.Equal(t, http.StatusOK, rr.Code)

	var tags []string
	_ = db.QueryRow(`SELECT tags FROM files WHERE id='Fx'`).Scan(pq.Array(&tags))
	assert.ElementsMatch(t, []string{"a", "c"}, tags)

	rr2, _ := doJSON(t, http.MethodPost, "/tags/add", map[string]any{"fileId": "Fx", "tags": []string{"d", "e"}}, md.AddTagsHandler)
	assert.Equal(t, http.StatusOK, rr2.Code)

	tags = nil
	_ = db.QueryRow(`SELECT tags FROM files WHERE id='Fx'`).Scan(pq.Array(&tags))
	assert.ElementsMatch(t, []string{"a", "c", "d", "e"}, tags)
}

func TestGetRecipientIDFromOPK_And_InsertReceived_Sent(t *testing.T) {
	pg := startPostgres(t)
	if pg.Container != nil {
		t.Cleanup(func() { _ = pg.Container.Terminate(context.Background()) })
	}
	db := openDB(t, pg.DSN)
	t.Cleanup(func() { _ = db.Close() })
	execSQL(t, db, schemaSharing)

	prev := md.DB
	md.SetPostgreClient(db)
	t.Cleanup(func() { md.SetPostgreClient(prev) })

	_, _ = db.Exec(`INSERT INTO users (id) VALUES ('U1')`)
	_, _ = db.Exec(`INSERT INTO one_time_pre_keys (id,user_id) VALUES ('OPK1','U1')`)

	u, err := md.GetRecipientIDFromOPK("OPK1")
	require.NoError(t, err)
	assert.Equal(t, "U1", u)

	_, err = md.InsertReceivedFile(db, "NO_USER", "S", "F", "{}", time.Now().Add(24*time.Hour))
	assert.Error(t, err)

	id, err := md.InsertReceivedFile(db, "U1", "S", "F", `{"meta":"x"}`, time.Now().Add(24*time.Hour))
	require.NoError(t, err)
	require.NotEmpty(t, id)

	err = md.InsertSentFile(db, "S", "U1", "F", `not-json`)
	assert.Error(t, err)

	err = md.InsertSentFile(db, "S", "U1", "F", `{}`)
	assert.Error(t, err)

	err = md.InsertSentFile(db, "S", "U1", "F", `{"encryptedAesKey":"EKEY","ekPublicKey":"PUB"}`)
	require.NoError(t, err)

	var count int
	_ = db.QueryRow(`SELECT COUNT(*) FROM sent_files WHERE sender_id='S' AND recipient_id='U1' AND file_id='F'`).Scan(&count)
	assert.Equal(t, 1, count)
}

func TestUserAndFileUpdatesHandlers_SuccessPaths(t *testing.T) {
	pg := startPostgres(t)
	if pg.Container != nil {
		t.Cleanup(func() { _ = pg.Container.Terminate(context.Background()) })
	}
	db := openDB(t, pg.DSN)
	t.Cleanup(func() { _ = db.Close() })
	execSQL(t, db, schemaFilesTagsArray)
	execSQL(t, db, schemaSharing)

	prev := md.DB
	md.SetPostgreClient(db)
	t.Cleanup(func() { md.SetPostgreClient(prev) })

	rr, _ := doJSON(t, http.MethodPost, "/user/add", map[string]any{"userId": "UX"}, md.AddUserHandler)
	assert.Equal(t, http.StatusOK, rr.Code)
	rr2, _ := doJSON(t, http.MethodPost, "/user/add", map[string]any{"userId": "UX"}, md.AddUserHandler) // idempotent
	assert.Equal(t, http.StatusOK, rr2.Code)

	_, _ = db.Exec(`INSERT INTO files (id,owner_id,file_name,description,cid) VALUES ('FF','UX','doc','old','old/path')`)

	rr3, _ := doJSON(t, http.MethodPost, "/file/desc", map[string]any{"fileId": "FF", "description": "new"}, md.AddDescriptionHandler)
	assert.Equal(t, http.StatusOK, rr3.Code)

	rr4, _ := doJSON(t, http.MethodPost, "/file/path", map[string]any{"fileId": "FF", "newPath": "new/path"}, md.UpdateFilePathHandler)
	assert.Equal(t, http.StatusOK, rr4.Code)

	var desc, cid string
	_ = db.QueryRow(`SELECT description,cid FROM files WHERE id='FF'`).Scan(&desc, &cid)
	assert.Equal(t, "new", desc)
	assert.Equal(t, "new/path", cid)
}
