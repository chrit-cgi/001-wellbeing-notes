# Quickstart: beingc

**Branch**: `001-wellbeing-notes` | **Date**: 2026-03-30

---

## Prerequisites

- Node.js 22+
- npm 10+
- A Clerk account at https://clerk.com (free tier is sufficient)
- Docker (for containerised local testing or Sliplane deployment)

---

## 1. Clerk Setup (one-time)

1. Create a new application in the Clerk Dashboard.
2. Under **Configure → JWT Templates**, add a custom template named `default` with the extra claim:
   ```json
   { "metadata": "{{user.public_metadata}}" }
   ```
   This injects the user's role into every session token.
3. Copy the **Publishable Key** (`pk_test_...`) and **Secret Key** (`sk_test_...`) from the API Keys page.
4. To designate the first admin, run from the project root after setting up your `.env`:
   ```sh
   node scripts/set-admin.mjs <clerk-user-id>
   ```
   (This script calls `clerkClient.users.updateUser(id, { publicMetadata: { role: 'admin' } })`.)

---

## 2. Local Development

```sh
# Clone and install
git clone <repo-url>
cd beingc
npm install

# Configure environment
cp .env.example .env
# Edit .env — fill in VITE_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY

# Start both Vite dev server (port 5173) and Node API server (port 3000)
npm run dev
```

Open http://localhost:5173 in a mobile-size browser window (DevTools → device emulation recommended).

The Vite proxy forwards all `/api/*` requests to `http://localhost:3000`. The SQLite database is created automatically at `./data/db.sqlite` on first run.

---

## 3. Production Build (local test)

```sh
npm run build          # Vite builds frontend → dist/
npm run start          # Node serves dist/ + API on port 3000
```

Open http://localhost:3000.

---

## 4. Docker (local)

```sh
# Build image
docker build -t wellbeing-notes .

# Run with a named volume for SQLite persistence
docker run -p 3000:3000 \
  -e VITE_CLERK_PUBLISHABLE_KEY=pk_... \
  -e CLERK_SECRET_KEY=sk_... \
  -v wellbeing-data:/app/data \
  wellbeing-notes
```

Open http://localhost:3000.

---

## 5. Sliplane Deployment

1. Push this repository to GitHub.
2. In Sliplane UI: **Create Service** → connect the GitHub repo → select the Dockerfile.
3. Set environment variables in the Sliplane UI:
   - `VITE_CLERK_PUBLISHABLE_KEY` = your Clerk publishable key
   - `CLERK_SECRET_KEY` = your Clerk secret key
   - `PORT` = `3000` (optional — Sliplane auto-detects from `EXPOSE`)
4. Under **Volumes**: create a new volume and set the container mount path to `/app/data`.
5. Deploy. Sliplane builds the image, mounts the volume, and routes HTTPS traffic to port 3000.

> **Note**: The `VITE_CLERK_PUBLISHABLE_KEY` is embedded into the frontend bundle at build time by Vite. If you need to change it, redeploy (trigger a new build).

---

## 6. Environment Variables Reference

| Variable | Used by | Description |
|----------|---------|-------------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Vite build | Clerk publishable key — baked into the frontend bundle |
| `CLERK_SECRET_KEY` | Node server | Clerk secret key — backend only, never exposed to browser |
| `PORT` | Node server | HTTP port. Default: `3000`. Sliplane may override via env. |
| `DATABASE_PATH` | Node server | Path to SQLite file. Default: `/app/data/db.sqlite` (production) or `./data/db.sqlite` (development). |

---

## 7. Validation Checklist

Run through these after any deployment to confirm the app is working:

- [ ] Login screen appears when visiting the app unauthenticated.
- [ ] Logging in with valid credentials lands on the notes list.
- [ ] Logging in with invalid credentials shows an error message.
- [ ] Notes list shows date and two-line preview per note.
- [ ] Search bar filters notes in real time.
- [ ] Creating a new note: slider defaults to 5, date is today.
- [ ] Saving a note persists text and score; note appears in the list.
- [ ] Deleting a note requires confirmation and removes it from the list.
- [ ] Wellbeing slider is operable with a single thumb (test at 375 px viewport width).
- [ ] Offline banner appears when network is disconnected; save is blocked.
- [ ] Bottom nav "All" and "Settings" navigate correctly.
- [ ] Settings page shows account info and a logout button.
- [ ] Logging in as admin lands on the user management page.
- [ ] Admin can create, deactivate, reactivate, and delete users.
- [ ] A deactivated user cannot log in and sees an explanatory message.
- [ ] SQLite file persists across container restarts (volume is mounted correctly).
