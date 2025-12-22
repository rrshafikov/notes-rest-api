# API Endpoints (NRA-11)

Base: /api/
Format: JSON
Auth: JWT (Bearer <token>)

## Health
GET /api/health/ -> 200 {"status":"ok"}

## Auth
POST /api/auth/register/
POST /api/auth/jwt/create/
POST /api/auth/jwt/refresh/
POST /api/auth/jwt/verify/

## Users
GET /api/users/me/ (auth required)

## Notes (auth required, only owner)
GET    /api/notes/        (list, pagination, ordering, search)
POST   /api/notes/        (create)
GET    /api/notes/{id}/   (retrieve)
PATCH  /api/notes/{id}/   (partial update)
PUT    /api/notes/{id}/   (full update)
DELETE /api/notes/{id}/   (delete -> 204)

## OpenAPI (planned)
GET /api/schema/
GET /api/docs/
