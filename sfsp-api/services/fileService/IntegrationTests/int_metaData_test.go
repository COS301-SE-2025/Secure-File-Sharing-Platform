//go:build integration
// +build integration

package integration_test

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	nat "github.com/docker/go-connections/nat"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"

	md "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/metadata"
	_ "github.com/lib/pq"
)

type pgEnv struct {
	container testcontainers.Container 
	dsn       string
}

func startPostgresMeta(t *testing.T) pgEnv {
	t.Helper()
	if dsn := os.Getenv("POSTGRES_TEST_DSN"); dsn != "" {
		return pgEnv{dsn: dsn}
	}

	ctx := context.Background()
	const (
		user = "testuser"
		pass = "testpass"
		db   = "testdb"
	)
	req := testcontainers.ContainerRequest{
		Image:        "postgres:16-alpine",
		ExposedPorts: []string{"5432/tcp"},
		Env:          map[string]string{"POSTGRES_USER": user, "POSTGRES_PASSWORD": pass, "POSTGRES_DB": db},
		WaitingFor: wait.ForSQL("5432/tcp", "postgres", func(host string, port nat.Port) string {
			return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, pass, host, port.Port(), db)
		}).WithStartupTimeout(90 * time.Second),
	}

	c, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{ContainerRequest: req, Started: true})
	if err != nil {
		t.Skipf("Docker not available for integration tests: %v", err)
	}
	host, _ := c.Host(ctx)
	mp, _ := c.MappedPort(ctx, "5432/tcp")
	return pgEnv{container: c, dsn: fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, pass, host, mp.Port(), db)}
}

func openDBMeta(t *testing.T, dsn string) *sql.DB {
	t.Helper()
	db, err := sql.Open("postgres", dsn)
	require.NoError(t, err)
	require.NoError(t, db.Ping())
	return db
}

func setMetaDB(t *testing.T, db *sql.DB) (restore func()) {
	prev := md.DB
	md.SetPostgreClient(db)
	return func() { md.SetPostgreClient(prev) }
}

func postJSON1(handler http.HandlerFunc, path string, body any) *httptest.ResponseRecorder {
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewBuffer(b))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handler(rr, req)
	return rr
}

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
	env := startPostgresMeta(t)
	if env.container != nil {
		defer env.container.Terminate(context.Background())
	}
	db := openDBMeta(t, env.dsn)
	defer db.Close()
	restore := setMetaDB(t, db)
	defer restore()

	req := httptest.NewRequest(http.MethodPost, "/files/get", bytes.NewBufferString(`{"userId":`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	md.GetUserFilesHandler(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)

	rr2 := postJSON1(md.GetUserFilesHandler, "/files/get", map[string]any{"userId": ""})
	assert.Equal(t, http.StatusBadRequest, rr2.Code)
}

func TestGetUserFilesHandler_DBErr_NoSchema(t *testing.T) {
	env := startPostgresMeta(t)
	if env.container != nil {
		defer env.container.Terminate(context.Background())
	}
	db := openDBMeta(t, env.dsn)
	defer db.Close()
	defer setMetaDB(t, db)()

	rr := postJSON1(md.GetUserFilesHandler, "/files/get", map[string]any{"userId": "u1"})
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestGetUserFilesHandler_Success_WithStringTagsColumn(t *testing.T) {
	env := startPostgresMeta(t)
	if env.container != nil {
		defer env.container.Terminate(context.Background())
	}
	db := openDBMeta(t, env.dsn)
	defer db.Close()
	execSQL(t, db, schemaFilesTagsText)
	defer setMetaDB(t, db)()

	_, err := db.Exec(`INSERT INTO files (id,owner_id,file_name,file_type,file_size,description,tags,cid)
		VALUES ('f1','u1','doc.txt','text/plain',123,'desc','["a","b"]','files/u1/f1')`)
	require.NoError(t, err)

	rr := postJSON1(md.GetUserFilesHandler, "/files/get", map[string]any{"userId": "u1"})
	assert.Equal(t, http.StatusOK, rr.Code)

	var out []map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &out))
	require.Len(t, out, 1)
	assert.Equal(t, "f1", out[0]["fileId"])
	assert.Equal(t, "doc.txt", out[0]["fileName"])
	assert.Equal(t, "files/u1/f1", out[0]["cid"])
}

func TestListFileMetadataHandler_InvalidJSON_And_MissingUser(t *testing.T) {
	dbEnv := startPostgresMeta(t)
	if dbEnv.container != nil {
		defer dbEnv.container.Terminate(context.Background())
	}
	db := openDBMeta(t, dbEnv.dsn)
	defer db.Close()
	defer setMetaDB(t, db)()

	req := httptest.NewRequest(http.MethodPost, "/meta/list", bytes.NewBufferString(`{`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	md.ListFileMetadataHandler(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)

	rr2 := postJSON1(md.ListFileMetadataHandler, "/meta/list", map[string]any{"userId": ""})
	assert.Equal(t, http.StatusBadRequest, rr2.Code)
}

func TestListFileMetadataHandler_DBErr_NoSchema(t *testing.T) {
	dbEnv := startPostgresMeta(t)
	if dbEnv.container != nil {
		defer dbEnv.container.Terminate(context.Background())
	}
	db := openDBMeta(t, dbEnv.dsn)
	defer db.Close()
	defer setMetaDB(t, db)()

	rr := postJSON1(md.ListFileMetadataHandler, "/meta/list", map[string]any{"userId": "u1"})
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestListFileMetadataHandler_Success_ArrayTags(t *testing.T) {
	dbEnv := startPostgresMeta(t)
	if dbEnv.container != nil {
		defer dbEnv.container.Terminate(context.Background())
	}
	db := openDBMeta(t, dbEnv.dsn)
	defer db.Close()
	execSQL(t, db, schemaFilesTagsArray)
	defer setMetaDB(t, db)()

	_, err := db.Exec(`INSERT INTO files (id,owner_id,file_name,file_type,file_size,description,tags)
		VALUES ('f2','u2','img.jpg','image/jpeg',999,'pic',ARRAY['x','y'])`)
	require.NoError(t, err)

	rr := postJSON1(md.ListFileMetadataHandler, "/meta/list", map[string]any{"userId": "u2"})
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
	env := startPostgresMeta(t)
	if env.container != nil {
		defer env.container.Terminate(context.Background())
	}
	db := openDBMeta(t, env.dsn)
	defer db.Close()
	defer setMetaDB(t, db)()

	req := httptest.NewRequest(http.MethodPost, "/count", bytes.NewBufferString(`zzz`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	md.GetUserFileCountHandler(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)

	rr2 := postJSON1(md.GetUserFileCountHandler, "/count", map[string]any{"userId": ""})
	assert.Equal(t, http.StatusBadRequest, rr2.Code)
}

func TestGetUserFileCountHandler_Success_ExcludesFolders(t *testing.T) {
	env := startPostgresMeta(t)
	if env.container != nil {
		defer env.container.Terminate(context.Background())
	}
	db := openDBMeta(t, env.dsn)
	defer db.Close()
	execSQL(t, db, schemaFilesTagsArray)
	defer setMetaDB(t, db)()

	_, _ = db.Exec(`INSERT INTO files (id,owner_id,file_name,file_type) VALUES 
		('a','u3','doc1','file'),('b','u3','doc2','file'),('c','u3','fold','folder')`)
	rr := postJSON1(md.GetUserFileCountHandler, "/count", map[string]any{"userId": "u3"})
	assert.Equal(t, http.StatusOK, rr.Code)

	var out map[string]int
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &out))
	assert.Equal(t, 2, out["userFileCount"])
}

func TestAddReceivedFileHandler_And_GetPendingFilesHandler(t *testing.T) {
	env := startPostgresMeta(t)
	if env.container != nil {
		defer env.container.Terminate(context.Background())
	}
	db := openDBMeta(t, env.dsn)
	defer db.Close()
	execSQL(t, db, schemaSharing)
	defer setMetaDB(t, db)()

	rrBad := postJSON1(md.AddReceivedFileHandler, "/received/add", map[string]any{"senderId": "", "recipientId": "", "fileId": ""})
	assert.Equal(t, http.StatusBadRequest, rrBad.Code)

	rr := postJSON1(md.AddReceivedFileHandler, "/received/add", map[string]any{
		"senderId":    "S",
		"recipientId": "R",
		"fileId":      "F",
		"metadata":    map[string]any{"note": "hello"},
	})
	assert.Equal(t, http.StatusCreated, rr.Code)

	_, _ = db.Exec(`INSERT INTO received_files (sender_id,recipient_id,file_id,received_at,expires_at,metadata,accepted)
		VALUES 
		('S','U','Fx', NOW()-'2h'::interval, NOW()-'1h'::interval, '{}' , FALSE),
		('S','U','Fy', NOW(), NOW()+'2h'::interval, '{}' , FALSE),
		('S','U','Fz', NOW(), NOW()+'2h'::interval, '{}' , TRUE)`)

	rr2 := postJSON1(md.GetPendingFilesHandler, "/received/pending", map[string]any{"userId": "U"})
	assert.Equal(t, http.StatusOK, rr2.Code)

	var wrap struct {
		Data []map[string]any `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rr2.Body.Bytes(), &wrap))
	require.Len(t, wrap.Data, 1)
	assert.Equal(t, "Fy", wrap.Data[0]["fileId"])
}

func TestAddSentFileHandler_And_GetSentFilesHandler(t *testing.T) {
	env := startPostgresMeta(t)
	if env.container != nil {
		defer env.container.Terminate(context.Background())
	}
	db := openDBMeta(t, env.dsn)
	defer db.Close()
	execSQL(t, db, schemaSharing)
	defer setMetaDB(t, db)()

	rrBad := postJSON1(md.AddSentFileHandler, "/sent/add", map[string]any{"senderId": "", "recipientId": "", "fileId": ""})
	assert.Equal(t, http.StatusBadRequest, rrBad.Code)

	rr := postJSON1(md.AddSentFileHandler, "/sent/add", map[string]any{"senderId": "A", "recipientId": "B", "fileId": "F"})
	assert.Equal(t, http.StatusCreated, rr.Code)

	rr2 := postJSON1(md.GetSentFilesHandler, "/sent/get", map[string]any{"userId": "A"})
	assert.Equal(t, http.StatusOK, rr2.Code)

	var out []map[string]any
	require.NoError(t, json.Unmarshal(rr2.Body.Bytes(), &out))
	require.Len(t, out, 1)
	assert.Equal(t, "B", out[0]["recipientId"])
	assert.Equal(t, "F", out[0]["fileId"])
}

func TestDeleteFileMetadata_RemovesAllRows(t *testing.T) {
	env := startPostgresMeta(t)
	if env.container != nil {
		defer env.container.Terminate(context.Background())
	}
	db := openDBMeta(t, env.dsn)
	defer db.Close()
	execSQL(t, db, schemaFilesTagsArray)
	execSQL(t, db, schemaSharing)
	defer setMetaDB(t, db)()

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
	env := startPostgresMeta(t)
	if env.container != nil {
		defer env.container.Terminate(context.Background())
	}
	db := openDBMeta(t, env.dsn)
	defer db.Close()
	execSQL(t, db, schemaFilesTagsArray)
	defer setMetaDB(t, db)()

	_, _ = db.Exec(`INSERT INTO files (id,owner_id,file_name,tags) VALUES ('Fx','U','doc', ARRAY['a','b','c'])`)

	rr := postJSON1(md.RemoveTagsFromFileHandler, "/tags/remove", map[string]any{"fileId": "Fx", "tags": []string{"b"}})
	assert.Equal(t, http.StatusOK, rr.Code)

	var tags []string
	_ = db.QueryRow(`SELECT tags FROM files WHERE id='Fx'`).Scan((*mdpqArray)(&tags))
	assert.ElementsMatch(t, []string{"a", "c"}, tags)

	rr2 := postJSON1(md.AddTagsHandler, "/tags/add", map[string]any{"fileId": "Fx", "tags": []string{"d", "e"}})
	assert.Equal(t, http.StatusOK, rr2.Code)

	tags = nil
	_ = db.QueryRow(`SELECT tags FROM files WHERE id='Fx'`).Scan((*mdpqArray)(&tags))
	assert.ElementsMatch(t, []string{"a", "c", "d", "e"}, tags)
}

type mdpqArray []string
func (a *mdpqArray) Scan(src any) error {
	switch v := src.(type) {
	case []byte:
		s := string(v)
		s = s[1:len(s)-1]
		if s == "" {
			*a = nil
			return nil
		}
		var out []string
		cur, inq := "", false
		for i := 0; i < len(s); i++ {
			c := s[i]
			if c == '"' {
				inq = !inq
				continue
			}
			if c == ',' && !inq {
				out = append(out, cur)
				cur = ""
				continue
			}
			cur += string(c)
		}
		out = append(out, cur)
		*a = out
		return nil
	default:
		return fmt.Errorf("unsupported")
	}
}

func TestGetRecipientIDFromOPK_And_InsertReceived_Sent(t *testing.T) {
	env := startPostgresMeta(t)
	if env.container != nil {
		defer env.container.Terminate(context.Background())
	}
	db := openDBMeta(t, env.dsn)
	defer db.Close()
	execSQL(t, db, schemaSharing)
	defer setMetaDB(t, db)()

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
	env := startPostgresMeta(t)
	if env.container != nil {
		defer env.container.Terminate(context.Background())
	}
	db := openDBMeta(t, env.dsn)
	defer db.Close()
	execSQL(t, db, schemaFilesTagsArray)
	execSQL(t, db, schemaSharing) 
	defer setMetaDB(t, db)()

	rr := postJSON1(md.AddUserHandler, "/user/add", map[string]any{"userId": "UX"})
	assert.Equal(t, http.StatusOK, rr.Code)
	rr2 := postJSON1(md.AddUserHandler, "/user/add", map[string]any{"userId": "UX"})
	assert.Equal(t, http.StatusOK, rr2.Code)

	_, _ = db.Exec(`INSERT INTO files (id,owner_id,file_name,description,cid) VALUES ('FF','UX','doc','old','old/path')`)

	rr3 := postJSON1(md.AddDescriptionHandler, "/file/desc", map[string]any{"fileId": "FF", "description": "new"})
	assert.Equal(t, http.StatusOK, rr3.Code)

	rr4 := postJSON1(md.UpdateFilePathHandler, "/file/path", map[string]any{"fileId": "FF", "newPath": "new/path"})
	assert.Equal(t, http.StatusOK, rr4.Code)

	var desc, cid string
	_ = db.QueryRow(`SELECT description,cid FROM files WHERE id='FF'`).Scan(&desc, &cid)
	assert.Equal(t, "new", desc)
	assert.Equal(t, "new/path", cid)
}
