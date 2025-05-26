package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"errors"
)

func DecryptBytes(data []byte, key string) ([]byte, error) {
	keyBytes := []byte(key)
	if len(keyBytes) != 32 {
		return nil, errors.New("AES key must be 32 bytes")
	}

	if len(data) < aes.BlockSize {
		return nil, errors.New("ciphertext too short")
	}

	iv := data[:aes.BlockSize]
	ciphertext := data[aes.BlockSize:]

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return nil, err
	}

	stream := cipher.NewCFBDecrypter(block, iv)
	decrypted := make([]byte, len(ciphertext))
	stream.XORKeyStream(decrypted, ciphertext)

	return decrypted, nil
}
