# API Documentation (NRA-13)

Project: Notes REST API  
Base URL: /api/  
Format: JSON  
Authentication: JWT Bearer token (or SessionAuth for web UI)

---

## 1) Authentication overview

JWT usage:
Send token in header:

    Authorization: Bearer <access_token>

Token types:
- access - used for API requests
- refresh - used to obtain new access token

Important:
- After registration user is created with `is_active=false`
- Email confirmation is required before login/JWT

---

## 2) Endpoints

### 2.1 OpenAPI
**GET /schema/** - OpenAPI schema  
**GET /docs/** - Swagger UI

---

### 2.2 Registration

**POST /auth/register/**

Creates a new user account.

Request:

    {
      "username": "ruslan",
      "email": "ruslan@example.com",
      "password": "StrongPassword123",
      "password_confirm": "StrongPassword123"
    }

Response 201:

    {
      "id": 1,
      "username": "ruslan",
      "email": "ruslan@example.com",
      "detail": "User created. Confirmation code sent to email (stub)."
    }

Notes:
- Confirmation code is written to `src/send_email/*.txt` (stub).
- User is inactive until confirmation.

---

### 2.3 Email confirmation

**POST /auth/email/confirm/**

Request:

    {
      "email": "ruslan@example.com",
      "code": "123456"
    }

Response 200:

    { "detail": "Email confirmed." }

Errors:
- 400 invalid/expired code or user not found

---

**POST /auth/email/resend/**

Resends confirmation code (stub).

Request:

    {
      "email": "ruslan@example.com",
      "code": "000000"
    }

Note:
- `code` is required by serializer format (6 digits), although it is not used by the server logic.

Response 200:

    { "detail": "Code resent." }

---

### 2.4 JWT

**POST /auth/jwt/create/**

Request:

    {
      "username": "ruslan",
      "password": "StrongPassword123"
    }

Response 200:

    {
      "access": "<jwt_access>",
      "refresh": "<jwt_refresh>"
    }

Errors:
- 401 Invalid credentials / inactive user

---

**POST /auth/jwt/refresh/**

Request:

    { "refresh": "<jwt_refresh>" }

Response 200:

    { "access": "<new_jwt_access>" }

---

**POST /auth/jwt/verify/**

Request:

    { "token": "<jwt_access>" }

Response 200:

    { "detail": "Token is valid" }

---

### 2.5 Profile

**GET /auth/profile/** (auth required)

Response 200:

    {
      "id": 1,
      "username": "ruslan",
      "email": "ruslan@example.com",
      "is_active": true
    }

**PATCH /auth/profile/** (auth required)

Request example:

    { "username": "new_name" }

**PATCH /auth/profile/** password example:

    { "password": "NewStrongPass123" }

**DELETE /auth/profile/** deletes current user and logs out.

---

### 2.6 Notes (CRUD)

**Note object**

    {
      "id": 1,
      "title": "My note",
      "content": "text...",
      "is_pinned": false,
      "created_at": "2025-12-22T10:00:00Z",
      "updated_at": "2025-12-22T10:10:00Z"
    }

Rules:
- Authentication required for all notes endpoints
- User can access only their own notes

---

**GET /notes/**

Query parameters:
- page, page_size
- ordering: created_at, updated_at, title, is_pinned (with optional `-`)
- search: searches in title and content

Response 200:

    {
      "count": 1,
      "next": null,
      "previous": null,
      "results": [ ... ]
    }

---

**POST /notes/**

Request:

    {
      "title": "Shopping list",
      "content": "Milk, eggs",
      "is_pinned": false
    }

Response 201: note object.

---

**GET /notes/{id}/** - retrieve (only owner)  
**PATCH /notes/{id}/** - partial update  
**PUT /notes/{id}/** - full update  
**DELETE /notes/{id}/** - 204

---

## 3) Error format

Validation error (400):

    { "title": ["This field is required."] }

Unauthorized (401):

    { "detail": "Authentication credentials were not provided." }

Not found (404):

    { "detail": "Not found." }
