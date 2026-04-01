---
title: Auth Architecture — Pluggable Adapter Design
status: Adopted
date: 2026-03-31
---

# Auth Architecture: Pluggable Adapter

## Problem

The original design hard-coded Clerk throughout the frontend and backend. This made
local development on environments where Clerk's SDK cannot load (e.g. Chromebook/Crostini,
restricted corporate networks) impossible. It also tied every test and every route handler
to an external service.

## Solution: One env var, two adapters

A single env var `AUTH_PROVIDER` selects the active adapter at startup:

```
AUTH_PROVIDER=local   → sessions + bcrypt (development, no external services)
AUTH_PROVIDER=clerk   → Clerk SDK         (production on Sliplane)
```

**Routes and pages never import auth code directly.** They only read `req.auth` (server)
or call `auth.*` helpers (frontend). Swapping the adapter requires no changes to
business logic.

---

## Server-side interface

File: `server/auth/index.js` — loads the correct adapter and re-exports it.

Every adapter MUST export exactly these functions:

```js
/**
 * Express middleware. Sets req.auth = { userId, role } or returns 401.
 * Adapter chooses how to verify identity (session cookie vs JWT).
 */
export async function attachAuth(req, res, next) {}

/**
 * Express middleware. Returns 403 if req.auth.role !== 'admin'.
 * Identical across adapters — lives in server/middleware/require-admin.js (unchanged).
 */
// requireAdmin is shared, not per-adapter

/**
 * Create a new user. Returns { userId }.
 * Local: inserts into users table.
 * Clerk: calls clerkClient.users.createUser().
 */
export async function createUser({ email, password, firstName, lastName }) {}

/**
 * Return a single user by id. Returns null if not found.
 * Shape: { userId, email, firstName, lastName, role, active }
 */
export async function getUser(userId) {}

/**
 * Return all users, optionally filtered by search string q.
 * Shape: [{ userId, email, firstName, lastName, role, active }]
 */
export async function listUsers(q) {}

/**
 * Update mutable user fields (name, email). Partial update — only provided fields change.
 */
export async function updateUser(userId, { firstName, lastName, email }) {}

/**
 * Set active flag. active=false prevents login immediately.
 * Local: sets users.active = 0.
 * Clerk: calls banUser() / unbanUser().
 */
export async function setUserActive(userId, active) {}

/**
 * Permanently delete a user and all their notes.
 * Local: DELETE from users + notes WHERE user_id.
 * Clerk: DELETE notes WHERE user_id, then clerkClient.users.deleteUser().
 */
export async function deleteUser(userId) {}
```

### req.auth shape (always the same, regardless of adapter)

```js
req.auth = {
  userId: string,   // stable unique identifier for this user
  role:   'user' | 'admin',
}
```

---

## Frontend interface

File: `src/js/auth.js` — thin module that imports from the correct adapter based on
`import.meta.env.VITE_AUTH_PROVIDER`.

Every frontend adapter MUST implement:

```js
/**
 * Called once per page load. Initialises the auth system.
 * Local: reads session state from a lightweight /api/auth/me endpoint.
 * Clerk: loads the Clerk JS SDK.
 */
export async function initAuth() {}

/**
 * Returns the current user or null if not signed in.
 * Shape: { id, email, firstName, lastName, role }
 */
export function getUser() {}

/**
 * Returns a bearer token for API calls, or null if not signed in.
 * Local: returns a short-lived CSRF token from the session.
 * Clerk: returns clerk.session.getToken().
 */
export async function getToken() {}

/**
 * Redirect guard. Call at the top of every protected page.
 * opts.requireAdmin = true → redirect non-admins to notes page.
 * Default: redirect unauthenticated users to login page.
 */
export function guardAuth(opts = {}) {}

/**
 * Mount the login UI into the given DOM element.
 * Local: renders a plain email/password form.
 * Clerk: mounts clerk.mountSignIn(element).
 */
export function mountLoginUI(element) {}

/**
 * Sign out and redirect to login.
 */
export async function signOut() {}
```

---

## Local adapter (development)

`AUTH_PROVIDER=local` / `VITE_AUTH_PROVIDER=local`

### Server (`server/auth/local.js`)

- `express-session` with `SESSION_SECRET` env var; cookie is `httpOnly`, `sameSite: 'strict'`
- In production add `secure: true` (HTTPS); detect via `NODE_ENV=production`
- Passwords hashed with `bcrypt` (cost factor 12)
- Users stored in SQLite `users` table (see schema below)
- Login: `POST /api/auth/login` → checks email + password → sets `req.session.userId`
- Logout: `POST /api/auth/logout` → destroys session
- Session check: `GET /api/auth/me` → returns `{ userId, role }` or 401
- `attachAuth` reads `req.session.userId`, looks up role from `users` table

### Frontend (`src/js/auth/local.js`)

- `initAuth()` calls `GET /api/auth/me` to check session state
- `mountLoginUI(el)` renders a plain form: email input + password input + submit button
- Form submits to `POST /api/auth/login` (JSON body), redirects on success
- `signOut()` calls `POST /api/auth/logout`, redirects to login
- `getToken()` returns `null` — the session cookie is sent automatically by the browser

### Users table (added to db.js migration)

```sql
CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,          -- random UUID generated at insert
  email        TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name   TEXT NOT NULL DEFAULT '',
  last_name    TEXT NOT NULL DEFAULT '',
  role         TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  active       INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at   TEXT NOT NULL
);
```

### Bootstrap: first admin

A one-shot script `scripts/create-admin.mjs` creates the first admin account:

```
node --env-file=.env scripts/create-admin.mjs admin@example.com secretpassword
```

---

## Clerk adapter (production)

`AUTH_PROVIDER=clerk` / `VITE_AUTH_PROVIDER=clerk`

- Server: `server/auth/clerk.js` — existing logic from `server/middleware/auth.js` +
  `server/routes/admin.js` user management calls, extracted behind the interface
- Frontend: `src/js/auth/clerk.js` — existing `clerk-init.js` logic, re-wrapped
- Requires: `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` in `.env`
- Only tested on Sliplane; never needed locally

---

## Environment configuration

### `.env` for Chromebook development (local adapter)

```
AUTH_PROVIDER=local
VITE_AUTH_PROVIDER=local
SESSION_SECRET=change-me-to-a-long-random-string
DATABASE_PATH=./data/db.sqlite
PORT=3000
```

### `.env` / Sliplane env vars for production (Clerk adapter)

```
AUTH_PROVIDER=clerk
VITE_AUTH_PROVIDER=clerk
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
DATABASE_PATH=/app/data/db.sqlite
PORT=3000
NODE_ENV=production
```

### `DEV_BYPASS_AUTH` is retired

The old bypass hack is removed once the local adapter exists. The local adapter IS
the development auth — no bypass needed.

---

## Development workflow on Chromebook

```bash
# Terminal 1 — rebuild frontend on every file save
npm run build:watch      # new script: "vite build --watch"

# Terminal 2 — run backend (auto-restarts on server file changes)
node --env-file=.env --watch server/index.js
```

Access the app at **`http://localhost:3000`** — Express serves the built `dist/`.
No Vite dev server, no WebSocket, no port-forwarding issues.

### Rebuild latency

`vite build --watch` rebuilds only changed modules. Typical incremental rebuild: **1–3 seconds**.
The browser must be refreshed manually after each rebuild (F5). This replaces hot-reload
but is entirely reliable on Chromebook.

---

## Deployment to Sliplane

1. Set `AUTH_PROVIDER=clerk` and Clerk keys in Sliplane env vars
2. Set `VITE_AUTH_PROVIDER=clerk` — Vite bakes this into the bundle at `docker build` time
3. `docker build` runs `npm run build` (Vite) then packages Express + `dist/`
4. Mount `/app/data` as a persistent volume — fresh SQLite on first deploy
5. Run `scripts/create-admin.mjs` once to bootstrap the first admin (or use Clerk dashboard)

**No code changes** between local and production. Only env vars differ.

---

## What changes in existing files

### `plan.md` — update these sections
- **Summary**: replace "Users authenticate via Clerk.com" with "Users authenticate via
  a pluggable auth adapter (local sessions in development, Clerk in production)"
- **Primary Dependencies**: remove `@clerk/clerk-js` and `@clerk/backend`; add
  `express-session`, `bcrypt`; note Clerk packages remain as optional prod dependency
- **Project Structure**: rename `js/clerk-init.js` → `js/auth.js`; rename
  `server/middleware/auth.js` → `server/auth/index.js`; add `server/auth/local.js`
  and `server/auth/clerk.js`; add `scripts/create-admin.mjs`
- **Complexity Tracking**: update the Clerk row — Clerk is now the *production* adapter
  only; local adapter is the default for development
- **Dev vs prod**: add `npm run build:watch` + `localhost:3000` as the dev workflow

### `spec.md` — add one section after Assumptions
```
## Development Environment

- Development runs on Chromebook (Linux/Crostini container).
  Express serves the built frontend; no Vite dev server is used in development.
- Auth is provided by a local session adapter in development and by Clerk in production.
  The same app code runs in both environments; only env vars differ.
- A production deployment to Sliplane is the only context where Clerk is tested.
```

### `tasks.md` — replace Phase 2 auth tasks
The existing T009/T016 (Clerk middleware, clerk-init.js) are replaced by:
- Implement `server/auth/local.js` (sessions + bcrypt)
- Implement `server/auth/index.js` (adapter loader)
- Implement `src/js/auth.js` + `src/js/auth/local.js`
- Implement `scripts/create-admin.mjs`
- Later (Sliplane phase): implement `server/auth/clerk.js` + `src/js/auth/clerk.js`

### `quickstart.md` — add two sections
- **Local development (Chromebook)**: `build:watch` + Express on port 3000
- **Production deployment (Sliplane)**: set Clerk env vars, `docker build`, volume mount
