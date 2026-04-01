/**
 * Local auth adapter — express-session + bcryptjs.
 * Used when AUTH_PROVIDER=local (development on Chromebook / any machine).
 * Sessions are stored in memory and lost on server restart (acceptable for dev).
 */
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { getDb } from '../db.js'

/** Express middleware: reads session, sets req.auth or returns 401. */
export async function attachAuth(req, res, next) {
  const userId = req.session?.userId
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const user = getDb()
    .prepare('SELECT role, active FROM users WHERE id = ?')
    .get(userId)

  if (!user || !user.active) {
    req.session.destroy(() => {})
    return res.status(401).json({ error: 'Unauthorized' })
  }

  req.auth = { userId, role: user.role }
  next()
}

/** Create a new user. Returns { userId }. */
export async function createUser({ email, password, firstName = '', lastName = '', role = 'user' }) {
  const id = randomUUID()
  const passwordHash = await bcrypt.hash(password, 12)
  const now = new Date().toISOString()
  getDb().prepare(`
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `).run(id, email, passwordHash, firstName, lastName, role, now)
  return { userId: id }
}

/** Return a single user by id, or null. */
export async function getUser(userId) {
  const row = getDb()
    .prepare('SELECT id, email, first_name, last_name, role, active FROM users WHERE id = ?')
    .get(userId)
  return row ? formatUser(row) : null
}

/** Return all users, optionally filtered by q. */
export async function listUsers(q) {
  const db = getDb()
  const rows = q
    ? db.prepare(`
        SELECT id, email, first_name, last_name, role, active FROM users
        WHERE email LIKE ? OR first_name LIKE ? OR last_name LIKE ?
        ORDER BY created_at DESC
      `).all(`%${q}%`, `%${q}%`, `%${q}%`)
    : db.prepare(
        'SELECT id, email, first_name, last_name, role, active FROM users ORDER BY created_at DESC'
      ).all()
  return rows.map(formatUser)
}

/** Partial update of mutable user fields. */
export async function updateUser(userId, { firstName, lastName, email }) {
  const fields = []
  const values = []
  if (firstName !== undefined) { fields.push('first_name = ?'); values.push(firstName) }
  if (lastName  !== undefined) { fields.push('last_name = ?');  values.push(lastName)  }
  if (email     !== undefined) { fields.push('email = ?');      values.push(email)     }
  if (!fields.length) return
  values.push(userId)
  getDb().prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values)
}

/** Set active flag immediately (blocks login when false). */
export async function setUserActive(userId, active) {
  getDb().prepare('UPDATE users SET active = ? WHERE id = ?').run(active ? 1 : 0, userId)
}

/** Delete user and all their notes. */
export async function deleteUser(userId) {
  const db = getDb()
  db.prepare('DELETE FROM notes WHERE user_id = ?').run(userId)
  db.prepare('DELETE FROM users WHERE id = ?').run(userId)
}

// ── internal helpers ──────────────────────────────────────────────────────────

function formatUser(row) {
  return {
    userId:    row.id,
    email:     row.email,
    firstName: row.first_name,
    lastName:  row.last_name,
    role:      row.role,
    active:    !!row.active,
  }
}
