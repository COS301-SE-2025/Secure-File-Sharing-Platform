package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"io"
	"fmt"
)

func DecryptStream(input io.Reader, key string) (io.Reader, error) {
	keyBytes := []byte(key)
	if len(keyBytes) != 32 {
		return nil, fmt.Errorf("AES key must be 32 bytes long")
	}

	// Read IV first
	iv := make([]byte, aes.BlockSize)
	if _, err := io.ReadFull(input, iv); err != nil {
		return nil, fmt.Errorf("failed to read IV: %v", err)
	}

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %v", err)
	}

	stream := cipher.NewCFBDecrypter(block, iv)
	return &cipher.StreamReader{S: stream, R: input}, nil
}