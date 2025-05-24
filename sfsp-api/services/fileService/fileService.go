package main

import (
	"fmt"
	"log"
	"net/http"
	"fileService/fileHandler"
)

//this is the server the api will connect to for file operations

func main() {
	http.HandleFunc("/upload", uploadHandler)
	http.HandleFunc("/download", downloadHandler)

	port := ":8080"
	fmt.Printf("File service running on port %s\n", port)
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}