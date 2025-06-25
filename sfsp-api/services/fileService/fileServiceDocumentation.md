Here is your **updated and consolidated File Services Documentation**, incorporating all the new endpoints, request/response formats, and metadata details you provided:

---

# File Services Documentation

## Table of Contents

* [Download Document](#download-document)
* [Upload Document](#upload-document)
* [Get All File Metadata for User](#get-all-file-metadata-for-user)
* [Get Specific File Metadata](#get-specific-file-metadata)
* [Add File Tags](#add-file-tags)
* [Share File With Another User](#share-file-with-another-user)
* [File Access Logs](#file-access-logs)

---

## Download Document

**Endpoint**: `POST http://localhost:5000/files/download`
**Authentication**: Not required

### Request Body

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "fileId": "b334b3cc-d7fd-445f-9aeb-7f865f88896b"
}
```

### Response

```json
{
  "fileName": "Algorithmic trading.pdf",
  "fileContent": "c29tZSBlbmNvZGVkIGNvbnRlbnQ="
}
```

> **Note**: Client must decode base64 and decrypt the file using their private key before use.

---

## Upload Document

**Endpoint**: `POST http://localhost:5000/files/upload`
**Authentication**: Not required

### Request Body

```json
{
  "fileName": "Algorithmic trading.pdf",
  "fileType": "application/pdf",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "nonce": "random-nonce",
  "fileDescription": "This is a test file",
  "fileTags": ["Demo"],
  "path": "files",
  "fileContent": "qwifuhqoifbq3i4bfoiuweabfkljswerbivaebvqwK"
}
```

### Response

```json
{
  "fileId": "b334b3cc-d7fd-445f-9aeb-7f865f88896b",
  "message": "File uploaded and metadata stored"
}
```

---

## Get All File Metadata for User

**Endpoint**: `GET http://localhost:5000/file/metadata`
**Authentication**: Not Required

### Request

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Response

```json
[
  {
    "fileId": "b334b3cc-d7fd-445f-9aeb-7f865f88896b",
    "fileName": "Algorithmic trading.pdf",
    "fileType": "application/pdf",
    "fileDescription": "This is a test file",
    "fileTags": ["Demo"],
    "uploadDate": "2023-10-01T12:00:00Z"
  }
]
```

---

## Get Specific File Metadata

**Endpoint**: `POST http://localhost:5000/file/metadata/file`
**Authentication**: Not Required

### Request

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "fileId": "b334b3cc-d7fd-445f-9aeb-7f865f88896b"
}
```

### Response

```json
{
  "fileId": "b334b3cc-d7fd-445f-9aeb-7f865f88896b",
  "fileName": "Algorithmic trading.pdf",
  "fileType": "application/pdf",
  "fileDescription": "This is a test file",
  "fileTags": ["Demo"],
  "uploadDate": "2023-10-01T12:00:00Z"
}
```

---

## Add File Tags

**Endpoint**: `POST http://localhost:5000/files/addTags`
**Authentication**: Not Required

### Request

```json
{
  "fileId": "0a40aa68-46d8-464a-a9cd-58ec1b45ba46",
  "tags": ["urgent", "legal", "confidential"]
}
```

### Response

```json
{
  "message": "Tags added successfully"
}
```

---

## Share File With Another User

**Endpoint**: `POST http://localhost:5000/files/share`
**Authentication**: Not Required

### Request

```json
{
  "senderId": "b4d6c1e9-1a9a-4e28-bc5d-2c3fa2cfe59a",
  "recipientId": "e3c29cb2-47d2-4d75-a88b-fdc920144f0e",
  "fileId": "7f98cc80-34c2-42b3-9f58-f6c7a385a244",
  "metadata": {
    "fileName": "contract.pdf",
    "EK_public": "iwubfq3bhfrqwuobfvoqwrbf",
    "Ik_public": "efbqwurbfou3wrbfwkur",
    "Encrypted_file_key": "liuefboqiuwbrqreoicbqlr",
    "description": "Shared NDA document",
    "tags": ["legal", "confidential"]
  }
}
```

> `accepted` is `false` by default. The recipient must exist in the `users` table, and ownership must be verified before insert.

### Response

```json
{
  "message": "File shared with recipient"
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
  "action": "viewed"
}
```

#### Response

```json
Access log added successfully
```

---

### Get Access Logs

**Endpoint**: `GET http://localhost:5000/files/getAccesslog`
**Authentication**: Not required

#### Query Parameters

* `file_id` (optional): Filter by file

#### Example

```
GET http://localhost:5000/files/getAccesslog?file_id=<file-uuid>
```

#### Response

```json
[
  {
    "id": "<log-uuid>",
    "file_id": "<file-uuid>",
    "user_id": "<user-uuid>",
    "action": "viewed",
    "timestamp": "2025-06-23T12:00:00Z"
  }
]
```

---

### Remove Access Log

**Endpoint**: `DELETE http://localhost:5000/files/removeAccesslog?id=<log-uuid>`
**Authentication**: Not required

#### Response

```json
Access log removed successfully
```

---

## Delete file

**Endpoint**: `POST http://localhost:5000/files/deleteFile`
**Authentication**: Not required

#### Request Body

```json
{
  "file_id": "<file-uuid>",
}
```

#### Response

```json
Access log added successfully
```

---
