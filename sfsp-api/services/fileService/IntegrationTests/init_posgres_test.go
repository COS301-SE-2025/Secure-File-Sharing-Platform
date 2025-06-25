package database_test

import (
	"os"
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/database"
)

func TestInitPostgre_RealConnection(t *testing.T) {
	// Ensure this is only run when a real DB is available
	dsn := os.Getenv("POSTGRES_URI")
	if dsn == "" {
		t.Skip("POSTGRES_URI not set, skipping integration test")
	}

	db, err := database.InitPostgre()
	require.NoError(t, err)
	require.NotNil(t, db)

	err = db.Close()
	require.NoError(t, err)
}
