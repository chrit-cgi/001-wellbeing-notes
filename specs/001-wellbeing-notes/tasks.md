---
description: "Task list for beingc implementation"
---

# Tasks: beingc

**Input**: Design documents from `/specs/001-wellbeing-notes/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/api.md ✅

**Tests**: Included — required by the project constitution (TDD, contract tests before implementation, ≥ 80% unit coverage).

**Organization**: Tasks grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)
- Exact file paths included in every task description

## Path Conventions

All paths relative to repository root (`/home/cmsliepen/beingc/`):

```text
src/          Vite frontend (HTML/CSS/JS)
server/       Node.js Express backend
scripts/      One-shot utility scripts
tests/        Vitest tests (contract, integration, unit)
data/         SQLite runtime data (volume mount in Docker)
```

---

## Phase 1: Setup

**Purpose**: Initialize project, install dependencies, configure tooling.

- [ ] T001 Initialize `package.json` with all dependencies: `vite`, `express`, `@clerk/clerk-js`, `@clerk/backend`, `better-sqlite3`, `concurrently`, `vitest`, `eslint` — and npm scripts: `dev` (concurrently vite + node server/index.js), `build` (vite build), `start` (node server/index.js), `lint`, `test`
- [ ] T002 Create full directory skeleton: `src/pages/`, `src/css/`, `src/js/`, `server/middleware/`, `server/routes/`, `scripts/`, `tests/contract/`, `tests/integration/`, `tests/unit/`, `data/`
- [ ] T003 [P] Create `vite.config.js` — vanilla JS entry, `/api` proxy → `http://localhost:3000`, dev port 5173
- [ ] T004 [P] Create `.eslintrc.json` — ESM, browser + Node envs, `complexity` rule max 10, `no-unused-vars`, `no-undef`
- [ ] T005 [P] Create `.env.example` with all required variables: `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `PORT` (default 3000), `DATABASE_PATH`
- [ ] T006 [P] Create `.dockerignore` — exclude `node_modules`, `data/`, `.env`, `dist/` from Docker build context
- [ ] T007 [P] Create `data/.gitkeep` and add `data/*.sqlite` to `.gitignore`; add `dist/` and `.env` to `.gitignore`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure that every user story depends on. Nothing in Phase 3+ can begin until this phase is complete.

**⚠️ CRITICAL**: No user story work can start until Phase 2 is complete.

- [ ] T008 Implement `server/db.js` — open SQLite at `process.env.DATABASE_PATH` (default `./data/db.sqlite`), enable WAL mode, create `notes` table (id, user_id, date, score 0–10 CHECK, body, created_at, updated_at), `idx_notes_user_date` index, FTS5 `notes_fts` virtual table, and three sync triggers (INSERT/UPDATE/DELETE) per `data-model.md`
- [ ] T009 [P] Implement `server/middleware/auth.js` — extract Bearer token from `Authorization` header, call `clerkClient.authenticateRequest()`, attach `req.auth = { userId, role }` to request; return 401 if token invalid or missing
- [ ] T010 [P] Implement `server/middleware/require-admin.js` — return 403 if `req.auth.role !== 'admin'`
- [ ] T011 [P] Implement `server/routes/health.js` — `GET /api/health` → `{ status: "ok" }`, no auth required
- [ ] T012 Implement `server/index.js` — create Express app, `express.json()`, `express.static('dist')`, mount `/api/health`, `/api/notes` (with auth middleware), `/api/admin` (with auth + require-admin), SPA fallback `GET *` → `dist/index.html`, bind `0.0.0.0:PORT`, call `db.js` init on startup
- [ ] T013 [P] Create `src/css/tokens.css` — CSS custom properties: `--color-bg`, `--color-text`, `--color-card`, `--color-border`, `--color-slider-low` (brown `#8B4513`), `--color-slider-high` (yellow `#FFD700`), `--color-accent`, `--space-*` scale, `--radius-*`
- [ ] T014 [P] Create `src/css/main.css` — global reset, `box-sizing: border-box`, mobile-first base layout (max-width, padding), bottom nav bar styles, shared button and form element styles; import `tokens.css`
- [ ] T015 [P] Implement `src/js/api.js` — async fetch wrapper that calls `clerk.session.getToken()`, attaches `Authorization: Bearer <token>` header, handles 401 (redirect to login), 403 (show error), network failure (throw offline error); export `get`, `post`, `patch`, `del` helpers
- [ ] T016 [P] Implement `src/js/clerk-init.js` — export `initClerk()`: instantiate `new Clerk(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)`, call `clerk.load()`, return clerk instance; export `guardAuth(clerk)`: if not signed in → redirect to `/pages/login.html`; if signed in + role=admin → redirect to `/pages/admin.html`; else → redirect to `/pages/notes.html`
- [ ] T017 [P] Write unit tests for `server/db.js` in `tests/unit/db.test.js` — verify schema creation, note insert/select/update/delete, FTS5 search returns correct rows, score CHECK constraint rejects out-of-range values

**Checkpoint**: Foundation ready — all user story phases can now begin in parallel.

---

## Phase 3: User Story 1 — Secure Login (Priority: P1) 🎯 MVP start

**Goal**: Show login screen to unauthenticated users; redirect authenticated users to their appropriate page.

**Independent Test**: Open app unauthenticated → login screen. Valid credentials → notes list (or admin page for admin). Invalid credentials → error shown. Session persists across page reload.

### Tests for User Story 1 ⚠️ Write first — must FAIL before T020

- [ ] T018 [P] [US1] Write contract test in `tests/contract/auth.test.js` — verify `guardAuth` redirects unauthenticated users to login, authenticated regular users to notes, authenticated admin users to admin page

### Implementation for User Story 1

- [ ] T019 [US1] Create `src/index.html` — minimal entry point: loads `clerk-init.js`, calls `initClerk()` then `guardAuth()`, shows a loading spinner while Clerk initialises
- [ ] T020 [US1] Create `src/pages/login.html` — imports `@clerk/clerk-js` and `src/js/login.js`; contains a `#sign-in` mount div centred on screen
- [ ] T021 [US1] Create `src/js/login.js` — call `initClerk()`, mount `clerk.mountSignIn(document.getElementById('sign-in'))`, after sign-in success call `guardAuth(clerk)` to redirect
- [ ] T022 [US1] Add login page styles to `src/css/main.css` — centred card layout for `#sign-in`, full-height mobile screen, Clerk component container sizing

**Checkpoint**: Login screen appears unauthenticated. Valid login redirects correctly. Invalid login shows Clerk error. Reload while logged in skips login screen.

---

## Phase 4: User Story 2 — Browse and Search Notes (Priority: P1)

**Goal**: Show all user notes as cards (date + 2-line preview); real-time search; empty states.

**Independent Test**: Log in → notes list with cards. Type in search → list filters. Clear search → full list. No notes → empty state with prompt.

### Tests for User Story 2 ⚠️ Write first — must FAIL before T025

- [ ] T023 [P] [US2] Write contract test in `tests/contract/notes-list.test.js` — `GET /api/notes` returns notes array with `id, date, score, preview, updated_at`; `?q=term` returns only matching notes; empty result returns `{ notes: [], total: 0 }`

### Implementation for User Story 2

- [ ] T024 [US2] Implement `GET /api/notes` in `server/routes/notes.js` — query `notes` table scoped to `req.auth.userId`, order by `date DESC`; if `?q` present use `notes_fts MATCH` and join; return `{ notes: [...], total }` with `preview` = first two lines of `body`
- [ ] T025 [US2] Mount notes router in `server/index.js` — `app.use('/api/notes', authMiddleware, notesRouter)`
- [ ] T026 [US2] Create `src/pages/notes.html` — top row: hamburger/menu button + full-width search `<input>`; note card list `<ul id="notes-list">`; empty-state `<div id="empty-state">` (hidden by default); bottom nav bar ("All" active, "Settings"); imports `src/js/notes.js`
- [ ] T027 [US2] Create `src/css/notes.css` — note card styles (date header, preview text, tap highlight); search bar full-width; skeleton loader rows for loading state; empty state centred message
- [ ] T028 [US2] Implement `src/js/notes.js` — on load call `initClerk()` + `guardAuth()`, fetch `/api/notes`, render cards into `#notes-list`; debounced `input` listener on search bar re-fetches with `?q`; card click navigates to `note.html?id=<id>`; show `#empty-state` when `total === 0`; show skeleton rows during fetch

**Checkpoint**: Notes list renders with date and two-line preview. Search filters in real time. Empty state and loading state both visible.

---

## Phase 5: User Story 3 — Create and Edit a Note (Priority: P1)

**Goal**: Open a note for editing; vertical wellbeing slider (brown→yellow, default 5); save changes; create new note.

**Independent Test**: Tap note in list → editor opens with saved text and slider value. Edit + save → list shows updated preview. "New note" → empty editor, today's date, slider at 5.

### Tests for User Story 3 ⚠️ Write first — must FAIL before T031

- [ ] T029 [P] [US3] Write contract tests in `tests/contract/note-crud.test.js` — `POST /api/notes` creates note (score default 5, date = today); `GET /api/notes/:id` returns full body; `PATCH /api/notes/:id` updates score and body; 400 on score out of range; 404 on wrong user

### Implementation for User Story 3

- [ ] T030 [US3] Add `POST /api/notes`, `GET /api/notes/:id`, `PATCH /api/notes/:id` to `server/routes/notes.js` — validate score (0–10 integer), set `date`/`user_id`/timestamps server-side; `PATCH` does partial update; both scope to `req.auth.userId`
- [ ] T031 [US3] Create `src/pages/note.html` — header row: `<button id="info-btn">ⓘ</button>` left, `<button id="menu-btn">⋮</button>` right; main area: `<textarea id="body">` fills remaining height; `<input type="range" id="score" min="0" max="10" step="1" value="5">` positioned vertically on right edge; `<div id="offline-banner">` hidden; `<dialog id="info-modal">`; imports `src/js/note.js`
- [ ] T032 [US3] Create `src/css/note.css` — vertical slider via `writing-mode: vertical-lr` + `direction: rtl` + CSS gradient track from `var(--color-slider-low)` (bottom) to `var(--color-slider-high)` (top); `aria-valuenow` updated on `input` event; textarea fills available space; offline banner top strip; info modal overlay; header fixed height
- [ ] T033 [US3] Implement `src/js/note.js` — on load: parse `?id` from URL; if present fetch `GET /api/notes/:id` and populate `#body` + `#score`; if absent (new note) set date = today and score = 5; info button opens `#info-modal`; score `input` event updates `aria-valuenow`; save button calls `PATCH` (existing) or `POST` (new) via `api.js`; `navigator.onLine` / `offline` event shows/hides `#offline-banner` and disables save button

**Checkpoint**: Editor opens with correct data. Slider moves and saves. New note has today's date and score 5. Offline banner blocks save.

---

## Phase 6: User Story 4 — Delete a Note (Priority: P2)

**Goal**: Three-dot menu on editor offers Delete (with confirmation) and Discard; delete removes note permanently.

**Independent Test**: Open note → three-dot menu → Delete → confirm → back to list → note gone. Cancel delete → note unchanged.

### Tests for User Story 4 ⚠️ Write first — must FAIL before T036

- [ ] T034 [P] [US4] Write contract test in `tests/contract/note-delete.test.js` — `DELETE /api/notes/:id` returns 204; subsequent `GET` returns 404; `DELETE` on another user's note returns 404

### Implementation for User Story 4

- [ ] T035 [US4] Add `DELETE /api/notes/:id` to `server/routes/notes.js` — scoped to `req.auth.userId`; delete from `notes` (FTS5 trigger handles cleanup); return 204
- [ ] T036 [US4] Add three-dot action menu to `src/pages/note.html` — `<div id="action-menu" role="menu" hidden>` with "Discard changes" and "Delete note" `<button>` items; confirmation `<dialog id="delete-confirm">`
- [ ] T037 [US4] Implement three-dot menu logic in `src/js/note.js` — `#menu-btn` toggles `#action-menu` visibility + `aria-expanded`; "Discard" reloads page (abandons unsaved edits); "Delete" opens `#delete-confirm`; on confirm call `del('/api/notes/:id')` via `api.js` then navigate to `notes.html`; on cancel close dialog

**Checkpoint**: Three-dot menu opens/closes. Delete requires confirmation. Confirmed delete returns to list without the note. Discard reverts unsaved edits.

---

## Phase 7: User Story 5 — Admin: Manage Users (Priority: P2)

**Goal**: Admin-only user management page; list all users; create / edit / deactivate / reactivate / delete.

**Independent Test**: Log in as admin → admin page (not notes list). Create user → appears in list. Deactivate → user cannot log in. Delete → user and all their notes removed.

### Tests for User Story 5 ⚠️ Write first — must FAIL before T040

- [ ] T038 [P] [US5] Write contract tests in `tests/contract/admin-users.test.js` — `GET /api/admin/users` returns user list; `POST` creates user; `PATCH` with `active:false` bans user; `DELETE` removes user; non-admin gets 403; admin cannot delete self (400)

### Implementation for User Story 5

- [ ] T039 [US5] Implement `server/routes/admin.js` — `GET /api/admin/users` (clerkClient.users.getUserList with optional `?q`); `POST /api/admin/users` (clerkClient.users.createUser, role:'user' in publicMetadata); `PATCH /api/admin/users/:userId` (update name/email via updateUser; banUser/unbanUser for active toggle; block self-modification); `DELETE /api/admin/users/:userId` (block self-delete, DELETE notes WHERE user_id, then clerkClient.users.deleteUser)
- [ ] T040 [US5] Mount admin router in `server/index.js` — `app.use('/api/admin', authMiddleware, requireAdminMiddleware, adminRouter)`
- [ ] T041 [US5] Create `src/pages/admin.html` — top bar with app title; `<button id="create-user-btn">`; `<table id="user-table">` with columns: Name, Email, Status, Actions; `<dialog id="user-form">` for create/edit; `<dialog id="delete-confirm">`; imports `src/js/admin.js`
- [ ] T042 [US5] Create `src/css/admin.css` — responsive table (stacks on narrow screens); status badge styles (active=green, inactive=red); action button row; modal form layout
- [ ] T043 [US5] Implement `src/js/admin.js` — on load call `initClerk()` + check role=admin (else redirect); fetch `GET /api/admin/users` and render table rows; "Create" opens `#user-form` in create mode (POST on submit); row "Edit" opens `#user-form` in edit mode (PATCH on submit); row "Deactivate/Activate" calls PATCH with `{active: !current}`; row "Delete" opens `#delete-confirm` (DELETE on confirm); disable all actions on own row

**Checkpoint**: Admin lands on admin page. Full CRUD works. Deactivated user blocked at login. Delete removes user from list. Own-row actions disabled.

---

## Phase 8: User Story 6 — Settings Page (Priority: P3)

**Goal**: Settings page shows account info and logout; bottom navigation "All" / "Settings" works on all pages.

**Independent Test**: Tap "Settings" → settings page with name/email visible and logout button. Tap "All" → notes list. Logout → login screen.

### Implementation for User Story 6

- [ ] T044 [US6] Create `src/pages/settings.html` — account info section (`<p id="user-email">`, `<p id="user-name">`); `<button id="logout-btn">`; bottom nav bar; imports `src/js/settings.js`
- [ ] T045 [US6] Create `src/css/settings.css` — settings card layout, account info block, logout button styling
- [ ] T046 [US6] Implement `src/js/settings.js` — on load call `initClerk()` + `guardAuth()`; populate `#user-email` and `#user-name` from `clerk.user`; `#logout-btn` click calls `clerk.signOut()` then redirects to `index.html`
- [ ] T047 [US6] Add bottom navigation bar HTML to `src/pages/notes.html`, `src/pages/note.html`, `src/pages/admin.html`, and `src/pages/settings.html` — `<nav role="navigation" aria-label="Main">` with "All" link (`href="../pages/notes.html"`) and "Settings" link (`href="../pages/settings.html"`); active state driven by current page filename

**Checkpoint**: All pages have working bottom nav. Settings shows account info. Logout ends session and redirects to login.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Finalise deployment, accessibility, and quality gates.

- [ ] T048 [P] Write `Dockerfile` — multi-stage: `FROM node:22-alpine AS builder`: COPY all, `npm ci`, `npm run build`; `FROM node:22-alpine AS runtime`: COPY `dist/` from builder, COPY `server/`, COPY `package.json`, `npm ci --omit=dev`, `EXPOSE 3000`, `CMD ["node", "server/index.js"]`; `VOLUME ["/app/data"]`
- [ ] T049 [P] Create `scripts/set-admin.mjs` — ESM script: read `userId` from `process.argv[2]`, call `clerkClient.users.updateUser(userId, { publicMetadata: { role: 'admin' } })`, print confirmation; used once to bootstrap the first admin
- [ ] T050 [P] Add WCAG aria attributes throughout — `#score` slider: `role="slider"`, `aria-label="Wellbeing score"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="10"`; `#action-menu`: `role="menu"`, `aria-expanded`; bottom nav: `aria-current="page"` on active link; verify focus indicators visible in `tokens.css`
- [ ] T051 [P] Write unit tests for auth middleware in `tests/unit/auth.test.js` — valid token sets `req.auth`; missing token returns 401; invalid token returns 401; admin token sets `role='admin'`
- [ ] T052 [P] Write integration test for note CRUD flow in `tests/integration/note-flow.test.js` — create note, retrieve it, update score and body, search and find it, delete it, confirm 404
- [ ] T053 Run ESLint across all JS (`src/js/`, `server/`) — fix all violations including complexity > 10 before marking done
- [ ] T054 Run all items in `specs/001-wellbeing-notes/quickstart.md` validation checklist manually (or via Playwright) and confirm each passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **blocks all user stories**
- **Phases 3–8 (User Stories)**: All depend on Phase 2 completion; can then proceed in priority order or in parallel if staffed
- **Phase 9 (Polish)**: Depends on all user stories complete

### User Story Dependencies

- **US1 Login (P1)**: No dependency on other stories — first story to complete
- **US2 Notes List (P1)**: Depends on US1 (auth guard must work); login required to reach notes
- **US3 Create/Edit (P1)**: Depends on US2 (editor is reached from the notes list)
- **US4 Delete (P2)**: Depends on US3 (delete lives inside the note editor)
- **US5 Admin (P2)**: Depends only on Foundational phase — can be developed in parallel with US2/US3
- **US6 Settings (P3)**: Depends on US1 (auth); bottom nav added to pages from US2/US3/US5

### Within Each User Story

- Contract tests MUST be written and confirmed to FAIL before implementation begins
- Backend route before frontend page
- Page HTML before page JS
- CSS can be developed in parallel with JS

### Parallel Opportunities

- All Phase 1 tasks marked [P] can run simultaneously
- T008 (db.js) and T009–T016 (middleware, frontend foundation) can run in parallel
- US5 (admin) can be developed concurrently with US2 + US3 once Phase 2 is complete
- All Polish tasks marked [P] can run simultaneously

---

## Parallel Example: Phase 2 Foundational

```bash
# These can all run at the same time (different files):
Task: T009 — server/middleware/auth.js
Task: T010 — server/middleware/require-admin.js
Task: T011 — server/routes/health.js
Task: T013 — src/css/tokens.css
Task: T014 — src/css/main.css
Task: T015 — src/js/api.js
Task: T016 — src/js/clerk-init.js
Task: T017 — tests/unit/db.test.js

# T008 (db.js) must run first — T012 (server/index.js) depends on it
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3 only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 — Login
4. Complete Phase 4: US2 — Notes List
5. Complete Phase 5: US3 — Create/Edit Note
6. **STOP and VALIDATE**: user can log in, browse, create, and edit notes
7. Demo or deploy MVP to Sliplane

### Incremental Delivery

- MVP (US1+2+3): Core note-taking loop functional
- Add US4: Users can delete notes
- Add US5: Admin can manage users
- Add US6: Navigation and settings complete
- Phase 9: Production-ready (Docker, accessibility, full test suite)

---

## Notes

- `[P]` = different files, no blocking dependencies — safe to parallelise
- `[USn]` = maps task to user story for traceability
- Contract tests MUST fail before implementation (Red-Green-Refactor per constitution)
- `better-sqlite3` is synchronous — do not mix with `async/await` inside transactions
- `VITE_CLERK_PUBLISHABLE_KEY` is baked into the frontend at `vite build` time — changing it requires a rebuild
- Sliplane: server MUST bind to `0.0.0.0`; volume mount path MUST be `/app/data`
- Admin isolation: `clerk-init.js` redirects admins at login; no navigation path leads from admin to note content
