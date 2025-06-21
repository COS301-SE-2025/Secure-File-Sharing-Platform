# API Documentation

## Table of Contents

* [User Registration](#user-registration)
* [User Login](#user-login)
* [Get User Profile](#get-user-profile)
* [Refresh Token](#refresh-token)
* [Delete User](#delete-user)
* [Logout](#logout)

---

## User Registration

**Endpoint**: `POST http://localhost:5000/api/users/register` \
**Authentication**: Not required

### Request Body

```json
{
  "username": "TestUser",
  "email": "testuser@gmail.com",
  "password": "Testing2025"
}
```

### Response

```json
{
  "success": true,
  "message": "User registered successfully.",
  "data": {
    "user": {
      "id": "67b0b467-f2e7-4346-8afe-1d4a0b0fc695",
      "username": "TestUser",
      "email": "testuser@gmail.com"
    },
    "token": "Bearer <JWT_TOKEN>"
  }
}
```

---

## User Login

**Endpoint**: `POST http://localhost:5000/api/users/login` \
**Authentication**: Not required

### Request Body

```json
{
  "email": "testuser@gmail.com",
  "password": "Testing2025"
}
```

### Response

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "67b0b467-f2e7-4346-8afe-1d4a0b0fc695",
      "username": "TestUser",
      "email": "testuser@gmail.com"
    },
    "token": "Bearer <JWT_TOKEN>"
  }
}
```

---

## Get User Profile

**Endpoint**: `GET http://localhost:5000/api/users/profile` \
**Authentication**: Required
**Header**:

```
Authorization: Bearer <JWT_TOKEN>
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "67b0b467-f2e7-4346-8afe-1d4a0b0fc695",
    "username": "TestUser",
    "email": "testuser@gmail.com"
  }
}
```

---

## Refresh Token

**Endpoint**: `POST http://localhost:5000/api/users/token_refresh` \
**Authentication**: Required
**Header**:

```
Authorization: Bearer <JWT_TOKEN>
```

### Request Body

```json
{
  "email": "testuser@gmail.com"
}
```

### Response

```json
{
  "success": true,
  "message": "Token refreshed successfully.",
  "token": "Bearer <NEW_JWT_TOKEN>"
}
```

---

## Delete User

**Endpoint**: `DELETE http://localhost:5000/api/users/profile` \
**Authentication**: Required
**Header**:

```
Authorization: Bearer <JWT_TOKEN>
```

### Request Body

```json
{
  "email": "testuser@gmail.com"
}
```

### Response

```json
{
  "success": true,
  "message": "User profile deleted successfully."
}
```

---

## Logout

**Endpoint**: `POST http://localhost:5000/api/users/logout` \
**Authentication**: Required
**Header**:

```
Authorization: Bearer <JWT_TOKEN>
```

### Response (Success)

```json
{
  "success": true,
  "message": "Logout successful."
}
```

### Response (Missing or Invalid Token)

```json
{
  "success": false,
  "message": "Authorization token missing or invalid."
}
```

### Response (Invalid or Expired Token)

```json
{
  "success": false,
  "message": "Invalid or expired token."
}
```

### Response (Server Error)

```json
{
  "success": false,
  "message": "Internal server error."
}
```

## Update User Profile

**Endpoint**: `PUT http://localhost:5000/api/users/profile`

**Authentication**: Required

**Header**:

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Request Body

```json
{
  "username": "NewUsername",
}
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "67b0b467-f2e7-4346-8afe-1d4a0b0fc695",
    "username": "NewUsername",
    "email": "testuser@gmail.com"
  }
}
```