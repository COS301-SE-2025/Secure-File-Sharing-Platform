package unitTests

import (
	"os"
	"testing"
	"log"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/joho/godotenv"
	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/crypto"
)

func TestEncryptDecrypt(t *testing.T) {
	err := godotenv.Load("../.env")
    if err != nil {
        log.Fatal("Error loading .env file")
    }

	key := os.Getenv("AES_KEY")
	require.Len(t, key, 32)

	plaintext := "Hello world"
	cipher, err := crypto.EncryptBytes([]byte(plaintext), key)
	require.NoError(t, err)
	assert.NotEmpty(t, cipher)

	plain, err := crypto.DecryptBytes(cipher, key)
	require.NoError(t, err)
	assert.Equal(t, []byte(plaintext), plain)
}

func TestEncryptDecryptWithInvalidKey(t *testing.T) {
	key := "shortkey"
	plaintext := "Hello world"

	ciper, err := crypto.EncryptBytes([]byte(plaintext), key)
	require.Error(t, err)
	assert.Empty(t, ciper)

	plain, err := crypto.DecryptBytes(ciper, key)
	require.Error(t, err)
	assert.Empty(t, plain)
	assert.NotEqual(t, []byte(plaintext), plain) // Ensure decryption fails with invalid key
}

func TestEncryptDecryptWithEmptyKey(t *testing.T) {
	key := ""
	plaintext := "Hello world"

	ciper, err := crypto.EncryptBytes([]byte(plaintext), key)
	require.Error(t, err)
	assert.Empty(t, ciper)

	plain, err := crypto.DecryptBytes(ciper, key)
	require.Error(t, err)
	assert.Empty(t, plain)
	assert.NotEqual(t, []byte(plaintext), plain) // Ensure decryption fails with empty key
}

func TestEncryptDecryptWithEmptyPlaintext(t *testing.T) {
	err := godotenv.Load("../.env")
    if err != nil {
        log.Fatal("Error loading .env file")
    }

	key := os.Getenv("AES_KEY")
	require.Len(t, key, 32)

	plaintext := ""
	cipher, err := crypto.EncryptBytes([]byte(plaintext), key)
	require.NoError(t, err)
	assert.NotEmpty(t, cipher)

	plain, err := crypto.DecryptBytes(cipher, key)
	require.NoError(t, err)
	assert.Equal(t, []byte(plaintext), plain)
}

func TestDecryptWithInvalidCiphertext(t *testing.T) {
	invalidCiphertext := []byte("this is not a valid ciphertext")
	key := os.Getenv("AES_KEY")
	require.Len(t, key, 32)

	plain, err := crypto.DecryptBytes(invalidCiphertext, key)
	assert.Nil(t, err)
	assert.NotEmpty(t, plain)
	assert.NotEqual(t, []byte("this is not a valid ciphertext"), plain)
}

func TestEncryptWithInvalidCiphertext(t *testing.T) {
	invalidCiphertext := []byte("this is not a valid ciphertext")
	key := os.Getenv("AES_KEY")
	require.Len(t, key, 32)

	cipher, err := crypto.EncryptBytes(invalidCiphertext, key)
	assert.Nil(t, err)
	assert.NotEmpty(t, cipher)
	assert.NotEqual(t, invalidCiphertext, cipher)
}

func TestEncryptDecryptWithLongPlaintext(t *testing.T) {
	longPlaintext := "This is a very long plaintext that exceeds the typical length of a string used in encryption tests. " +
		"It is designed to test the encryption and decryption functions with larger data sizes, ensuring that they can handle " +
		"arbitrary lengths without issues or performance degradation."

	err := godotenv.Load("../.env")
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	key := os.Getenv("AES_KEY")
	require.Len(t, key, 32)

	cipher, err := crypto.EncryptBytes([]byte(longPlaintext), key)
	require.NoError(t, err)
	assert.NotEmpty(t, cipher)

	plain, err := crypto.DecryptBytes(cipher, key)
	require.NoError(t, err)
	assert.Equal(t, []byte(longPlaintext), plain)
}

func TestEncryptDecryptWithSpecialCharacters(t *testing.T) {
	specialChars := "!@#$%^&*()_+[]{}|;:',.<>?/~`"
	
	err := godotenv.Load("../.env")
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	key := os.Getenv("AES_KEY")
	require.Len(t, key, 32)

	cipher, err := crypto.EncryptBytes([]byte(specialChars), key)
	require.NoError(t, err)
	assert.NotEmpty(t, cipher)

	plain, err := crypto.DecryptBytes(cipher, key)
	require.NoError(t, err)
	assert.Equal(t, []byte(specialChars), plain)
}

func TestEncryptDecryptWithShortPlaintext(t *testing.T) {
	shortPlaintext := "A"

	err := godotenv.Load("../.env")
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	key := os.Getenv("AES_KEY")
	require.Len(t, key, 32)

	cipher, err := crypto.EncryptBytes([]byte(shortPlaintext), key)
	require.NoError(t, err)
	assert.NotEmpty(t, cipher)

	plain, err := crypto.DecryptBytes(cipher, key)
	require.NoError(t, err)
	assert.Equal(t, []byte(shortPlaintext), plain)
}

func TestEncryptDecryptWithEmptyCiphertext(t *testing.T) {
	emptyCiphertext := []byte{}

	err := godotenv.Load("../.env")
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	key := os.Getenv("AES_KEY")
	require.Len(t, key, 32)

	plain, err := crypto.DecryptBytes(emptyCiphertext, key)
	require.Error(t, err)
	assert.Empty(t, plain)

	cipher, err := crypto.EncryptBytes(emptyCiphertext, key)
	require.NoError(t, err)
	assert.NotEmpty(t, cipher)
	assert.NotEqual(t, emptyCiphertext, cipher)
}

func TestEncryptDecryptWithWrongKey(t* testing.T){
	err := godotenv.Load("../.env")
    if err != nil {
        log.Fatal("Error loading .env file")
    }

	key := "WrongKey"

	plaintext := "Hello world"
	cipher, err := crypto.EncryptBytes([]byte(plaintext), key)
	require.Error(t, err)
	assert.Empty(t, cipher)

	plain, err := crypto.DecryptBytes(cipher, key)
	require.Error(t, err)
	assert.NotEqual(t, []byte(plaintext), plain)
}

