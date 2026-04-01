# Research: beingc

**Branch**: `001-wellbeing-notes` | **Date**: 2026-03-30

---

## 1. Clerk.com — Vanilla JS Integration

**Decision**: Use `@clerk/clerk-js` (npm) for the frontend and `@clerk/backend` for the Node.js server.

**Rationale**: `@clerk/clerk-js` is Clerk's foundational browser SDK — all framework-specific packages (React, Vue) are wrappers around it. It integrates with Vite via npm import, not a CDN script tag, keeping the build reproducible.

**Key facts**:
- Frontend install: `npm install @clerk/clerk-js`
- Backend install: `npm install @clerk/backend`
- Frontend initialisation: `new Clerk(publishableKey)` → `await clerk.load()` → use `clerk.mountSignIn(el)` / `clerk.mountUserButton(el)`
- Getting a bearer token: `await clerk.session.getToken()` → sent as `Authorization: Bearer <token>`
- Backend token verification: `clerkClient.authenticateRequest(req, { authorizedParties })` — handles JWKS automatically; returns `userId` and `sessionClaims`
- All requests to `/api/*` from the frontend must include the Bearer token; the backend middleware validates it before any handler runs

**Alternatives considered**: CDN script tag — rejected because it bypasses Vite's module resolution and complicates environment variable injection.

---

## 2. Clerk.com — Admin Role and User Management

**Decision**: Use Clerk `publicMetadata` for role storage; use `clerkClient.users.*` methods for admin CRUD from the backend.

**Rationale**: Clerk's native RBAC (Organizations) is designed for multi-tenant B2B apps and adds unnecessary complexity. Storing `{ role: "admin" }` in `publicMetadata` is Clerk's own documented pattern for B2C role management. Because `publicMetadata` is only writable from the backend (never the browser), it is trust-safe.

**Key SDK methods for admin user management**:

| Operation | Method |
|-----------|--------|
| List users | `clerkClient.users.getUserList({ limit, offset, query })` |
| Get single user | `clerkClient.users.getUser(userId)` |
| Create user | `clerkClient.users.createUser({ emailAddress, password, firstName, lastName })` |
| Update name/email | `clerkClient.users.updateUser(userId, { firstName, lastName })` |
| Deactivate (ban) | `clerkClient.users.banUser(userId)` |
| Reactivate (unban) | `clerkClient.users.unbanUser(userId)` |
| Delete user | `clerkClient.users.deleteUser(userId)` |
| Set role | `clerkClient.users.updateUser(userId, { publicMetadata: { role: 'admin' } })` |

**Role injection into JWT**: In the Clerk Dashboard, the JWT Claims editor must be configured to include `{ "metadata": "{{user.public_metadata}}" }`. The backend then reads `sessionClaims.metadata.role` from the verified token — no extra network call.

**Deactivation semantics**: `banUser()` maps exactly to the "deactivate" requirement. A banned user sees an error from Clerk's sign-in UI immediately; no grace period.

**Pricing**: Free tier is 50,000 MAU, sufficient for a small personal/team app. No credit card required. The free tier supports all SDK features needed here; future payment cycle integration (Stripe via Clerk) is available on the Pro plan at $25/month.

---

## 3. SQLite in Node.js

**Decision**: Use `better-sqlite3`.

**Rationale**: Fastest SQLite library for Node.js, synchronous API is simpler for a low-traffic server (no async/await complexity in queries), widely maintained, and works well in Docker.

**Key facts**:
- Synchronous: queries block the event loop but are fast enough for a low-concurrency personal app
- Enable WAL mode at startup: `db.pragma('journal_mode = WAL')` — improves concurrent read performance
- Docker volume path: `/app/data/db.sqlite`
- Open with: `new Database('/app/data/db.sqlite')`

**Alternatives considered**: `node-sqlite3` — slower, async callback API adds boilerplate; `bun:sqlite` — requires Bun runtime, not Node.js; `node:sqlite` (built-in) — experimental in Node.js 22, not production-ready.

---

## 4. Vite Configuration

**Decision**: Single `vite.config.js` at root; dev proxy forwards `/api/*` to `localhost:3000`; production has no proxy — Node.js serves `dist/` statically.

**Key facts**:
- Dev: `vite dev` starts on port 5173; proxy sends `fetch('/api/...')` to `http://localhost:3000/api/...`
- Production: `vite build` outputs to `dist/`; Express serves `dist/` via `express.static(path.join(import.meta.dirname, 'dist'))`
- SPA fallback: `app.get('*', ...)` sends `dist/index.html` for any unmatched route (client-side navigation)
- No plugins needed for vanilla JS — Vite picks up `index.html` as the entry automatically
- Environment variable injection: `VITE_CLERK_PUBLISHABLE_KEY` exposed to browser via `import.meta.env`; `CLERK_SECRET_KEY` stays server-only (never prefixed `VITE_`)

---

## 5. Docker and Sliplane Deployment

**Decision**: Single-container multi-stage Docker build; Node.js serves both the API and the built frontend; SQLite volume mounted at `/app/data`.

**Rationale**: Sliplane is container-as-a-service (Hetzner-backed VPS managed by Sliplane). Deployments are purely Dockerfile-based — no Docker Compose on Sliplane. One container keeps deployment simple and eliminates inter-service networking.

**Key Sliplane constraints**:
- HTTP port must be in range 8080–65535 (or use the `PORT` env var which Sliplane can set)
- Server must bind to `0.0.0.0`, not `localhost`
- Volume mount path in UI must be the exact container path: `/app/data`
- Reserved env var names: `PORT`, `SLIPLANE_*` prefixed vars — do not reuse

**Multi-stage Dockerfile approach**:
1. `FROM node:22-alpine AS builder` — install deps, run `vite build`, output goes to `dist/`
2. `FROM node:22-alpine AS runtime` — copy `dist/` and `server/` only; install production deps; `EXPOSE 3000`; `CMD ["node", "server/index.js"]`
3. `VOLUME ["/app/data"]` declared in Dockerfile; Sliplane UI maps its named volume to `/app/data`

**Local development**: `npm run dev` starts Vite dev server (port 5173) + Node backend (port 3000) concurrently via `concurrently` package.
