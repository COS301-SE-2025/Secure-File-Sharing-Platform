# API Documentation

## Table of Contents

* [User Registration](#user-registration)
* [User Login](#user-login)
* [Get User Profile](#get-user-profile)
* [Refresh Token](#refresh-token)
* [Delete User](#delete-user)

---

## dowload document

**Endpoint**: `POST http://localhost:5000/files/download`
**Authentication**: Not required

### Header
Content-Type: application/json

### Request Body

```json
{
  "path": "files/demo",
  "filename": "test.pdf"
}
```

### Response

```json
{
  "fileName": "example.pdf",
  "fileContent": "U29tZSBlbmNyeXB0ZWQgZGF0YQ=="
}
```

client needs to decode bas64, decrypt the file using the private key, then they can view or download or whatever as they will have the actual file

---

## Upload document

**Endpoint**: `POST http://localhost:5000/files/upload`
**Authentication**: Not required

### Request Body

```json
{
  "fileName": "Trig-for-Computer-Graphics2.pdf",
  "fileType": "application/pdf",
  "userId": "123",
  "encryptionKey": "public key",
  "fileDescription": "Demo PDF for testing",
  "fileTags": ["test", "demo"],
  "path": "files/demo",
  "fileContent": "VGhpcyBpcyBhIHRlc3QgZmlsZSBjb250ZW50Lg=="  // base64 of: "This is a test file content."
}
```

### Response

```json
{
    "message": " File uploaded",
    "server": "File uploaded and metadata stored"
}
```

---

## Get Meta data to display

**Endpoint**: `GET http://localhost:5000/file/metadata`
**Authentication**: Not Required

### Request

```json
{
	"userId": "123"
}
```

### Response

```json
{
    "FileName": "Trig-for-Computer-Graphics.pdf",
    "FileSize": 1312720,
    "FileType": "application/pdf",
    "UserID": "123",
    "EncryptionKey": "mysecretkey",
    "UploadTimestamp": "2025-05-25T20:51:24.239Z",
    "Description": "Sample test file",
    "Tags": [
        "demo",
        "test",
        "go"
    ],
    "Path": "files/demo"
}
```