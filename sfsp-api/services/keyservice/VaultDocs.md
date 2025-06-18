# Vault Key Management API

Securely store, retrieve, and delete encrypted key bundles using a Vault-backed Flask API.

---

## Table of Contents

* [Health Check](#health-check)
* [Store Key Bundle](#store-key-bundle)
* [Retrieve Key Bundle](#retrieve-key-bundle)
* [Delete Key Bundle](#delete-key-bundle)

---

## Health Check

**Endpoint:** `GET http://localhost:8080/health`
**Authentication:** Not required

### Response

```json
{
  "status": "healthy",
  "vault_status": "connected"
}
```

---

## Store Key Bundle

**Endpoint:** `POST http://localhost:8080/store-key`
**Content-Type:** `application/json`
**Authentication:** Not required

### Request Body

```json
{
  "encrypted_id": "a1b2c3d4e5f6g7h8",
  "ik_private_key": "Encrypted_AES_GCM_base64_blob_IK==",
  "spk_private_key": "Encrypted_AES_GCM_base64_blob_SPK==",
  "opks_private": [
    {
      "opk_id": "fdc9b884-91b5-4d4f-8ee6-8231d7ce79f2",
      "private_key": "Encrypted_AES_GCM_base64_blob_OPK1=="
    },
    {
      "opk_id": "ab95a2d9-77de-4c3f-bfe3-b59cc79b305d",
      "private_key": "Encrypted_AES_GCM_base64_blob_OPK2=="
    }
  ]
}
```

### Response

```json
{
  "message": "Key bundle stored successfully",
  "id": "a1b2c3d4..."
}
```

---

## Retrieve Key Bundle

**Endpoint:** `GET http://localhost:8080/retrieve-key`
**Content-Type:** `application/json`
**Authentication:** Not required

> **Note:** This endpoint expects a JSON body, which is non-standard for GET requests but currently required by the implementation.

### Request Body

```json
{
  "encrypted_id": "a1b2c3d4e5f6g7h8"
}
```

### Response

```json
{
  "ik_private_key": "Encrypted_AES_GCM_base64_blob_IK==",
  "spk_private_key": "Encrypted_AES_GCM_base64_blob_SPK==",
  "opks_private": [
    {
      "opk_id": "fdc9b884-91b5-4d4f-8ee6-8231d7ce79f2",
      "private_key": "Encrypted_AES_GCM_base64_blob_OPK1=="
    },
    {
      "opk_id": "ab95a2d9-77de-4c3f-bfe3-b59cc79b305d",
      "private_key": "Encrypted_AES_GCM_base64_blob_OPK2=="
    }
  ],
  "id": "a1b2c3d4..."
}
```

---

## Delete Key Bundle

**Endpoint:** `DELETE http://localhost:8080/delete-key`
**Content-Type:** `application/json`
**Authentication:** Not required

### Request Body

```json
{
  "encrypted_id": "a1b2c3d4e5f6g7h8"
}
```

### Response

```json
{
  "message": "Key bundle deleted successfully",
  "id": "a1b2c3d4..."
}
```

---

## Error Responses

| HTTP Code | Message                                 |
| --------- | --------------------------------------- |
| 400       | Missing or invalid input data           |
| 404       | Key bundle not found                    |
| 405       | Method not allowed                      |
| 500       | Internal server error / Vault not ready |

