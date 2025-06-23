# File Services Documentation

## Table of Contents

* [download document](#download-document)
* [Upload document](#Upload-Document)
* [Get Meta data to display](#Get-Meta-Data-to-display)
* [File Access Logs](#File-Access-Logs)

---

## download document

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

---

## File Access Logs

### Add Access Log

**Endpoint**: `POST http://localhost:5000/files/addAccesslog`
**Authentication**: Not required

#### Request Body
```json
{
  "file_id": "<file-uuid>",
  "user_id": "<user-uuid>",
  "action": "viewed" // or "downloaded", "deleted", etc.
}
```

#### Response
- **201 Created**
```
Access log added successfully
```

---

### Get Access Logs

**Endpoint**: `GET http://localhost:5000/files/getAccesslog`
**Authentication**: Not required

#### Query Parameters
- `file_id` (optional): Filter logs for a specific file

#### Example
`GET http://localhost:5000/files/getAccesslog?file_id=<file-uuid>`

#### Response
```json
[
  {
    "id": "<log-uuid>",
    "file_id": "<file-uuid>",
    "user_id": "<user-uuid>",
    "action": "viewed",
    "timestamp": "2025-06-23T12:00:00Z"
  },
  // ...more logs
]
```

---

### Remove Access Log

**Endpoint**: `DELETE http://localhost:5000/files/removeAccesslog?id=<log-uuid>`
**Authentication**: Not required

#### Response
```
Access log removed successfully
```