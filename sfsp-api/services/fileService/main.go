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
    //log.Println("mongoURI:", os.Getenv("MONGO_URI"))
    log.Println("ownCloud URL:", os.Getenv("OWNCLOUD_URL"))


    // mongoURI := os.Getenv("MONGO_URI")
    // client, het := database.InitMongo(mongoURI)
    // if het != nil {
    //     log.Fatalf("Failed to connect to MongoDB: %v", het)
    // }
	//fileHandler.SetMongoClient(client)

    db, err := database.InitPostgre()
    if err != nil {
        log.Fatalf("Failed to connect to PostgreSQL: %v", err)
    }

    if db != nil {
        log.Println("✅ PostgreSQL connected successfully")
    } else {
        log.Println("❌ PostgreSQL connection failed")
    }

    // Set the PostgreSQL client in the fileHandler package
    fileHandler.SetPostgreClient(db)
    metadata.SetPostgreClient(db)
    //log.Println("✅ PostgreSQL client set in fileHandler and metadata")

	//initialize ownCloud client
	owncloud.InitOwnCloud(os.Getenv("OWNCLOUD_URL"), os.Getenv("OWNCLOUD_USERNAME"), os.Getenv("OWNCLOUD_PASSWORD"))

    http.HandleFunc("/upload", fileHandler.UploadHandler)
	http.HandleFunc("/download", fileHandler.DownloadHandler)
    http.HandleFunc("/metadata", metadata.GetUserFilesHandler)
    http.HandleFunc("/getFileMetadata", metadata.ListFileMetadataHandler)
    http.HandleFunc("/getNumberOfFiles", metadata.GetUserFileCountHandler)
    http.HandleFunc("/addPendingFiles", metadata.AddReceivedFileHandler)
    http.HandleFunc("/getPendingFiles", metadata.GetPendingFilesHandler)
    http.HandleFunc("/deleteFile", fileHandler.DeleteFileHandler)
    http.HandleFunc("/sendFile", fileHandler.SendFileHandler)

    //test from here
    http.HandleFunc("/addSentFiles", metadata.AddSentFileHandler) //I will combine this with the addPendingFiles endpoint later
    http.HandleFunc("/AcceptReceivedFile", metadata.AcceptReceivedFileHandler)//I will make this automatically either upload the file to owncloud or download it to the user's device
    http.HandleFunc("/RejectReceivedFile", metadata.RejectReceivedFileHandler)
    http.HandleFunc("/getSentFiles", metadata.GetSentFilesHandler)
    http.HandleFunc("/addTags", metadata.AddTagsToFileHandler)
    http.HandleFunc("/removeTags", metadata.RemoveTagsFromFileHandler)
	log.Fatal(http.ListenAndServe(":8081", nil))
}
