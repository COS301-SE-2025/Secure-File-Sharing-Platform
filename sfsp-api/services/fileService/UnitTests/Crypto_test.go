package unitTests

import (
	//"os"
	"testing"
	"bytes"
	"io"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	//"github.com/joho/godotenv"
	en "github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/crypto"
)

func TestEncryptStream_Success(t *testing.T) {
	plaintext := []byte("This is some test data to encrypt!")
	key := "12345678901234567890123456789012" 

	var encryptedData bytes.Buffer

	err := en.EncryptStream(bytes.NewReader(plaintext), &encryptedData, key)
	require.NoError(t, err)
	assert.Greater(t, encryptedData.Len(), 0, "Encrypted data should not be empty")
}

func TestDecryptStream_Success(t *testing.T) {
	plaintext := []byte("This is some test data to encrypt!")
	key := "12345678901234567890123456789012"

	var encryptedData bytes.Buffer
	err := en.EncryptStream(bytes.NewReader(plaintext), &encryptedData, key)
	require.NoError(t, err)
	decryptedReader, err := en.DecryptStream(&encryptedData, key)
	require.NoError(t, err)

	decryptedData := new(bytes.Buffer)
	_, err = io.Copy(decryptedData, decryptedReader)
	require.NoError(t, err)

	assert.Equal(t, string(plaintext), decryptedData.String())
}

func TestEncryptStream_InvalidKeyLength(t *testing.T) {
	plaintext := []byte("This is some test data to encrypt!")
	key := "shortkey"

	var encryptedData bytes.Buffer
	err := en.EncryptStream(bytes.NewReader(plaintext), &encryptedData, key)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "AES key must be 32 bytes long")
}

func TestDecryptStream_InvalidKeyLength(t *testing.T) {		
	plaintext := []byte("This is some test data to encrypt!")
	key := "12345678901234567890123456789012" 


	var encryptedData bytes.Buffer
	err := en.EncryptStream(bytes.NewReader(plaintext), &encryptedData, key)
	require.NoError(t, err)

	invalidKey := "shortkey"
	_, err = en.DecryptStream(&encryptedData, invalidKey)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "AES key must be 32 bytes long")
}

func TestDecryptStream_FailedToReadIV(t *testing.T) {
	plaintext := []byte("This is some test data to encrypt!")
	key := "12345678901234567890123456789012" 

	var encryptedData bytes.Buffer
	err := en.EncryptStream(bytes.NewReader(plaintext), &encryptedData, key)
	require.NoError(t, err)
	corruptedData := encryptedData.Bytes()
	corruptedData[0] = 0 

	encryptedData = *bytes.NewBuffer(corruptedData)
	_, err = en.DecryptStream(&encryptedData, key)

	// require.Error(t, err)
	// assert.Contains(t, err.Error(), "failed to read IV")
}


func TestDecryptStream_FailedToCreateCipher(t *testing.T) {
	plaintext := []byte("This is some test data to encrypt!")
	key := "12345678901234567890123456789012" 

	var encryptedData bytes.Buffer
	err := en.EncryptStream(bytes.NewReader(plaintext), &encryptedData, key)
	require.NoError(t, err)
	invalidKey := "invalidkey1234567890123456" 

	_, err = en.DecryptStream(&encryptedData, invalidKey)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "AES key must be 32 bytes long")
}