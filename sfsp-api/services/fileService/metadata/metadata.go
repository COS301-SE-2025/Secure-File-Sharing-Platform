package metadata

import (
	"context"
	"encoding/json"
	//"fmt"
	"net/http"

	"go.mongodb.org/mongo-driver/bson"
	//"go.mongodb.org/mongo-driver/bson/primitive"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"

	//"go.mongodb.org/mongo-driver/mongo"
)

func GetMetadataHandler(w http.ResponseWriter, r *http.Request) {
	userId := r.URL.Query().Get("userId")
	if userId == "" {
		http.Error(w, "Missing 'userId' query parameter", http.StatusBadRequest)
		return
	}

	collection := fileHandler.MongoClient.Database("sfsp").Collection("files")

	filter := bson.M{"userId": userId}

	cursor, err := collection.Find(context.TODO(), filter)
	if err != nil {
		http.Error(w, "Error querying metadata: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer cursor.Close(context.TODO())

	var results []fileHandler.Metadata
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

