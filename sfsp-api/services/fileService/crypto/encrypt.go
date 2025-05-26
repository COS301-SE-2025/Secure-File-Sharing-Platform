package crypto

import(
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	//"errors"
	//"encoding/base64"
	"fmt"
	"io"
)

func EncryptBytes(data []byte, key string) ([]byte, error) {
	keyBytes := []byte(key)
	if len(keyBytes) != 32 {
		return nil, fmt.Errorf("AES key must be 32 bytes long")
	}

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %v", err)
	}

	iv := make([]byte, aes.BlockSize)
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return nil, fmt.Errorf("failed to generate IV: %v", err)
	}

	ciphertext := make([]byte, len(data))
	stream := cipher.NewCFBEncrypter(block, iv)
	stream.XORKeyStream(ciphertext, data)

	// Prepend IV
	return append(iv, ciphertext...), nil
}
