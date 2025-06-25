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
  "fileName": "Trig-for-Computer-Graphics2.pdf",
  "fileType": "application/pdf",
  "userId": "123",
  "encryptionKey": "public key",
  "fileDescription": "Demo PDF for testing",
  "fileTags": ["test", "demo"],
  "path": "files/demo",
  "fileContent": "VGhpcyBpcyBhIHRlc3QgZmlsZSBjb250ZW50Lg=="
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

## 3. Get Metadata

* **Endpoint**: `GET http://localhost:5000/file/metadata`
* **Method**: `GET`
* **Authentication**: Not Required
* **Headers**:

  * `Content-Type: application/json`

### Request Body

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
  "Tags": ["demo", "test", "go"],
  "Path": "files/demo"
}
```

---

## 4. File Access Logs

### a. Add Access Log

* **Endpoint**: `POST http://localhost:5000/api/files/addAccesslog`
* **Method**: `POST`
* **Authentication**: Not Required
* **Headers**:

  * `Content-Type: application/json`

#### Request Body

```json
{
  "file_id": "1e064cfa-3fa9-4476-9338-4b37533f3faa",
  "user_id": "11111111-1111-1111-1111-111111111111",
  "action": "viewed",
  "message": "User <email> has <action> the files <file_name>"
}
```

#### Response `201 Created`

```json
{
  "message": "Access log added successfully"
}
```

---

### b. Get Access Logs

* **Endpoint**: `GET http://localhost:5000/files/getAccesslog`
* **Method**: `GET`
* **Authentication**: Not Required
* **Headers**:

  * `Content-Type: application/json`

#### Request Body

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
    "file_id": "...",
    "user_id": "...",
    "action": "deleted",
    "message": "User <email> has <action> the files <file_name>",
    "timestamp": "2025-06-24T17:28:41.316972Z"
  },
  ...
]
```

---

## 5. Notifications

### a. Get Notifications

* **Endpoint**: `POST http://localhost:5000/api/notifications/get`
* **Method**: `POST`
* **Authentication**: Not Required
* **Headers**:

  * `Content-Type: application/json`

#### Request Body

```json
{
  "userId": "06f2660c-faed-4396-80f3-a687e94e1987"
}
```

#### Response

```json
{
  "notifications": [
    {
      "id": "dfe388a7-8aa9-49ef-a0a9-871dcefce8c5",
      "type": "file_share",
      "from": "...",
      "to": "...",
      "file_name": "resume.pdf",
      "file_id": "...",
      "message": "Please review my resume",
      "timestamp": "2025-06-25T11:56:21.091249Z",
      "status": "pending",
      "read": false
    }
  ],
  "success": true
}
```

---

### b. Mark Notification as Read

* **Endpoint**: `POST http://localhost:5000/api/notifications/markAsRead`
* **Method**: `POST`
* **Authentication**: Not Required

#### Request Body

```json
{
  "id": "dfe388a7-8aa9-49ef-a0a9-871dcefce8c5"
}
```

#### Response

```json
{
  "message": "Notification marked as read",
  "success": true
}
```

---

### c. Respond to Notification

* **Endpoint**: `POST http://localhost:5000/api/notifications/respond`
* **Method**: `POST`
* **Authentication**: Not Required

#### Request Body

```json
{
  "id": "dfe388a7-8aa9-49ef-a0a9-871dcefce8c5",
  "status": "declined"
}
```

#### Response

```json
{
  "message": "Notification status updated",
  "success": true
}
```

---

### d. Clear Notification

* **Endpoint**: `POST http://localhost:5000/api/notifications/clear`
* **Method**: `POST`
* **Authentication**: Not Required

#### Request Body

```json
{
  "id": "46988b24-e8dd-4b6f-bfff-8f1b8f382f56"
}
```

#### Response

```json
{
  "message": "Notification deleted",
  "success": true
}
```

---

### e. Add Notification

* **Endpoint**: `POST http://localhost:5000/api/notifications/add`
* **Method**: `POST`
* **Authentication**: Not Required

#### Request Body

```json
{
  "type": "file request",
  "fromEmail": "tmakhene21@gmail.com",
  "toEmail": "Goon@gmail.com",
  "file_name": "design.png",
  "file_id": "2dd40203-3db5-4fd7-97f6-c3a7b2b9c631",
  "message": "Can I get a copy of your logo design?"
}
```

#### Response

```json
{
  "id": "2c27e743-0b55-476c-8e10-07e9c39cf066",
  "message": "Notification added",
  "success": true
}
```

