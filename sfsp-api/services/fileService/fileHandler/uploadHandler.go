package uploadHandler

import (
	"fmt"
	"net/http"
	"fileService/crypto"
)

func UploadHandler(w http.ResponseWriter, r *http.Request) {
	// Check if the request method is POST
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	
}