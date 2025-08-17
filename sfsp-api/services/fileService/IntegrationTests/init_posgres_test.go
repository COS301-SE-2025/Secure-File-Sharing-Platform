//go:build integration
// +build integration

package integration_test

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	nat "github.com/docker/go-connections/nat"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"

	dbpkg "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/database"
)

func startPostgresContainer(t *testing.T) (testcontainers.Container, string) {
	t.Helper()
	ctx := context.Background()

	const (
		user     = "testuser"
		password = "testpass"
		dbname   = "testdb"
	)

	req := testcontainers.ContainerRequest{
		Image:        "postgres:16-alpine",
		ExposedPorts: []string{"5432/tcp"},
		Env: map[string]string{
			"POSTGRES_USER":     user,
			"POSTGRES_PASSWORD": password,
			"POSTGRES_DB":       dbname,
		},
		WaitingFor: wait.ForSQL(
			"5432/tcp",
			"postgres",
			func(host string, port nat.Port) string {
				return fmt.Sprintf(
					"postgres://%s:%s@%s:%s/%s?sslmode=disable",
					user, password, host, port.Port(), dbname,
				)
			},
		).WithStartupTimeout(90 * time.Second),
	}

	container, err := testcontainers.GenericContainer(
		ctx,
		testcontainers.GenericContainerRequest{
			ContainerRequest: req,
			Started:          true,
		},
	)
	require.NoError(t, err, "failed to start postgres container")

	host, err := container.Host(ctx)
	require.NoError(t, err)

	mapped, err := container.MappedPort(ctx, "5432/tcp")
	require.NoError(t, err)

	dsn := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=disable",
		user, password, host, mapped.Port(), dbname,
	)
	return container, dsn
}

func TestInitPostgre_Fails_WithInvalidURI(t *testing.T) {
	t.Parallel()

	prev := os.Getenv("POSTGRES_URI")
	t.Cleanup(func() { _ = os.Setenv("POSTGRES_URI", prev) })
	require.NoError(t, os.Setenv("POSTGRES_URI", "postgres://bad:bad@127.0.0.1:1/nodb?sslmode=disable"))

	db, err := dbpkg.InitPostgre()
	require.Error(t, err)
	if db != nil {
		_ = db.Close()
	}
}

func TestInitPostgre_Fails_WhenURIEmpty(t *testing.T) {
	t.Parallel()

	prev := os.Getenv("POSTGRES_URI")
	t.Cleanup(func() { _ = os.Setenv("POSTGRES_URI", prev) })
	require.NoError(t, os.Setenv("POSTGRES_URI", ""))

	db, err := dbpkg.InitPostgre()
	require.Error(t, err)
	if db != nil {
		_ = db.Close()
	}
}
