// //go:build integration
// // +build integration

package integrationTests

// import (
// 	"bytes"
// 	"context"
// 	"crypto/sha256"
// 	"database/sql"
// 	"encoding/hex"
// 	"encoding/json"
// 	"fmt"
// 	"io"
// 	"mime/multipart"
// 	"net/http"
// 	"net/http/httptest"
// 	"os"
// 	"path/filepath"
// 	"strings"
// 	"testing"
// 	"time"

// 	"bou.ke/monkey"
// 	_ "github.com/lib/pq"
// 	"github.com/stretchr/testify/assert"
// 	"github.com/stretchr/testify/require"
// 	"github.com/testcontainers/testcontainers-go"
// 	"github.com/testcontainers/testcontainers-go/wait"

// 	fh "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
// 	oc "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
// )

// /* ----------------------------- Test Harness ----------------------------- */

// type pgEnv struct {
// 	DB         *sql.DB
// 	terminate  func()
// 	tmpOC      string
// 	unpatchAll func()
// }

// func setup(t *testing.T) *pgEnv {
// 	t.Helper()

// 	// 1) Start Postgres in a container
// 	ctx := context.Background()
// 	req := testcontainers.ContainerRequest{
// 		Image:        "postgres:16-alpine",
// 		ExposedPorts: []string{"5432/tcp"},
// 		Env: map[string]string{
// 			"POSTGRES_USER":     "test",
// 			"POSTGRES_PASSWORD": "test",
// 			"POSTGRES_DB":       "testdb",
// 		},
// 		WaitingFor: wait.ForAll(
// 			wait.ForListeningPort("5432/tcp"),
// 			wait.ForLog("database system is ready to accept connections"),
// 		).WithDeadline(60 * time.Second),
// 	}
// 	pgC, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
// 		ContainerRequest: req, Started: true,
// 	})
// 	require.NoError(t, err, "failed to start postgres container")

// 	host, err := pgC.Host(ctx)
// 	require.NoError(t, err)
// 	mapped, err := pgC.MappedPort(ctx, "5432")
// 	require.NoError(t, err)

// 	dsn := fmt.Sprintf("postgres://test:test@%s:%s/testdb?sslmode=disable", host, mapped.Port())
// 	db, err := sql.Open("postgres", dsn)
// 	if err != nil {
// 		_ = pgC.Terminate(ctx)
// 		require.NoError(t, err)
// 	}

// 	// Wait for ping
// 	deadline := time.Now().Add(30 * time.Second)
// 	for {
// 		if err := db.Ping(); err == nil {
// 			break
// 		}
// 		if time.Now().After(deadline) {
// 			_ = pgC.Terminate(ctx)
// 			require.FailNow(t, "db ping never succeeded", "%v", err)
// 		}
// 		time.Sleep(250 * time.Millisecond)
// 	}

// 	// 2) Minimal schema matching handlers
// 	const schema = `
// CREATE TABLE IF NOT EXISTS files (
//   id          TEXT PRIMARY KEY DEFAULT md5(random()::text),
//   owner_id    TEXT NOT NULL,
//   file_name   TEXT NOT NULL,
//   file_type   TEXT,
//   file_hash   TEXT NOT NULL,
//   nonce       TEXT,
//   description TEXT,
//   tags        TEXT[],
//   cid         TEXT,
//   file_size   BIGINT,
//   created_at  TIMESTAMP NOT NULL
// );`
// 	_, err = db.Exec(schema)
// 	if err != nil {
// 		_ = pgC.Terminate(ctx)
// 		require.NoError(t, err, "create schema")
// 	}

// 	// 3) Wire DB into handlers
// 	fh.SetPostgreClient(db)

// 	// 4) Patch OwnCloud functions to use a temp folder
// 	tmpRoot := t.TempDir()
// 	unpatch := patchOwnCloudToFS(t, tmpRoot)

// 	return &pgEnv{
// 		DB: db,
// 		terminate: func() {
// 			_ = db.Close()
// 			_ = pgC.Terminate(ctx)
// 		},
// 		tmpOC:      tmpRoot,
// 		unpatchAll: unpatch,
// 	}
// }

// func teardown(env *pgEnv) {
// 	if env == nil {
// 		return
// 	}
// 	env.unpatchAll()
// 	env.terminate()
// }

// // Replace owncloud.* calls with a file-system backed fake
// func patchOwnCloudToFS(t *testing.T, root string) func() {
// 	t.Helper()
// 	join := func(parts ...string) string { return filepath.Join(append([]string{root}, parts...)...) }

// 	p1 := monkey.Patch(oc.UploadFileStream, func(dir, name string, r io.Reader) error {
// 		require.NoError(t, os.MkdirAll(join(dir), 0o755))
// 		f, err := os.Create(join(dir, name))
// 		if err != nil {
// 			return err
// 		}
// 		defer f.Close()
// 		_, err = io.Copy(f, r)
// 		return err
// 	})

// 	p2 := monkey.Patch(oc.CreateFileStream, func(dir, name string) (io.WriteCloser, error) {
// 		require.NoError(t, os.MkdirAll(join(dir), 0o755))
// 		return os.Create(join(dir, name))
// 	})

// 	p3 := monkey.Patch(oc.DownloadFileStreamTemp, func(path string) (io.ReadCloser, error) {
// 		return os.Open(join(path))
// 	})

// 	p4 := monkey.Patch(oc.DeleteFileTemp, func(path string) error {
// 		return os.Remove(join(path))
// 	})

// 	return func() {
// 		p1.Unpatch()
// 		p2.Unpatch()
// 		p3.Unpatch()
// 		p4.Unpatch()
// 	}
// }

// /* --------------------------- Helper HTTP utils -------------------------- */

// func doJSON(t *testing.T, h http.HandlerFunc, method string, body any) *httptest.ResponseRecorder {
// 	t.Helper()
// 	var buf bytes.Buffer
// 	if body != nil {
// 		require.NoError(t, json.NewEncoder(&buf).Encode(body))
// 	}
// 	req := httptest.NewRequest(method, "/", &buf)
// 	req.Header.Set("Content-Type", "application/json")
// 	rr := httptest.NewRecorder()
// 	h.ServeHTTP(rr, req)
// 	return rr
// }

// func newMultipartUploadReq(
// 	t *testing.T,
// 	fields map[string]string,
// 	fileField, fileName string,
// 	fileBytes []byte,
// ) (*http.Request, *httptest.ResponseRecorder) {
// 	t.Helper()

// 	var body bytes.Buffer
// 	w := multipart.NewWriter(&body)

// 	for k, v := range fields {
// 		fw, err := w.CreateFormField(k)
// 		require.NoError(t, err, "CreateFormField %s", k)
// 		_, _ = io.Copy(fw, strings.NewReader(v))
// 	}

// 	if fileField != "" {
// 		fw, err := w.CreateFormFile(fileField, fileName) // use provided field name
// 		require.NoError(t, err, "CreateFormFile")
// 		_, err = fw.Write(fileBytes)
// 		require.NoError(t, err, "write file bytes")
// 	}
// 	require.NoError(t, w.Close())

// 	req := httptest.NewRequest(http.MethodPost, "/", &body)
// 	req.Header.Set("Content-Type", w.FormDataContentType())
// 	rr := httptest.NewRecorder()
// 	return req, rr
// }

// /* --------------------------------- TESTS -------------------------------- */

// func TestStartUploadHandler_Success(t *testing.T) {
// 	env := setup(t)
// 	defer teardown(env)

// 	payload := map[string]any{
// 		"userId":          "u123",
// 		"fileName":        "alpha.enc",
// 		"fileType":        "application/octet-stream",
// 		"fileDescription": "first upload",
// 		"fileTags":        []string{"a", "b"},
// 		"path":            "folderA",
// 		"nonce":           "nonce-123",
// 	}

// 	rr := doJSON(t, fh.StartUploadHandler, http.MethodPost, payload)
// 	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())

// 	var resp map[string]string
// 	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
// 	fileID := resp["fileId"]
// 	require.NotEmpty(t, fileID, "fileId must be returned")

// 	var owner, name, ftype, hash, nonce, desc, cid sql.NullString
// 	var size sql.NullInt64
// 	err := env.DB.QueryRow(`
// 		SELECT owner_id,file_name,file_type,file_hash,nonce,description,cid,file_size
// 		FROM files WHERE id=$1
// 	`, fileID).Scan(&owner, &name, &ftype, &hash, &nonce, &desc, &cid, &size)
// 	require.NoError(t, err)

// 	assert.Equal(t, "u123", owner.String)
// 	assert.Equal(t, "alpha.enc", name.String)
// 	assert.Equal(t, "", hash.String)         // empty at start
// 	assert.Equal(t, int64(0), size.Int64)    // size 0 at start
// 	assert.Equal(t, "folderA", cid.String)   // StartUpload stores path directly
// }

// func TestUploadHandler_ChunkedMerge_Success_DefaultPath(t *testing.T) {
// 	env := setup(t)
// 	defer teardown(env)

// 	// Build two chunks
// 	ch0 := []byte("hello ")
// 	ch1 := []byte("world")
// 	all := append(append([]byte{}, ch0...), ch1...)
// 	sum := sha256.Sum256(all)
// 	wantHash := hex.EncodeToString(sum[:])
// 	wantSize := int64(len(all))

// 	// 1) First chunk (no fileId, chunkIndex=0)
// 	fields1 := map[string]string{
// 		"userId":         "uX",
// 		"fileName":       "greeting.enc",
// 		"fileType":       "application/octet-stream",
// 		"fileHash":       "placeholder",
// 		"nonce":          "nonce-xyz",
// 		"fileDescription":"desc",
// 		"fileTags":       `["tag1","tag2"]`,
// 		"chunkIndex":     "0",
// 		"totalChunks":    "2",
// 		// no fileId, no path → default path "files"
// 	}

// 	req1, rr1 := newMultipartUploadReq(t, fields1, "encryptedFile", "c0.bin", ch0)
// 	fh.UploadHandler(rr1, req1)
// 	require.Equal(t, http.StatusOK, rr1.Code, rr1.Body.String())

// 	var resp1 map[string]string
// 	require.NoError(t, json.Unmarshal(rr1.Body.Bytes(), &resp1))
// 	fileID := resp1["fileId"]
// 	require.NotEmpty(t, fileID, "first chunk must return fileId")

// 	// 2) Second (last) chunk → triggers merge
// 	fields2 := map[string]string{
// 		"userId":         "uX",
// 		"fileName":       "greeting.enc",
// 		"fileType":       "application/octet-stream",
// 		"fileHash":       "placeholder",
// 		"nonce":          "nonce-xyz",
// 		"fileDescription":"desc",
// 		"fileTags":       `["tag1","tag2"]`,
// 		"chunkIndex":     "1",
// 		"totalChunks":    "2",
// 		"fileId":         fileID,
// 	}

// 	req2, rr2 := newMultipartUploadReq(t, fields2, "encryptedFile", "c1.bin", ch1)
// 	fh.UploadHandler(rr2, req2)
// 	require.Equal(t, http.StatusOK, rr2.Code, rr2.Body.String())

// 	var resp2 map[string]string
// 	require.NoError(t, json.Unmarshal(rr2.Body.Bytes(), &resp2))
// 	assert.Equal(t, "File uploaded and metadata stored", resp2["message"])
// 	assert.Equal(t, fileID, resp2["fileId"])

// 	// Check merged file bytes on fake OwnCloud
// 	mergedPath := filepath.Join(env.tmpOC, "files", fileID)
// 	gotBytes, err := os.ReadFile(mergedPath)
// 	require.NoError(t, err)
// 	assert.Equal(t, "hello world", string(gotBytes))

// 	// Check DB: hash/size/cid
// 	var gotHash, gotCID string
// 	var gotSize int64
// 	require.NoError(t, env.DB.QueryRow(`
// 		SELECT file_hash,file_size,cid FROM files WHERE id=$1
// 	`, fileID).Scan(&gotHash, &gotSize, &gotCID))

// 	assert.Equal(t, wantHash, gotHash)
// 	assert.Equal(t, wantSize, gotSize)
// 	assert.Equal(t, "files/"+fileID, gotCID) // default path
// }

// func TestUploadHandler_SingleChunk_CustomPath(t *testing.T) {
// 	env := setup(t)
// 	defer teardown(env)

// 	payload := []byte("only-one-chunk")
// 	sum := sha256.Sum256(payload)
// 	wantHash := hex.EncodeToString(sum[:])
// 	wantSize := int64(len(payload))

// 	fields := map[string]string{
// 		"userId":          "uZ",
// 		"fileName":        "single.enc",
// 		"fileType":        "application/octet-stream",
// 		"fileHash":        "placeholder",
// 		"nonce":           "n1",
// 		"fileDescription": "single",
// 		"fileTags":        `["x"]`,
// 		"chunkIndex":      "0",
// 		"totalChunks":     "1",
// 		"path":            "my/folder", // override
// 	}

// 	req, rr := newMultipartUploadReq(t, fields, "encryptedFile", "one.bin", payload)
// 	fh.UploadHandler(rr, req)
// 	require.Equal(t, http.StatusOK, rr.Code, rr.Body.String())

// 	var resp map[string]string
// 	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
// 	fileID := resp["fileId"]
// 	require.NotEmpty(t, fileID)

// 	var gotHash, gotCID string
// 	var gotSize int64
// 	require.NoError(t, env.DB.QueryRow(`
// 		SELECT file_hash,file_size,cid FROM files WHERE id=$1
// 	`, fileID).Scan(&gotHash, &gotSize, &gotCID))

// 	assert.Equal(t, wantHash, gotHash)
// 	assert.Equal(t, wantSize, gotSize)
// 	assert.Equal(t, "my/folder/"+fileID, gotCID)
// }

// func TestUploadHandler_InvalidTagsJSON_Returns400(t *testing.T) {
// 	env := setup(t)
// 	defer teardown(env)

// 	fields := map[string]string{
// 		"userId":          "uBad",
// 		"fileName":        "bad.enc",
// 		"fileType":        "application/octet-stream",
// 		"fileHash":        "placeholder",
// 		"nonce":           "n",
// 		"fileDescription": "bad",
// 		"fileTags":        `not-json`, // invalid JSON
// 		"chunkIndex":      "0",
// 		"totalChunks":     "1",
// 	}

// 	req, rr := newMultipartUploadReq(t, fields, "encryptedFile", "x.bin", []byte("abc"))
// 	fh.UploadHandler(rr, req)
// 	require.Equal(t, http.StatusBadRequest, rr.Code, rr.Body.String())
// }
