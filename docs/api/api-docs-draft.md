# API Documentation Draft (NRA-13)

Project: Notes REST API  
Base URL: /api/  
Format: JSON  
Authentication: JWT Bearer token

---

## 1) Authentication overview

JWT usage:  
Client sends token in HTTP header:

    Authorization: Bearer <access_token>

Token types:
- access token — short-lived, used for API requests
- refresh token — used to obtain new access token

---

## 2) Endpoints

### 2.1 Health

**GET /health/**

Checks that service is alive.

Response 200:

    { "status": "ok" }

---

### 2.2 Authentication

**POST /auth/register/**

Creates a new user account.

Request:

    {
      "username": "ruslan",
      "email": "ruslan@example.com",
      "password": "StrongPassword123"
    }

Response 201:

    {
      "id": 1,
      "username": "ruslan",
      "email": "ruslan@example.com"
    }

Errors:
- 400 Validation error

---

**POST /auth/jwt/create/**

Obtain JWT access and refresh tokens.

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
- 401 Invalid credentials

---

**POST /auth/jwt/refresh/**

Refresh access token.

Request:

    {
      "refresh": "<jwt_refresh>"
    }

Response 200:

    {
      "access": "<new_jwt_access>"
    }

Errors:
- 401 Invalid or expired refresh token

---

**POST /auth/jwt/verify/**

Verify access token.

Request:

    {
      "token": "<jwt_access>"
    }

Response 200:

    {
      "detail": "Token is valid"
    }

Errors:
- 401 Invalid token

---

### 2.3 User

**GET /users/me/**

Returns current authenticated user.  
Authentication required.

Response 200:

    {
      "id": 1,
      "username": "ruslan",
      "email": "ruslan@example.com"
    }

Errors:
- 401 Unauthorized

---

### 2.4 Notes (CRUD)

**Note object structure**

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
- User can access only their own notes (owner-based access)

---

**GET /notes/**

List notes of current user.

Query parameters:
- page (integer)
- page_size (integer, optional)
- ordering (created_at, -created_at, title, -title)
- search (searches in title and content)

Response 200:

    {
      "count": 1,
      "next": null,
      "previous": null,
      "results": [
        {
          "id": 1,
          "title": "My note",
          "content": "text...",
          "is_pinned": false,
          "created_at": "2025-12-22T10:00:00Z",
          "updated_at": "2025-12-22T10:10:00Z"
        }
      ]
    }

Errors:
- 401 Unauthorized

---

**POST /notes/**

Create a new note.

Request:

    {
      "title": "Shopping list",
      "content": "Milk, eggs",
      "is_pinned": false
    }

Response 201:

    {
      "id": 2,
      "title": "Shopping list",
      "content": "Milk, eggs",
      "is_pinned": false,
      "created_at": "2025-12-22T10:00:00Z",
      "updated_at": "2025-12-22T10:00:00Z"
    }

Errors:
- 400 Validation error
- 401 Unauthorized

---

**GET /notes/{id}/**

Retrieve note by id (only owner).

Response 200:
- Note object

Errors:
- 401 Unauthorized
- 404 Not found

---

**PATCH /notes/{id}/**

Partial update of note.

Request example:

    {
      "title": "Updated title"
    }

Response 200:
- Updated note object

Errors:
- 400 Validation error
- 401 Unauthorized
- 404 Not found

---

**PUT /notes/{id}/**

Full update of note.

Request:

    {
      "title": "Shopping list",
      "content": "Milk, eggs, bread",
      "is_pinned": true
    }

Response 200:
- Updated note object

Errors:
- 400 Validation error
- 401 Unauthorized
- 404 Not found

---

**DELETE /notes/{id}/**

Delete note.

Response:
- 204 No Content

Errors:
- 401 Unauthorized
- 404 Not found

---

## 3) Error format (draft)

Validation error (400):

    {
      "title": ["This field is required."]
    }

Unauthorized (401):

    {
      "detail": "Authentication credentials were not provided."
    }

Not found (404):

    {
      "detail": "Not found."
    }

---

## 4) Next steps

- Implement backend with Django REST Framework (NRA-14 to NRA-21)
- Add Swagger / OpenAPI documentation (NRA-21)
- Add automated tests and CI pipeline (NRA-22 to NRA-31)
