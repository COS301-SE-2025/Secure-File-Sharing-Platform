package main

import (
    //"context"
    "log"
    "net/http"
    //"time"

    "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/database"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
    "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"

    //"go.mongodb.org/mongo-driver/mongo"
    //"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
    mongoURI := "mongodb+srv://Sibu2025:xWQNdqTKQq5bi7Bo@cluster0.8ywqk4g.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    client := mongo.InitMongo(mongoURI)
	upload.SetMongoClient(client)

	//initialize ownCloud client
	owncloud.InitOwnCloud("http://localhost:8080/remote.php/webdav", "admin", "admin")

    http.HandleFunc("/upload", upload.UploadHandler)
	log.Fatal(http.ListenAndServe(":8081", nil))
}
