package fileHandler

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	//"strings"
	"time"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
    "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/crypto"
	"go.mongodb.org/mongo-driver/mongo"
    //"go.mongodb.org/mongo-driver/mongo/options"
	"os"
    "log"
)

// type MongoClientInterface interface {
//     Database(name string, opts ...*options.DatabaseOptions) MongoDatabaseInterface
// }

// var MongoClient MongoClientInterface

var MongoClient *mongo.Client

func SetMongoClient(client *mongo.Client) {
    MongoClient = client
}
type UploadRequest struct {
	FileName      string   `json:"fileName"`
	FileType      string   `json:"fileType"`
	UserID        string   `json:"userId"`
	Nonce        string   `json:"nonce"`
	Description   string   `json:"fileDescription"`
	Tags          []string `json:"fileTags"`
	Path          string   `json:"path"`
	FileContent   string   `json:"fileContent"`
}

type Metadata struct {
	FileName        string    `bson:"fileName"`
	FileSize        int64     `bson:"fileSize"`
	FileType        string    `bson:"fileType"`
	UserID          string    `bson:"userId"`
	Nonce		    string    `bson:"nonce"`
	UploadTimestamp time.Time `bson:"uploadTimestamp"`
	Description     string    `bson:"description"`
	Tags            []string  `bson:"tags"`
	Path            string    `bson:"path"`
}

var GetCollection = func() *mongo.Collection {
    return MongoClient.Database("sfsp").Collection("files")
}

func UploadHandler(w http.ResponseWriter, r *http.Request) {
	var req UploadRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.FileName == "" || req.FileContent == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	// Decode file content
	fileBytes, err := base64.StdEncoding.DecodeString(req.FileContent)
	if err != nil {
		http.Error(w, "Invalid base64 file content", http.StatusBadRequest)
		return
	}

	// Encrypt file
	aesKey := os.Getenv("AES_KEY")
	if len(aesKey) != 32 {
		http.Error(w, "Invalid AES key", http.StatusInternalServerError)
		return
	}

	//No encryption is done here, but you can implement it if needed
    cipher, err := crypto.EncryptBytes(fileBytes, aesKey)
    if err != nil {
        http.Error(w, fmt.Sprintf("Encryption failed: %v", err), http.StatusInternalServerError)
        log.Println("Encryption error:", err)
        return
    }

	// Upload to OwnCloud
	remotePath := req.Path
	if remotePath == "" {
		remotePath = "files"
	}

	err = owncloud.UploadFile(remotePath, req.FileName, cipher)
	if err != nil {
		http.Error(w, fmt.Sprintf("Upload failed: %v", err), http.StatusInternalServerError)
        log.Println("Upload error:", err)
		return
	}

	// Save metadata
	collection := MongoClient.Database("sfsp").Collection("files")
	metadata := Metadata{
		FileName:        req.FileName,
		FileSize:        int64(len(fileBytes)),
		FileType:        req.FileType,
		UserID:          req.UserID,
		Nonce:           req.Nonce,
		UploadTimestamp: time.Now(),
		Description:     req.Description,
		Tags:            req.Tags,
		Path:            remotePath,
	}

	_, err = collection.InsertOne(context.TODO(), metadata)
	if err != nil {
		http.Error(w, "Metadata storage failed", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	fmt.Fprintf(w, "File uploaded and metadata stored")
}
