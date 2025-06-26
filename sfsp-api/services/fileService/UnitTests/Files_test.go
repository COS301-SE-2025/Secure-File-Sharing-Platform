package unitTests
import (
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/require"

	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/database"
)

func TestSaveMetadata_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	meta := database.FileMetadata{
		UserID:      "user-123",
		FileName:    "test.pdf",
		FileType:    "application/pdf",
		FileSize:    1024,
		Nonce:       "random-nonce",
		UploadTime:  time.Now(),
		Path:        "cid123abc",
		Description: "Encrypted file",
		Tags:        []string{"tag1", "tag2"},
	}

	mock.ExpectExec(regexp.QuoteMeta(`
		INSERT INTO files (id, owner_id, file_name, file_type, file_size, cid, nonce, encrypted_file_key, created_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
	`)).
		WithArgs(meta.UserID, meta.FileName, meta.FileType, meta.FileSize, meta.Path, meta.Nonce, "", meta.UploadTime).
		WillReturnResult(sqlmock.NewResult(1, 1))

	err = database.SaveMetadata(db, meta)
	require.NoError(t, err)

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestSaveMetadata_DBError(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	meta := database.FileMetadata{
		UserID:      "user-123",
		FileName:    "fail.pdf",
		FileType:    "application/pdf",
		FileSize:    2048,
		Nonce:       "nonce-fail",
		UploadTime:  time.Now(),
		Path:        "cid-fail",
		Description: "Should fail",
		Tags:        []string{"fail"},
	}

	mock.ExpectExec(regexp.QuoteMeta(`
		INSERT INTO files (id, owner_id, file_name, file_type, file_size, cid, nonce, encrypted_file_key, created_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
	`)).
		WithArgs(meta.UserID, meta.FileName, meta.FileType, meta.FileSize, meta.Path, meta.Nonce, "", meta.UploadTime).
		WillReturnError(sqlmock.ErrCancelled)

	err = database.SaveMetadata(db, meta)
	require.Error(t, err)

	require.NoError(t, mock.ExpectationsWereMet())
}