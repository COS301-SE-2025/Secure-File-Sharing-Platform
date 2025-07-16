package fileHandler

import (
	"net/http"
)

func SendByViewHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		FileID          string                 `json:"fileid"`
		UserID          string                 `json:"userId"`
		RecipientUserID string                 `json:"recipientUserId"`
		EncryptedFile   string                 `json:"encryptedFile"`
		EncryptedAESKey string                 `json:"encryptedAesKey"`
		EKPublicKey     string                 `json:"ekPublicKey"`
		Metadata        map[string]interface{} `json:"metadata"`
	}
}
