package mongo

import (
    "context"
    "log"
    "time"

    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
)

func InitMongo(uri string) *mongo.Client {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    clientOpts := options.Client().ApplyURI(uri)
    client, err := mongo.Connect(ctx, clientOpts)
    if err != nil {
        log.Fatal("❌ MongoDB connect error:", err)
    }

    if err := client.Ping(ctx, nil); err != nil {
        log.Fatal("❌ MongoDB ping error:", err)
    }

    log.Println("✅ MongoDB connected")
    return client
}
