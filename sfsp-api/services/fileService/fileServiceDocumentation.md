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

---

### Remove Access Log

**Endpoint**: `DELETE http://localhost:5000/files/removeAccesslog?id=<log-uuid>`
**Authentication**: Not required

#### Response

```json
Access log removed successfully
```

---

Let me know if you'd like this exported as a Markdown file or integrated into Swagger/OpenAPI format.

```
