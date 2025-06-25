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

**Endpoint**: `POST http://localhost:5000/api/files/addAccesslog`
**Authentication**: Not required

#### Request Body
```json
{
  "file_id": "1e064cfa-3fa9-4476-9338-4b37533f3faa",
  "user_id": "11111111-1111-1111-1111-111111111111",
  "action": "viewed", // or "downloaded", "deleted", etc.
  "message": "User <email> has <action> the files <file_name>"
}
```

#### Response
- **201 Created**
```json
{"message":"Access log added successfully"}
```

---

### Get Access Logs

**Endpoint**: `GET http://localhost:5000/files/getAccesslog`
**Authentication**: Not required

#### Example
`GET http://localhost:5000/files/getAccesslog`

**Request Body:**
```json
{
  "file_id": "1e064cfa-3fa9-4476-9338-4b37533f3faa"
}
```

#### Response
```json
[
  {
    "id": "cbe648ba-60d2-4b31-b9d5-00e927898d3d",
    "file_id": "1e064cfa-3fa9-4476-9338-4b37533f3faa",
    "user_id": "11111111-1111-1111-1111-111111111111",
    "action": "deleted",
    "message": "User <email> has <action> the files <file_name>",
    "timestamp": "2025-06-24T17:28:41.316972Z"
  },
  {
    "id": "f3c91f76-591b-4360-9c10-f7e054e53d43",
    "file_id": "1e064cfa-3fa9-4476-9338-4b37533f3faa",
    "user_id": "11111111-1111-1111-1111-111111111111",
    "action": "downloaded",
    "message": "User <email> has <action> the files <file_name>",
    "timestamp": "2025-06-24T17:25:54.885033Z"
  },
  {
    "id": "63ae03ec-9524-43ac-9cf1-6774043e35c8",
    "file_id": "1e064cfa-3fa9-4476-9338-4b37533f3faa",
    "user_id": "11111111-1111-1111-1111-111111111111",
    "action": "downloaded",
    "message": "User <email> has <action> the files <file_name>",
    "timestamp": "2025-06-24T17:25:53.774007Z"
  },
  {
    "id": "8c1a3f7f-1cfe-4efb-97ce-da2f900eda46",
    "file_id": "1e064cfa-3fa9-4476-9338-4b37533f3faa",
    "user_id": "11111111-1111-1111-1111-111111111111",
    "action": "downloaded",
    "message": "User <email> has <action> the files <file_name>",
    "timestamp": "2025-06-24T17:25:45.306758Z"
  },
  {
    "id": "9121154f-1a2a-47bd-85c9-223b286ecc10",
    "file_id": "1e064cfa-3fa9-4476-9338-4b37533f3faa",
    "user_id": "11111111-1111-1111-1111-111111111111",
    "action": "downloaded",
    "message": "User <email> has <action> the files <file_name>",
    "timestamp": "2025-06-24T17:24:47.039274Z"
  },
  {
    "id": "9adfceb8-c948-48e5-9d02-9a01ad6a16ec",
    "file_id": "1e064cfa-3fa9-4476-9338-4b37533f3faa",
    "user_id": "11111111-1111-1111-1111-111111111111",
    "action": "downloaded",
    "message": "User <email> has <action> the files <file_name>",
    "timestamp": "2025-06-24T17:23:43.257152Z"
  },
  {
    "id": "9d56a814-5539-4b0b-bc50-fa0bf7a20218",
    "file_id": "1e064cfa-3fa9-4476-9338-4b37533f3faa",
    "user_id": "11111111-1111-1111-1111-111111111111",
    "action": "viewed",
    "message": "User <email> has <action> the files <file_name>",
    "timestamp": "2025-06-24T17:16:45.917518Z"
  }
]
```
