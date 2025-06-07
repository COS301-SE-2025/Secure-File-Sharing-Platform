package metadata

import (
	"context"
	"encoding/json"
	"net/http"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/filehandler"
	//"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
	"go.mongodb.org/mongo-driver/bson"
	"log"
	"fmt"
	"time"
)

// QueryRequest represents the request payload for querying metadata
type QueryRequest struct {
	UserID string `json:"userId"`
}

// GetMetadataHandler handles the request to retrieve metadata for a user
func GetMetadataHandler(w http.ResponseWriter, r *http.Request) {
	var req QueryRequest
	err := json.NewDecoder(r.Body).Decode(&req)

	var rawBody map[string]interface{}
    json.NewDecoder(r.Body).Decode(&rawBody)
    fmt.Println("🔎 Raw decoded body:", rawBody)

	if err != nil || req.UserID == "" {
		log.Println("User Id is: " + req.UserID)
		http.Error(w, "Missing or invalid 'userId' in request body", http.StatusBadRequest)
		return
	}

	collection := filehandler.MongoClient.Database("sfsp").Collection("files")

	filter := bson.M{"userId": req.UserID}

	cursor, err := collection.Find(context.TODO(), filter)
	if err != nil {
		http.Error(w, "Error querying metadata: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer cursor.Close(context.TODO())

	var results []filehandler.Metadata
	if err = cursor.All(context.TODO(), &results); err != nil {
		http.Error(w, "Failed to decode metadata: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if len(results) == 0 {
		http.Error(w, "No metadata found for this user", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

// GetNumberOfFiles handles the request to count the number of files for a user
func GetNumberOfFiles(w http.ResponseWriter, r *http.Request) {
	var req QueryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.UserID == "" {
		http.Error(w, "Missing or invalid 'userId' in request body", http.StatusBadRequest)
		return
	}

	collection := filehandler.MongoClient.Database("sfsp").Collection("files")
	filter := bson.M{"userId": req.UserID}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	count, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		http.Error(w, "Error counting files: "+err.Error(), http.StatusInternalServerError)
		return
	}

	//log.Printf("📄 Counted %d files for user %s", count, req.UserID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]int64{"numberOfFiles": count})
}
