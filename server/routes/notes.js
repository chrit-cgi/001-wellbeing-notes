/**
 * Notes REST routes.
 * All routes are scoped to the authenticated user (req.auth.userId).
 *
 * GET    /api/notes          — list notes, optional ?q for FTS search
 * POST   /api/notes          — create a note
 * GET    /api/notes/:id      — get a single note
 * PATCH  /api/notes/:id      — update a note
 * DELETE /api/notes/:id      — delete a note
 */
import { Router } from 'express'
import { getDb } from '../db.js'

export const notesRouter = Router()

/** Extract first two non-empty lines of body text for list previews. */
function preview(body) {
  return body
    .split('\n')
    .filter(l => l.trim().length > 0)
    .slice(0, 2)
    .join('\n')
}

/** Return today's date in YYYY-MM-DD (UTC). */
function todayUtc() {
  return new Date().toISOString().slice(0, 10)
}

/** Return current UTC datetime as ISO string. */
function nowUtc() {
  return new Date().toISOString()
}

/** @type {import('express').RequestHandler} */
function validateScore(req, res, next) {
  const { score } = req.body
  if (score === undefined) return next()
  if (!Number.isInteger(score) || score < 0 || score > 10) {
    return res.status(400).json({ error: 'score must be an integer between 0 and 10' })
  }
  next()
}

// GET /api/notes
notesRouter.get('/', (req, res) => {
  const db = getDb()
  const { q, limit = 50, offset = 0 } = req.query
  const userId = req.auth.userId

  let rows

  if (q && q.trim().length > 0) {
    rows = db.prepare(`
      SELECT n.id, n.date, n.score, n.body, n.updated_at
      FROM notes n
      JOIN notes_fts f ON f.rowid = n.id
      WHERE n.user_id = ? AND notes_fts MATCH ?
      ORDER BY n.date DESC
      LIMIT ? OFFSET ?
    `).all(userId, q.trim(), Number(limit), Number(offset))
  } else {
    rows = db.prepare(`
      SELECT id, date, score, body, updated_at
      FROM notes
      WHERE user_id = ?
      ORDER BY date DESC
      LIMIT ? OFFSET ?
    `).all(userId, Number(limit), Number(offset))
  }

  const total = rows.length
  const notes = rows.map(r => ({ ...r, preview: preview(r.body), body: undefined }))

  res.json({ notes, total })
})

// POST /api/notes
notesRouter.post('/', validateScore, (req, res) => {
  const db = getDb()
  const { score = 5, body = '' } = req.body
  const userId = req.auth.userId
  const now = nowUtc()

  const result = db.prepare(`
    INSERT INTO notes (user_id, date, score, body, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, todayUtc(), score, body.trim(), now, now)

  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(note)
})

// GET /api/notes/:id
notesRouter.get('/:id', (req, res) => {
  const note = getDb().prepare(
    'SELECT * FROM notes WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.auth.userId)

  if (!note) return res.status(404).json({ error: 'Note not found' })
  res.json(note)
})

// PATCH /api/notes/:id
notesRouter.patch('/:id', validateScore, (req, res) => {
  const db = getDb()
  const existing = db.prepare(
    'SELECT * FROM notes WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.auth.userId)

  if (!existing) return res.status(404).json({ error: 'Note not found' })

  const score = req.body.score ?? existing.score
  const body = req.body.body !== undefined ? req.body.body.trim() : existing.body

  db.prepare(`
    UPDATE notes SET score = ?, body = ?, updated_at = ? WHERE id = ?
  `).run(score, body, nowUtc(), existing.id)

  const updated = db.prepare('SELECT * FROM notes WHERE id = ?').get(existing.id)
  res.json(updated)
})

// DELETE /api/notes/:id
notesRouter.delete('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare(
    'SELECT id FROM notes WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.auth.userId)

  if (!existing) return res.status(404).json({ error: 'Note not found' })

  db.prepare('DELETE FROM notes WHERE id = ?').run(existing.id)
  res.status(204).send()
})
