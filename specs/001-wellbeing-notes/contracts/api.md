# API Contracts: beingc

**Branch**: `001-wellbeing-notes` | **Date**: 2026-03-30

All endpoints are prefixed with `/api`. All requests except health-check require a valid Clerk session token in the `Authorization: Bearer <token>` header. The server returns `401` if the token is missing or invalid, and `403` if the user lacks the required role.

Response bodies are JSON. Error responses follow:
```json
{ "error": "<human-readable message>" }
```

---

## Authentication Note

The frontend obtains a token with:
```js
const token = await clerk.session.getToken()
```
and attaches it to every API call:
```js
fetch('/api/...', { headers: { 'Authorization': `Bearer ${token}` } })
```

---

## Health Check

### `GET /api/health`

No authentication required. Used by Sliplane's health check and local readiness probes.

**Response 200**:
```json
{ "status": "ok" }
```

---

## Notes Endpoints

All notes endpoints require a valid session. Each endpoint operates only on the authenticated user's own notes — never another user's.

---

### `GET /api/notes`

List notes for the authenticated user, in reverse-chronological order.

**Query parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | No | Full-text search term. If omitted, returns all notes. |
| `limit` | integer | No | Max results to return. Default: 50. |
| `offset` | integer | No | Pagination offset. Default: 0. |

**Response 200**:
```json
{
  "notes": [
    {
      "id": 42,
      "date": "2026-03-30",
      "score": 7,
      "preview": "First line of the note\nSecond line of the note",
      "updated_at": "2026-03-30T14:22:00Z"
    }
  ],
  "total": 1
}
```

`preview` contains the first two newline-separated lines of `body`, truncated server-side. The full `body` is not returned in list responses (bandwidth optimisation).

---

### `POST /api/notes`

Create a new note. The server sets `date` to today (UTC) and `user_id` from the session token; both are ignored if sent in the body.

**Request body**:
```json
{
  "score": 5,
  "body": ""
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `score` | integer | Yes | 0–10 inclusive |
| `body` | string | Yes | Any string, including empty |

**Response 201**:
```json
{
  "id": 43,
  "date": "2026-03-30",
  "score": 5,
  "body": "",
  "created_at": "2026-03-30T14:30:00Z",
  "updated_at": "2026-03-30T14:30:00Z"
}
```

**Response 400**: `score` out of range or not an integer.

---

### `GET /api/notes/:id`

Fetch the full content of a single note.

**Response 200**:
```json
{
  "id": 43,
  "date": "2026-03-30",
  "score": 7,
  "body": "Full note text here...",
  "created_at": "2026-03-30T14:30:00Z",
  "updated_at": "2026-03-30T15:00:00Z"
}
```

**Response 404**: Note does not exist or does not belong to the authenticated user.

---

### `PATCH /api/notes/:id`

Update an existing note's `score` and/or `body`. Partial updates are supported — only send the fields to change.

**Request body** (all fields optional):
```json
{
  "score": 8,
  "body": "Updated note text"
}
```

**Response 200**: Full updated note object (same shape as `GET /api/notes/:id`).

**Response 400**: Validation failure.
**Response 404**: Note not found or not owned by the user.

---

### `DELETE /api/notes/:id`

Permanently delete a note.

**Response 204**: No body.
**Response 404**: Note not found or not owned by the user.

---

## Admin Endpoints

All admin endpoints require `sessionClaims.metadata.role === 'admin'`. Return `403` for authenticated non-admin users.

---

### `GET /api/admin/users`

List all Clerk users.

**Query parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | No | Filter by name or email (delegated to Clerk `query` param) |
| `limit` | integer | No | Default: 50 |
| `offset` | integer | No | Default: 0 |

**Response 200**:
```json
{
  "users": [
    {
      "id": "user_2abc",
      "email": "alice@example.com",
      "firstName": "Alice",
      "lastName": "Smith",
      "role": "user",
      "active": true,
      "createdAt": "2026-01-10T09:00:00Z",
      "lastSignInAt": "2026-03-29T18:00:00Z"
    }
  ],
  "total": 1
}
```

`active` is `false` when Clerk's `banned` flag is `true`.

---

### `POST /api/admin/users`

Create a new user account.

**Request body**:
```json
{
  "email": "bob@example.com",
  "password": "InitialPass123!",
  "firstName": "Bob",
  "lastName": "Jones"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `email` | Yes | Must be a valid email |
| `password` | Yes | Must meet Clerk's password policy |
| `firstName` | No | |
| `lastName` | No | |

New users are created with `role: "user"` and `active: true`.

**Response 201**:
```json
{ "id": "user_2xyz", "email": "bob@example.com", "firstName": "Bob", "lastName": "Jones", "role": "user", "active": true }
```

**Response 400**: Validation or Clerk error (e.g., email already exists).

---

### `PATCH /api/admin/users/:userId`

Update a user's details and/or active status.

**Request body** (all fields optional):
```json
{
  "firstName": "Robert",
  "lastName": "Jones",
  "active": false
}
```

Sending `active: false` calls `clerkClient.users.banUser(userId)`.
Sending `active: true` calls `clerkClient.users.unbanUser(userId)`.

**Response 200**: Updated user object (same shape as in the list).
**Response 400**: Cannot deactivate or modify your own admin account.
**Response 404**: User not found.

---

### `DELETE /api/admin/users/:userId`

Permanently delete a user and all their notes.

Steps performed by the server:
1. Verify the target is not the requesting admin's own account → 400 if so.
2. `DELETE FROM notes WHERE user_id = :userId` in SQLite.
3. `clerkClient.users.deleteUser(userId)`.

**Response 204**: No body.
**Response 400**: Attempt to delete own account.
**Response 404**: User not found.
