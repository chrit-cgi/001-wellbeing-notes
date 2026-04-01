/**
 * Auth routes — login, logout, session check.
 * Only mounted when AUTH_PROVIDER=local. Clerk handles its own auth flow.
 *
 * POST /api/auth/login   — exchange email+password for a session cookie
 * POST /api/auth/logout  — destroy the session
 * GET  /api/auth/me      — return current user or 401
 */
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { getDb } from '../db.js'

export const authRouter = Router()

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {}
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' })
  }

  const user = getDb()
    .prepare('SELECT id, password_hash, role, active FROM users WHERE email = ?')
    .get(email)

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  if (!user.active) {
    return res.status(403).json({ error: 'Your account is inactive — please contact the administrator' })
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  req.session.userId = user.id
  res.json({ role: user.role })
})

authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }))
})

authRouter.get('/me', (req, res) => {
  const userId = req.session?.userId
  if (!userId) return res.status(401).json({ error: 'Not authenticated' })

  const user = getDb()
    .prepare('SELECT id, email, first_name, last_name, role, active FROM users WHERE id = ?')
    .get(userId)

  if (!user || !user.active) {
    req.session.destroy(() => {})
    return res.status(401).json({ error: 'Not authenticated' })
  }

  res.json({
    userId:    user.id,
    email:     user.email,
    firstName: user.first_name,
    lastName:  user.last_name,
    role:      user.role,
  })
})
