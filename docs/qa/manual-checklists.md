# Manual Testing Checklists (NRA-25)

**Project:** Notes REST API  
**Type:** Manual QA  
**Author:** Georgiy Gorin (QA Engineer)

### 1) Health endpoint

- GET /api/health/ returns status 200
- Response body contains {"status": "ok"}
- Endpoint is accessible without authentication

### 2) User Registration

- Register new user with valid username, email and password
- Response status is 201 Created
- Password is not returned in response
- Registration with existing username returns 400
- Registration with weak/empty password returns 400

**Endpoint:** POST /api/auth/register/

### 3) JWT Authentication

### Token creation
- Valid credentials return access and refresh tokens
- Invalid credentials return 401 Unauthorized
- Access token is a non-empty string

**Endpoint:** POST /api/auth/jwt/create/

### Token refresh
- Valid refresh token returns new access token
- Invalid or expired refresh token returns 401

**Endpoint:** POST /api/auth/jwt/refresh/

### 4) Access control (Authorization)

- Accessing protected endpoints without token returns 401
- Accessing protected endpoints with valid token returns 200
- Token is passed via Authorization: Bearer <token> header

### 5) Notes - Create

- Authenticated user can create a note
- Response status is 201 Created
- Created note contains correct title and content
- Owner field is assigned automatically
- Creating note without title returns 400

**Endpoint:** POST /api/notes/

### 6) Notes - Read (List & Retrieve)

### List
- Authenticated user can list own notes
- Notes of other users are not visible
- Response contains pagination fields (count, results)
- Default ordering is by newest first

**Endpoint:** GET /api/notes/

### Retrieve
- User can retrieve own note by id
- Retrieving non-existing note returns 404
- Retrieving another user's note returns 404

**Endpoint:** GET /api/notes/{id}/

### 7) Notes - Update

### Partial update (PATCH)
- User can update title or content of own note
- Response status is 200 OK
- Updated fields are saved
- Updating another user's note returns 404

**Endpoint:** PATCH /api/notes/{id}/

### Full update (PUT)
- User can fully update own note
- Response status is 200 OK
- Updating another user's note returns 404

**Endpoint:** PUT /api/notes/{id}/

### 8) Notes - Delete

- User can delete own note
- Response status is 204 No Content
- Deleted note is no longer accessible
- Deleting another user's note returns 404

**Endpoint:** DELETE /api/notes/{id}/

### 9) Pagination, Ordering and Search

### Pagination
- page parameter returns correct page
- page_size parameter limits number of results

### Ordering
- ordering=created_at sorts notes by date
- ordering=-created_at sorts notes in reverse order
- ordering=title sorts notes alphabetically

### Search
- search parameter filters notes by title
- search parameter filters notes by content

**Endpoint:** GET /api/notes/

### 10) Negative scenarios

- Invalid JSON returns 400 Bad Request
- Unsupported HTTP method returns 405
- Invalid note id format returns 404
