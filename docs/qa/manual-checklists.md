# Manual Testing Checklists (NRA-25)

**Project:** Notes REST API  
**Type:** Manual QA  
**Author:** Georgiy Gorin (QA Engineer)  
**Updated:** актуализировано под текущий код

## 1) OpenAPI доступен
- GET /api/schema/ returns 200
- GET /api/docs/ opens Swagger UI page

## 2) User Registration (API)
**Endpoint:** POST /api/auth/register/

- Valid payload includes: username, email, password, password_confirm
- Response status is 201 Created
- Password is not returned in response
- User is created inactive (requires confirmation)
- Registration with existing email returns 400
- Weak/empty password returns 400
- Password mismatch returns 400

## 3) Email confirmation (API)
**Endpoint:** POST /api/auth/email/confirm/

- Confirm with correct email + code returns 200
- Invalid or expired code returns 400
- After confirmation user becomes active

**Resend:** POST /api/auth/email/resend/
- Requires email + 6-digit code field (format requirement)
- Returns 200 and creates new code (stub)

## 4) JWT Authentication
**Endpoint:** POST /api/auth/jwt/create/

- Valid credentials for active user return access and refresh tokens
- Invalid credentials return 401 Unauthorized
- Inactive user cannot obtain token (401)

Refresh:
- POST /api/auth/jwt/refresh/ returns new access token for valid refresh

## 5) Profile endpoint
**Endpoint:** /api/auth/profile/

- GET returns current user info (auth required)
- PATCH updates username and/or password
- DELETE deletes user and logs out

## 6) Access control (Authorization)
- Accessing protected endpoints without auth returns 401
- With valid JWT returns 200
- Token passed via Authorization: Bearer <token>

## 7) Notes - Create
**Endpoint:** POST /api/notes/

- Authenticated user can create a note
- Response status is 201 Created
- Created note contains correct title/content/is_pinned
- Title is required (without title -> 400)

## 8) Notes - Read (List & Retrieve)
**Endpoint:** GET /api/notes/

- User lists only own notes
- Response contains pagination fields: count, results
- Default ordering may be overridden by ordering param

Retrieve:
- GET /api/notes/{id}/ returns 200 for own note
- Non-existing returns 404
- Another user's note returns 404

## 9) Notes - Update
PATCH /api/notes/{id}/:
- Updates selected fields and returns 200
- Updating чужую заметку returns 404

PUT /api/notes/{id}/:
- Full update returns 200
- Updating чужую заметку returns 404

## 10) Notes - Delete
DELETE /api/notes/{id}/:
- Returns 204 No Content
- Deleted note no longer accessible (404)

## 11) Ordering and Search
GET /api/notes/:
- ordering supports: created_at, updated_at, title, is_pinned (with +/-)
- search filters by title and content

## 12) Negative scenarios
- Invalid JSON returns 400
- Unsupported HTTP method returns 405
- Invalid note id returns 404
