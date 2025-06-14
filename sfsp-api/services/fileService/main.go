package main

import (
    //"context"
    "log"
    "net/http"
    //"time"

    "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/database"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
    "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
    "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/metadata"
    "os"
    "github.com/joho/godotenv"

    //"go.mongodb.org/mongo-driver/mongo"
    //"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {

    err := godotenv.Load()
    if err != nil {
        log.Fatal("Error loading .env file")
    }

    log.Println("Starting File Service...")
    log.Println("Environment variables loaded successfully")
    log.Println("mongoURI:", os.Getenv("MONGO_URI"))
    log.Println("ownCloud URL:", os.Getenv("OWNCLOUD_URL"))


    mongoURI := os.Getenv("MONGO_URI")
    client, het := database.InitMongo(mongoURI)
    if het != nil {
        log.Fatalf("Failed to connect to MongoDB: %v", het)
    }
	fileHandler.SetMongoClient(client)

	//initialize ownCloud client
	owncloud.InitOwnCloud(os.Getenv("OWNCLOUD_URL"), os.Getenv("OWNCLOUD_USERNAME"), os.Getenv("OWNCLOUD_PASSWORD"))

    http.HandleFunc("/upload", fileHandler.UploadHandler)
	http.HandleFunc("/download", fileHandler.DownloadHandler)
    http.HandleFunc("/metadata", metadata.GetMetadataHandler)
    http.HandleFunc("/getNumberOfFiles", metadata.GetNumberOfFiles)
	log.Fatal(http.ListenAndServe(":8081", nil))
}
