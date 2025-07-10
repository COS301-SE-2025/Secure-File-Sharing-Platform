# File Services Documentation

## Table of Contents

1. [Download Document](#1-download-document)
2. [Upload Document](#2-upload-document)
3. [View Document](#3-view-document)
4. [Get File Preview](#4-get-file-preview)
5. [Get Metadata](#5-get-metadata)
6. [File Access Logs](#6-file-access-logs)
7. [Notifications](#7-notifications)

---

## Table of Contents

* [Download Document](#download-document)
* [Upload Document](#upload-document)
* [View Document](#view-document)
* [Get File Preview](#get-file-preview)
* [Get All File Metadata for User](#get-all-file-metadata-for-user)
* [Get Specific File Metadata](#get-specific-file-metadata)
* [Add File Tags](#add-file-tags)
* [Share File With Another User](#share-file-with-another-user)
* [File Access Logs](#file-access-logs)

---

## Download Document
=========
# File Services API Documentation

## Table of Contents

1. [Download Document](#1-download-document)
2. [Upload Document](#2-upload-document)
3. [Get Metadata](#3-get-metadata)
4. [File Access Logs](#4-file-access-logs)
5. [Notifications](#5-notifications)

---

## 1. Download Document

* **Endpoint**: `POST http://localhost:5000/files/download`
* **Method**: `POST`
* **Authentication**: Not Required
* **Headers**:

  * `Content-Type: application/json`
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

> Note: The client must **Base64 decode** and **decrypt** the content using their private key to access the actual file.

---

## 2. Upload Document

* **Endpoint**: `POST http://localhost:5000/files/upload`
* **Method**: `POST`
* **Authentication**: Not Required
* **Headers**:

  * `Content-Type: application/json`

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

## 5. Get Metadata

  * `Content-Type: application/json`

### Request Body

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
  "FileName": "Trig-for-Computer-Graphics.pdf",
  "FileSize": 1312720,
  "FileType": "application/pdf",
  "UserID": "123",
  "EncryptionKey": "mysecretkey",
  "UploadTimestamp": "2025-05-25T20:51:24.239Z",
  "Description": "Sample test file",
  "Tags": ["demo", "test", "go"],
  "Path": "files/demo"
}
```

---

## 3. View Document

* **Endpoint**: `POST http://localhost:5000/files/view`
* **Method**: `POST`
* **Authentication**: Not Required
* **Headers**:

  * `Content-Type: application/json`

### Request Body

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "fileName": "Algorithmic trading.pdf"
}
```

### Response

```json
{
  "fileName": "Algorithmic trading.pdf",
  "fileContent": "<base64-encoded-encrypted-content>",
  "fileType": "application/pdf",
  "preview": true,
  "nonce": "<base64-encoded-nonce>"
}
```

---

## 4. Get File Preview

* **Endpoint**: `POST http://localhost:5000/files/preview`
* **Method**: `POST`
* **Authentication**: Not Required
* **Headers**:

  * `Content-Type: application/json`

### Request Body

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "fileName": "Algorithmic trading.pdf"
}
```

### Response

```json
{
  "preview": "<base64-encoded-encrypted-preview>",
  "fileType": "application/pdf",
  "nonce": "<base64-encoded-nonce>"
}
```

---

