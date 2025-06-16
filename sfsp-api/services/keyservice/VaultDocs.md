# Vault Key Management API

Securely store, retrieve, and delete encrypted private keys using a Vault-backed Flask API.

---

## Table of Contents

* [Health Check](#health-check)
* [Store Private Key](#store-private-key)
* [Retrieve Private Key](#retrieve-private-key)
* [Delete Private Key](#delete-private-key)

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

## Store Private Key

**Endpoint:** `POST http://localhost:8080/store-key`
**Content-Type:** `application/json`
**Authentication:** Not required

### Request Body

```json
{
  "encrypted_id": "a1b2c3d4e5f6g7h8",
  "encrypted_private_key": "VGhpcyBpcyBhIHNhbXBsZSBwcml2YXRlIGtleSBzdHJpbmc="
}
```

### Response

```json
{
  "message": "Private key stored successfully",
  "id": "a1b2c3d4..."
}
```

---

## Retrieve Private Key

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
  "encrypted_private_key": "VGhpcyBpcyBhIHNhbXBsZSBwcml2YXRlIGtleSBzdHJpbmc=",
  "id": "a1b2c3d4..."
}
```

---

## Delete Private Key

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
  "message": "Private key deleted successfully",
  "id": "a1b2c3d4..."
}
```

---

## Error Responses

| HTTP Code | Message                                 |
| --------- | --------------------------------------- |
| 400       | Missing or invalid input data           |
| 404       | Private key not found                   |
| 405       | Method not allowed                      |
| 500       | Internal server error / Vault not ready |

