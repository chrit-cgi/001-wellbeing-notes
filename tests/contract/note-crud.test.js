/**
 * T029 — Contract tests for POST, GET /:id, PATCH /:id
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { initDb, getDb } from '../../server/db.js'
import { createTestUser, loginAs } from '../helpers/auth.js'

const { app } = await import('../../server/index.js')

let agent
let userId

beforeAll(async () => {
  initDb(':memory:')
  const user = await createTestUser()
  userId = user.userId
  agent  = await loginAs(app, user)
})

describe('POST /api/notes', () => {
  it('creates a note with default score 5', async () => {
    const res = await agent
      .post('/api/notes')
      .send({ body: 'My first note' })
    expect(res.status).toBe(201)
    expect(res.body.score).toBe(5)
    expect(res.body.body).toBe('My first note')
    expect(res.body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(res.body.user_id).toBe(userId)
  })

  it('rejects score out of range', async () => {
    const res = await agent
      .post('/api/notes')
      .send({ score: 11, body: 'bad' })
    expect(res.status).toBe(400)
  })

  it('rejects non-integer score', async () => {
    const res = await agent
      .post('/api/notes')
      .send({ score: 7.5, body: 'bad' })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/notes/:id', () => {
  it('returns the full note body', async () => {
    const now = new Date().toISOString()
    const { lastInsertRowid } = getDb().prepare(
      'INSERT INTO notes (user_id, date, score, body, created_at, updated_at) VALUES (?,?,?,?,?,?)'
    ).run(userId, '2026-03-31', 6, 'Full body text', now, now)

    const res = await agent.get(`/api/notes/${lastInsertRowid}`)
    expect(res.status).toBe(200)
    expect(res.body.body).toBe('Full body text')
  })

  it("returns 404 for another user's note", async () => {
    const now = new Date().toISOString()
    const { lastInsertRowid } = getDb().prepare(
      'INSERT INTO notes (user_id, date, score, body, created_at, updated_at) VALUES (?,?,?,?,?,?)'
    ).run('other-user-id', '2026-03-31', 5, 'Private', now, now)

    const res = await agent.get(`/api/notes/${lastInsertRowid}`)
    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/notes/:id', () => {
  it('updates score and body', async () => {
    const now = new Date().toISOString()
    const { lastInsertRowid } = getDb().prepare(
      'INSERT INTO notes (user_id, date, score, body, created_at, updated_at) VALUES (?,?,?,?,?,?)'
    ).run(userId, '2026-03-31', 5, 'Old body', now, now)

    const res = await agent
      .patch(`/api/notes/${lastInsertRowid}`)
      .send({ score: 8, body: 'New body' })
    expect(res.status).toBe(200)
    expect(res.body.score).toBe(8)
    expect(res.body.body).toBe('New body')
  })

  it('supports partial update (body only)', async () => {
    const now = new Date().toISOString()
    const { lastInsertRowid } = getDb().prepare(
      'INSERT INTO notes (user_id, date, score, body, created_at, updated_at) VALUES (?,?,?,?,?,?)'
    ).run(userId, '2026-03-31', 3, 'Original', now, now)

    const res = await agent
      .patch(`/api/notes/${lastInsertRowid}`)
      .send({ body: 'Changed only body' })
    expect(res.status).toBe(200)
    expect(res.body.score).toBe(3)
    expect(res.body.body).toBe('Changed only body')
  })
})
