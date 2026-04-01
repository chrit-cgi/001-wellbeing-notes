/**
 * T017 — Unit tests for server/db.js
 * Uses an in-memory SQLite database.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { initDb } from '../../server/db.js'

function freshDb() {
  return initDb(':memory:')
}

describe('db schema', () => {
  it('creates the notes table', () => {
    const db = freshDb()
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='notes'"
    ).get()
    expect(row.name).toBe('notes')
  })

  it('creates the notes_fts virtual table', () => {
    const db = freshDb()
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='notes_fts'"
    ).get()
    expect(row).toBeTruthy()
  })

  it('uses memory journal mode for :memory: database', () => {
    const db = freshDb()
    const row = db.prepare('PRAGMA journal_mode').get()
    // In-memory databases use 'memory' mode (WAL is skipped for :memory:)
    expect(row.journal_mode).toBe('memory')
  })
})

describe('notes CRUD', () => {
  let db

  beforeEach(() => { db = freshDb() })

  function insert(overrides = {}) {
    const now = new Date().toISOString()
    const result = db.prepare(`
      INSERT INTO notes (user_id, date, score, body, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      overrides.user_id ?? 'user_1',
      overrides.date ?? '2026-03-31',
      overrides.score ?? 5,
      overrides.body ?? 'Hello world',
      now, now
    )
    return result.lastInsertRowid
  }

  it('inserts and retrieves a note', () => {
    const id = insert()
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id)
    expect(note.body).toBe('Hello world')
    expect(note.score).toBe(5)
  })

  it('updates a note', () => {
    const id = insert()
    db.prepare('UPDATE notes SET body = ? WHERE id = ?').run('Updated', id)
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id)
    expect(note.body).toBe('Updated')
  })

  it('deletes a note', () => {
    const id = insert()
    db.prepare('DELETE FROM notes WHERE id = ?').run(id)
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id)
    expect(note).toBeUndefined()
  })

  it('rejects score out of range', () => {
    expect(() => {
      db.prepare(
        'INSERT INTO notes (user_id, date, score, body, created_at, updated_at) VALUES (?,?,?,?,?,?)'
      ).run('u1', '2026-01-01', 11, '', 'n', 'n')
    }).toThrow()
  })
})

describe('FTS search', () => {
  let db

  beforeEach(() => { db = freshDb() })

  it('finds a note by full-text search', () => {
    const now = new Date().toISOString()
    db.prepare(
      'INSERT INTO notes (user_id, date, score, body, created_at, updated_at) VALUES (?,?,?,?,?,?)'
    ).run('user_1', '2026-03-31', 7, 'Feeling great today', now, now)

    const rows = db.prepare(`
      SELECT n.id FROM notes n
      JOIN notes_fts f ON f.rowid = n.id
      WHERE notes_fts MATCH ?
    `).all('great')

    expect(rows.length).toBe(1)
  })

  it('does not return notes from other users in app-layer query', () => {
    const now = new Date().toISOString()
    db.prepare(
      'INSERT INTO notes (user_id, date, score, body, created_at, updated_at) VALUES (?,?,?,?,?,?)'
    ).run('user_1', '2026-03-31', 5, 'private note', now, now)

    const rows = db.prepare(`
      SELECT n.id FROM notes n
      JOIN notes_fts f ON f.rowid = n.id
      WHERE n.user_id = ? AND notes_fts MATCH ?
    `).all('user_2', 'private')

    expect(rows.length).toBe(0)
  })
})
