package database

import (
	"database/sql"
	"time"
)

type FileMetadata struct {
	FileName    string
	FileSize    int64
	FileType    string
	UserID      string
	Nonce       string
	UploadTime  time.Time
	Description string
	Tags        []string
	Path        string
}

func SaveMetadata(db *sql.DB, meta FileMetadata) error {
	_, err := db.Exec(`
		INSERT INTO files (id, owner_id, file_name, file_type, file_size, cid, nonce, encrypted_file_key, created_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
	`, meta.UserID, meta.FileName, meta.FileType, meta.FileSize, meta.Path, meta.Nonce, "", meta.UploadTime)

	return err
}
