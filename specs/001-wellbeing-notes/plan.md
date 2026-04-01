# Implementation Plan: beingc

**Branch**: `001-wellbeing-notes` | **Date**: 2026-03-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-wellbeing-notes/spec.md`

## Summary

A mobile-first web application for personal daily wellbeing notes with full-text search and a wellbeing score slider. Users authenticate via Clerk.com. Notes are stored in a server-side SQLite database. An admin can manage users (CRUD, activate/deactivate) via Clerk's Backend API. The app is built with Vite + vanilla HTML/CSS/JS on the frontend and a minimal Node.js/Express server on the backend. It runs locally in development and deploys to Sliplane via a multi-stage Dockerfile with a persistent volume for the SQLite database.

## Technical Context

**Language/Version**: JavaScript (vanilla, ESM) — Node.js 22 LTS (server), browser ES2022 (frontend)
**Primary Dependencies**:
- `@clerk/clerk-js` — browser auth SDK (frontend)
- `@clerk/backend` — token verification + user management API (server)
- `express` — HTTP server and static file serving
- `better-sqlite3` — SQLite driver (server, synchronous)
- `vite` — frontend build tool and dev server
- `concurrently` — run Vite + Node server together in dev
**Storage**: SQLite via `better-sqlite3`; database file at `/app/data/db.sqlite` (production) or `./data/db.sqlite` (development)
**Testing**: Vitest (unit + integration), Playwright (end-to-end, optional)
**Target Platform**: Mobile browser (primary), any modern desktop browser (secondary); Linux container (Sliplane/Docker)
**Project Type**: Web application — Vite frontend served by Express backend in production; separate processes in development
**Constraints**: Online-only (no offline caching); single SQLite file (no multi-node); Sliplane port range 8080–65535 (use 3000 overridable via `PORT` env var); server must bind to `0.0.0.0`
**Scale/Scope**: Small personal/team app; single admin; tens to hundreds of users; thousands of notes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality ✅

- Zero external CSS frameworks; all styles in `src/css/` (vanilla CSS with custom properties for design tokens)
- Zero frontend JS frameworks; UI state managed manually in vanilla JS modules
- Each JS file has a single responsibility (e.g., `notes.js` manages only the notes list, `api.js` only wraps fetch)
- Cyclomatic complexity target: ≤ 10 per function — enforced by ESLint with `complexity` rule
- No dead imports or commented-out code merged to main
- All server-side route handler functions have JSDoc comments

### II. Testing Standards ✅

- TDD applies to server-side route handlers and data-access functions
- Contract tests: one test per API endpoint in `tests/contract/`
- Integration tests: note CRUD flow, admin user management flow
- Unit tests: data validation functions, SQLite query helpers
- Frontend: Playwright end-to-end tests cover the primary user journeys (login, create note, search, admin)

### III. User Experience Consistency ✅

- All loading states handled: notes list shows skeleton rows while fetching
- All empty states handled: empty notes list, zero search results, new-note editor
- All error states handled: offline banner, save-failed toast, login error
- CSS custom properties (`--color-primary`, `--color-slider-low`, `--color-slider-high`, etc.) used as the design token system — no hard-coded colours in component styles
- WCAG 2.1 AA: slider has `role="slider"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`; focus indicators visible; colour contrast ≥ 4.5:1

### Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| External auth service (Clerk) | Future payment cycle requires identity provider with billing hooks | Rolling bespoke auth would need password hashing, session store, token rotation — far more complex and a security risk |

## Project Structure

### Documentation (this feature)

```text
specs/001-wellbeing-notes/
├── plan.md          # This file
├── research.md      # Phase 0 output
├── data-model.md    # Phase 1 output
├── quickstart.md    # Phase 1 output
├── contracts/
│   └── api.md       # REST API contracts
└── tasks.md         # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/                         # Vite frontend (vanilla HTML/CSS/JS)
  index.html                 # Entry point — auth guard, redirects to /notes or /login
  pages/
    login.html               # Clerk sign-in mount point
    notes.html               # Notes list + search
    note.html                # Note editor + wellbeing slider
    admin.html               # Admin user management
    settings.html            # Settings + logout
  css/
    tokens.css               # CSS custom properties (design tokens)
    main.css                 # Global reset + layout
    notes.css                # Notes list styles
    note.css                 # Note editor + slider styles
    admin.css                # Admin page styles
    settings.css             # Settings page styles
  js/
    clerk-init.js            # Clerk instantiation + auth guard helper
    api.js                   # fetch() wrapper — attaches Bearer token, handles errors
    notes.js                 # Notes list page: load, search, render, navigate to editor
    note.js                  # Note editor page: load, slider, save, delete, discard
    admin.js                 # Admin page: list users, create, edit, activate, delete
    settings.js              # Settings page: show account info, logout

server/                      # Node.js Express backend
  index.js                   # Entry: Express setup, static serving, route mounting, startup
  db.js                      # SQLite init, schema migration, WAL mode
  middleware/
    auth.js                  # Clerk token verification → req.auth = { userId, role }
    require-admin.js         # 403 if req.auth.role !== 'admin'
  routes/
    notes.js                 # GET/POST /api/notes, GET/PATCH/DELETE /api/notes/:id
    admin.js                 # GET/POST /api/admin/users, PATCH/DELETE /api/admin/users/:id
    health.js                # GET /api/health

scripts/
  set-admin.mjs              # One-shot: set publicMetadata.role='admin' for a Clerk user ID

tests/
  contract/                  # One test file per API endpoint
  integration/               # End-to-end flows (note CRUD, admin CRUD)
  unit/                      # Data validation, SQLite helpers

data/                        # Git-ignored; SQLite file lives here at runtime
  .gitkeep

dist/                        # Git-ignored; Vite build output

Dockerfile
.dockerignore
.env.example
.env                         # Git-ignored
vite.config.js
package.json
.eslintrc.json
```

**Structure Decision**: Single repository with `src/` (frontend) and `server/` (backend). In development, Vite runs on port 5173 and proxies `/api/*` to Node on port 3000. In production and Docker, Node serves the `dist/` folder as static files and handles `/api/*` itself — no Vite process at runtime.

## Phase 0: Research Findings

All unknowns resolved. See [research.md](research.md) for full details.

Key decisions:
- **Clerk integration**: `@clerk/clerk-js` (browser) + `@clerk/backend` (server); role stored in `publicMetadata`; JWT Claims editor configured to inject role into token
- **Deactivation**: `clerkClient.users.banUser()` / `unbanUser()` — blocks sign-in immediately
- **SQLite**: `better-sqlite3` (synchronous, fastest for Node.js); WAL mode enabled; FTS5 for search
- **Deployment**: single multi-stage Docker image; Express serves static + API; volume at `/app/data`
- **Dev vs prod**: Vite proxy in dev; `express.static('dist')` in prod

## Phase 1: Design Artifacts

See:
- [data-model.md](data-model.md) — SQLite schema, Clerk user fields, state transitions, validation rules
- [contracts/api.md](contracts/api.md) — All REST endpoints with request/response shapes
- [quickstart.md](quickstart.md) — Local setup, Docker, Sliplane deployment, validation checklist

## Key Design Decisions

### Navigation Model

The app is a multi-page application (MPA), not a single-page app (SPA). Each screen is a separate HTML file loaded via normal browser navigation. This avoids a client-side router and keeps vanilla JS complexity low. Clerk's session persists across page loads automatically.

Page routing:
- `/` → auth guard → redirects to `/pages/notes.html` (logged-in user) or `/pages/login.html` (unauthenticated)
- Admin users are redirected to `/pages/admin.html` after login

### Wellbeing Slider

Implemented as a native HTML `<input type="range">` element with:
- `min="0"` `max="10"` `step="1"` `value="5"` `orient="vertical"` (Firefox) + CSS `writing-mode: vertical-lr` (Chromium)
- CSS gradient on the track: `brown` at the minimum end, `yellow` at the maximum end
- `aria-label="Wellbeing score"` + `aria-valuenow` updated on input event
- Positioned absolutely on the right edge of the note editor screen

### Offline Detection

`window.addEventListener('online' / 'offline')` drives a banner element visibility. The save button is disabled when `!navigator.onLine`. No service worker or caching strategy.

### Admin Isolation

The admin never sees the notes list. After login, `clerk-init.js` checks `sessionClaims.metadata.role` and redirects admins to `/pages/admin.html`. There is no navigation path from admin to any user's note content.
