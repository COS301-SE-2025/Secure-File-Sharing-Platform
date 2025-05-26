package fileHandler

import (
    "context"
    "fmt"
    "io"
    "net/http"
    "strings"
    "time"

    "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
    "go.mongodb.org/mongo-driver/mongo"
)

var MongoClient *mongo.Client // Injected from main.go

type Metadata struct {
    FileName        string    `bson:"fileName"`
    FileSize        int64     `bson:"fileSize"`
    FileType        string    `bson:"fileType"`
    UserID          string    `bson:"userId"`
    EncryptionKey   string    `bson:"encryptionKey"`
    UploadTimestamp time.Time `bson:"uploadTimestamp"`
    Description     string    `bson:"description"`
    Tags            []string  `bson:"tags"`
    Path            string    `bson:"path"`
}

func SetMongoClient(client *mongo.Client) {
    MongoClient = client
}

func UploadHandler(w http.ResponseWriter, r *http.Request) {
    err := r.ParseMultipartForm(20 << 20) // 20 MB max
    if err != nil {
        http.Error(w, "Failed to parse form", http.StatusBadRequest)
        return
    }

    file, handler, err := r.FormFile("file")
    if err != nil {
        http.Error(w, "File missing", http.StatusBadRequest)
        return
    }
    defer file.Close()

    fileBytes, err := io.ReadAll(file)
    if err != nil {
        http.Error(w, "Failed to read file", http.StatusInternalServerError)
        return
    }

    // Extract metadata from form
    remotePath := r.FormValue("path")
    if remotePath == "" {
        remotePath = "files"
    }

    fileType := r.FormValue("fileType")
    userId := r.FormValue("userId")
    encryptionKey := r.FormValue("encryptionKey")
    description := r.FormValue("fileDescription")
    tags := strings.Split(r.FormValue("fileTags"), ",")

    // Use your existing owncloud package here
    err = owncloud.UploadFile(remotePath, handler.Filename, fileBytes)
    if err != nil {
        http.Error(w, fmt.Sprintf("Upload failed: %v", err), http.StatusInternalServerError)
        return
    }

    metadata := Metadata{
        FileName:        handler.Filename,
        FileSize:        handler.Size,
        FileType:        fileType,
        UserID:          userId,
        EncryptionKey:   encryptionKey,
        UploadTimestamp: time.Now(),
        Description:     description,
        Tags:            tags,
        Path:            remotePath,
    }

    collection := MongoClient.Database("sfsp").Collection("files")
    _, err = collection.InsertOne(context.TODO(), metadata)
    if err != nil {
        http.Error(w, fmt.Sprintf("File uploaded, but failed to save metadata: %v", err), http.StatusInternalServerError)
        return
    }

    fmt.Fprintf(w, "✅ File %s uploaded and metadata stored!", handler.Filename)
}