package database

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"

	//"github.com/joho/godotenv"
	"os"
)

// Package database provides functions to connect to a PostgreSQL database.

// connect to the PostgreSQL database
func InitPostgre() (*sql.DB, error) {
	db, err := sql.Open("postgres", os.Getenv("POSTGRES_URI"))
	if err != nil {
		return nil, fmt.Errorf("PostgreSQL connect error: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("PostgreSQL ping error: %w", err)
	}

	log.Println("✅ PostgreSQL connected")
	return db, nil
}
