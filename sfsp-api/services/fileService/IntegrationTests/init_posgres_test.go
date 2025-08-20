//go:build integration
// +build integration

package integration_test

import (
	//"testing"
	//"github.com/stretchr/testify/require"

	//dbpkg "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/database"
)

// func TestInitPostgre_Fails_WithInvalidURI(t *testing.T) {
// 	const bad = "postgres://bad:bad@127.0.0.1:1/nodb?sslmode=disable&connect_timeout=1"

// 	prev := os.Getenv("POSTGRES_URI")
// 	t.Cleanup(func() { _ = os.Setenv("POSTGRES_URI", prev) })
// 	require.NoError(t, os.Setenv("POSTGRES_URI", bad))

// 	db, err := dbpkg.InitPostgre()
// 	if db != nil {
// 		_ = db.Close()
// 	}
// 	require.Error(t, err)
// }

// func TestInitPostgre_Fails_WhenURIEmpty(t *testing.T) {
// 	t.Parallel()
// 	t.Setenv("POSTGRES_URI", "")

// 	db, err := dbpkg.InitPostgre()
// 	require.Error(t, err)
// 	if db != nil {
// 		_ = db.Close()
// 	}
// }
