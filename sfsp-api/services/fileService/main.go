package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/database"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/fileHandler"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/metadata"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/owncloud"
	"github.com/joho/godotenv"
)

type HealthResponse struct {
	Status   string            `json:"status"`
	Services map[string]string `json:"services"`
	Message  string            `json:"message"`
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	services := make(map[string]string)

	db, err := database.InitPostgre()
	if err != nil || db == nil {
		services["postgresql"] = "disconnected"
	} else {
		services["postgresql"] = "connected"
	}

	status := "healthy"
	for _, serviceStatus := range services {
		if serviceStatus == "disconnected" {
			status = "degraded"
			break
		}
	}

	response := HealthResponse{
		Status:   status,
		Services: services,
		Message:  "File service health check",
	}

	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Println("Failed to encode response:", err)
	}
}

func main() {

	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	log.Println("Starting File Service...")
	log.Println("Environment variables loaded successfully")
	log.Println("ownCloud URL:", os.Getenv("OWNCLOUD_URL"))

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

	http.HandleFunc("/startUpload", fileHandler.StartUploadHandler)
	http.HandleFunc("/upload", fileHandler.UploadHandler)
	http.HandleFunc("/download", fileHandler.DownloadHandler)

	// access log endpoints
	http.HandleFunc("/addAccesslog", fileHandler.AddAccesslogHandler)
	http.HandleFunc("/getAccesslog", fileHandler.GetAccesslogHandler)
	// notification endpoints
	http.HandleFunc("/notifications", fileHandler.NotificationHandler)
	http.HandleFunc("/notifications/markAsRead", fileHandler.MarkAsReadHandler)
	http.HandleFunc("/notifications/respond", fileHandler.RespondToShareRequestHandler)
	http.HandleFunc("/notifications/clear", fileHandler.ClearNotificationHandler)
	http.HandleFunc("/notifications/add", fileHandler.AddNotificationHandler)
	// metadata endpoints
	http.HandleFunc("/metadata", metadata.GetUserFilesHandler)
	http.HandleFunc("/addDescription", metadata.AddDescriptionHandler)
	http.HandleFunc("/getFileMetadata", metadata.ListFileMetadataHandler)
	http.HandleFunc("/getNumberOfFiles", metadata.GetUserFileCountHandler)
	http.HandleFunc("/addPendingFiles", metadata.AddReceivedFileHandler)
	http.HandleFunc("/getPendingFiles", metadata.GetPendingFilesHandler)
	http.HandleFunc("/deleteFile", fileHandler.DeleteFileHandler)
	http.HandleFunc("/sendFile", fileHandler.SendFileHandler)
	http.HandleFunc("/addTags", metadata.AddTagsHandler)
	http.HandleFunc("/addUser", metadata.AddUserHandler)
	http.HandleFunc("/removeTags", metadata.RemoveTagsFromFileHandler)
	http.HandleFunc("/downloadSentFile", fileHandler.DownloadSentFile)

	// view files endpoints newly added
	http.HandleFunc("/sendByView", fileHandler.SendByViewHandler)
	http.HandleFunc("/revokeViewAccess", fileHandler.RevokeViewAccessHandler)
	http.HandleFunc("/getSharedViewFiles", fileHandler.GetSharedViewFilesHandler)
	http.HandleFunc("/getViewFileAccessLogs", fileHandler.GetViewFileAccessLogs)
	http.HandleFunc("/downloadViewFile", fileHandler.DownloadViewFileHandler)

	//test from here
	http.HandleFunc("/addSentFiles", metadata.AddSentFileHandler)
	http.HandleFunc("/getSentFiles", metadata.GetSentFilesHandler)

	// Folder handling
	http.HandleFunc("/createFolder", fileHandler.CreateFolderHandler)
	http.HandleFunc("/updateFilePath", metadata.UpdateFilePathHandler)

	// Password reset - file re-encryption
	http.HandleFunc("/updateFile", fileHandler.UpdateFileHandler)

	//changeMethod
	http.HandleFunc("/changeMethod", fileHandler.ChangeShareMethodHandler)
	http.HandleFunc("/usersWithFileAccess", fileHandler.GetUsersWithFileAccessHandler)
	http.HandleFunc("/health", healthHandler)

	// Start the HTTP server
	log.Println("File Service is running on port 8081")
	log.Fatal(http.ListenAndServe(":8081", nil))
}
