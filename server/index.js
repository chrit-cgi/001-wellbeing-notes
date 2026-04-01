/**
 * beingc — Express server entry point.
 * Serves the Vite-built frontend (dist/) and the REST API.
 *
 * initDb() and listen() are called only when this file is run directly,
 * NOT when imported by tests (so tests control db initialisation themselves).
 */
import express from 'express'
import session from 'express-session'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { authMiddleware } from './middleware/auth.js'
import { requireAdmin } from './middleware/require-admin.js'
import { healthRouter } from './routes/health.js'
import { notesRouter } from './routes/notes.js'
import { adminRouter } from './routes/admin.js'
import { authRouter } from './routes/auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const app = express()

app.use(express.json())

// Session middleware (used by local auth adapter; harmless when using Clerk)
app.use(session({
  secret:            process.env.SESSION_SECRET ?? 'dev-secret-change-me',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   7 * 24 * 60 * 60 * 1000,  // 7 days
  },
}))

// Static frontend (Vite build output)
app.use(express.static(join(__dirname, '..', 'dist')))

// API routes
app.use('/api/health', healthRouter)
app.use('/api/auth',   authRouter)
app.use('/api/notes',  authMiddleware, notesRouter)
app.use('/api/admin',  authMiddleware, requireAdmin, adminRouter)

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, '..', 'dist', 'index.html'), (err) => {
    if (err) res.status(404).send('Frontend not built — run npm run build')
  })
})

// Start server only when run directly (not imported by tests)
const isMain = process.argv[1] === fileURLToPath(import.meta.url)

if (isMain) {
  const { initDb } = await import('./db.js')
  const PORT = process.env.PORT ?? 3000
  initDb()
  await seedAdminIfConfigured()
  app.listen(PORT, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`beingc running on http://0.0.0.0:${PORT}`)
  })
}

async function seedAdminIfConfigured() {
  const email    = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) return

  const { getDb } = await import('./db.js')
  const { createUser } = await import('./auth/local.js')
  const db = getDb()
  const existing = db.prepare('SELECT id FROM users WHERE role = ?').get('admin')
  if (existing) return

  try {
    const { userId } = await createUser({ email, password, role: 'admin' })
    // eslint-disable-next-line no-console
    console.log(`Seeded admin user: ${email} (id: ${userId})`)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Failed to seed admin: ${err.message}`)
  }
}
