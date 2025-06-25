# File Services Documentation

## Table of Contents

* [download document](#download-document)
* [Upload document](#Upload-Document)
* [Get Meta data to display](#Get-Meta-Data-to-display)
* [File Access Logs](#File-Access-Logs)

---

## 1. Download Document

**Endpoint**: `POST http://localhost:5000/files/download`
**Authentication**: Not required

### Header
Content-Type: application/json

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

## Upload document

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

## 3. Get Metadata

* **Endpoint**: `GET http://localhost:5000/file/metadata`
* **Method**: `GET`
* **Authentication**: Not Required
* **Headers**:

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

