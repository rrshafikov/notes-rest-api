# Data Models: User + Note (NRA-12)

Goal: define data model for REST API “Notes + Users”.
Implementation planned in Django + DRF.

---

## 1) User model

We use Django built-in User model (django.contrib.auth).
Reason:
- standard authentication, password hashing, admin support
- fast implementation for tight deadlines
- compatible with JWT/session auth

User fields used by API:
- id (PK)
- username (unique)
- email (optional/unique depending on settings)
- password (hashed, handled by Django)
- is_active, date_joined (default Django)

API behavior:
- registration creates a user
- authentication uses username + password

---

## 2) Note model (main entity)

Entity: Note
Owner-based access: each note belongs to exactly one user (owner).
Only owner can read/update/delete the note.

### Fields (draft)
- id: integer, PK
- owner: FK -> User (required)
- title: string, required, max_length=255
- content: text, optional (blank allowed)
- is_pinned: boolean, default false
- created_at: datetime, auto set on create
- updated_at: datetime, auto set on update

### Constraints
- owner is required
- title is required
- (optional) unique per user not required (user may have two notes with same title)

### Indexes (recommended)
- index on (owner, created_at) for fast list endpoints
- index on (owner, title) optional for ordering/search

### Ordering
Default ordering: -created_at (newest first)

---

## 3) Relations (ERD)

User 1 --- N Note
- One User can have many Notes
- Each Note belongs to one User

---

## 4) Planned API mapping

User:
- POST /api/auth/register/
- GET /api/users/me/

Note:
- GET/POST /api/notes/
- GET/PATCH/PUT/DELETE /api/notes/{id}/

---

## 5) Mermaid diagram (for docs)

```mermaid
erDiagram
    USER ||--o{ NOTE : owns

    USER {
        int id PK
        string username "unique"
        string email
    }

    NOTE {
        int id PK
        int owner_id FK
        string title
        text content
        boolean is_pinned
        datetime created_at
        datetime updated_at
    }
