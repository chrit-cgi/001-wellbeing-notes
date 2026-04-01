# Data Model: beingc

**Branch**: `001-wellbeing-notes` | **Date**: 2026-03-30

---

## Overview

The app has two data domains:

1. **Users and authentication** — fully managed by Clerk. No user table exists in the local SQLite database; the Clerk user ID is the authoritative identity reference.
2. **Notes** — stored in the local SQLite database. Each note references a Clerk user ID.

---

## SQLite Schema

### Table: `notes`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Internal row ID |
| `user_id` | TEXT | NOT NULL | Clerk user ID (e.g. `user_2abc...`) |
| `date` | TEXT | NOT NULL | ISO 8601 date string (`YYYY-MM-DD`); defaults to creation date; set by server |
| `score` | INTEGER | NOT NULL, CHECK (score >= 0 AND score <= 10) | Wellbeing score; default 5 |
| `body` | TEXT | NOT NULL DEFAULT '' | Full note text |
| `created_at` | TEXT | NOT NULL | ISO 8601 datetime; set by server at insert |
| `updated_at` | TEXT | NOT NULL | ISO 8601 datetime; updated on every write |

**Indexes**:
- `idx_notes_user_date` on `(user_id, date DESC)` — primary query pattern (list a user's notes in reverse-chronological order)
- `idx_notes_user_fts` — full-text search handled by SQLite FTS5 (see below)

**Constraints**:
- `date` is set by the server on creation; clients cannot override it.
- `score` must be an integer 0–10 (enforced by CHECK constraint).
- `body` may be empty string but not NULL.
- A user may have multiple notes on the same date (the spec does not forbid it).

### FTS5 Virtual Table: `notes_fts`

A SQLite FTS5 virtual table mirrors `notes.body` for full-text search:

```sql
CREATE VIRTUAL TABLE notes_fts USING fts5(
  body,
  content='notes',
  content_rowid='id'
);
```

This is kept in sync with `notes` via triggers on INSERT, UPDATE, and DELETE. Searching uses `notes_fts MATCH ?` and joins back to `notes` on `rowid = notes.id`.

---

## Clerk-Managed User Model

Users and sessions are entirely managed by Clerk. The app's backend treats the verified `userId` from the session token as the sole identity reference.

**Relevant Clerk user fields** (read via `clerkClient.users.getUser(userId)` or from the verified token):

| Field | Source | Notes |
|-------|--------|-------|
| `id` | Clerk | Unique user identifier (stored in `notes.user_id`) |
| `emailAddresses[0].emailAddress` | Clerk | Primary email |
| `firstName`, `lastName` | Clerk | Display name |
| `publicMetadata.role` | Clerk | `"admin"` or `"user"` (default). Set only from backend. |
| `banned` | Clerk | `true` = deactivated; cannot sign in |
| `createdAt` | Clerk | Account creation timestamp |
| `lastSignInAt` | Clerk | Last sign-in timestamp |

**Admin identification**: the backend checks `sessionClaims.metadata.role === 'admin'` (injected into the JWT via the Clerk Dashboard JWT Claims editor). This check requires no extra network call.

---

## State Transitions

### Note lifecycle

```
[create] → DRAFT (unsaved, slider=5, body='')
         → SAVED (persisted to SQLite)
         → EDITED (user modifies text or score in the editor)
         → SAVED (user saves changes)
         → DELETED (user confirms delete via three-dot menu)
```

A note moves to DELETED by a hard DELETE from the database (no soft-delete / archive pattern in v1).

### User lifecycle (Clerk)

```
[admin creates user] → ACTIVE (can sign in)
                     → INACTIVE / BANNED (admin deactivates — cannot sign in)
                     → ACTIVE (admin reactivates)
                     → DELETED (admin deletes — all notes also deleted from SQLite)
```

When a user is deleted via the admin page, the backend MUST:
1. Call `clerkClient.users.deleteUser(userId)` to remove the Clerk account.
2. Execute `DELETE FROM notes WHERE user_id = ?` to remove all their notes from SQLite.

Both steps should occur within the same admin action. If the SQLite deletion fails after the Clerk deletion succeeds, the orphaned rows are harmless (they can never be accessed by a valid token) but should be logged.

---

## Validation Rules

| Field | Rule |
|-------|------|
| `score` | Integer, 0–10 inclusive. Reject non-integer or out-of-range values with HTTP 400. |
| `body` | String, any length including empty. Trim leading/trailing whitespace before storing. |
| `date` | Not accepted from client; always set by server to `YYYY-MM-DD` (UTC). |
| `user_id` | Taken from the verified Clerk session token; never accepted from the request body. |

---

## Database Initialisation

On server startup, if the database file does not exist, the server creates it and runs the migration:

```sql
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT    NOT NULL,
  date       TEXT    NOT NULL,
  score      INTEGER NOT NULL DEFAULT 5 CHECK (score >= 0 AND score <= 10),
  body       TEXT    NOT NULL DEFAULT '',
  created_at TEXT    NOT NULL,
  updated_at TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_user_date ON notes (user_id, date DESC);

CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  body,
  content='notes',
  content_rowid='id'
);

-- Sync triggers
CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, body) VALUES (new.id, new.body);
END;

CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, body) VALUES ('delete', old.id, old.body);
END;

CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, body) VALUES ('delete', old.id, old.body);
  INSERT INTO notes_fts(rowid, body) VALUES (new.id, new.body);
END;
```
