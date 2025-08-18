// // mongo/client_test.go
package unitTests

// import (
// 	"log"
// 	"os"
// 	"testing"

// 	"github.com/COS301-SE-2025/Secure-File-Sharing-Platform/sfsp-api/services/fileService/database"
// 	"github.com/joho/godotenv"
// 	"github.com/stretchr/testify/assert"
// )

// func TestInitMongo_Success(t *testing.T) {
// 	err := godotenv.Load("../.env")
// 	if err != nil {
// 		log.Println("Warning: .env file not found, fallback to environment variables")
// 	}

// 	uri := os.Getenv("MONGO_URI")
// 	if uri == "" {
// 		t.Fatal("MONGO_URI is not set in environment")
// 	}

// 	client, err := database.InitMongo(uri)
// 	assert.NoError(t, err)
// 	assert.NotNil(t, client)
// }

// func TestInitMongo_Fail(t *testing.T) {
// 	client, err := database.InitMongo("mongodb://invalid:27017")
// 	assert.Error(t, err)
// 	assert.Nil(t, client)
// }
