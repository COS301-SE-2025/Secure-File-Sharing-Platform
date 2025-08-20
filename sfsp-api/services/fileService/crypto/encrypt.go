package crypto

import(
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"fmt"
	"io"
)

var EncryptStream = func(input io.Reader, output io.Writer, key string) error {
	keyBytes := []byte(key)
	if len(keyBytes) != 32 {
		return fmt.Errorf("AES key must be 32 bytes long")
	}

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return fmt.Errorf("failed to create cipher: %v", err)
	}

	// Generate IV
	iv := make([]byte, aes.BlockSize)
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return fmt.Errorf("failed to generate IV: %v", err)
	}

	// Write IV to the beginning of the output
	if _, err := output.Write(iv); err != nil {
		return fmt.Errorf("failed to write IV: %v", err)
	}

	// Encrypt in chunks
	stream := cipher.NewCFBEncrypter(block, iv)
	writer := &cipher.StreamWriter{S: stream, W: output}

	_, err = io.Copy(writer, input)
	if err != nil {
		return fmt.Errorf("encryption failed: %v", err)
	}

	return nil
}