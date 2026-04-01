/**
 * T023 — Contract tests for GET /api/notes
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

  const now = new Date().toISOString()
  getDb().prepare(
    'INSERT INTO notes (user_id, date, score, body, created_at, updated_at) VALUES (?,?,?,?,?,?)'
  ).run(userId, '2026-03-31', 7, 'First line\nSecond line\nThird line', now, now)
  getDb().prepare(
    'INSERT INTO notes (user_id, date, score, body, created_at, updated_at) VALUES (?,?,?,?,?,?)'
  ).run(userId, '2026-03-30', 4, 'Another note here', now, now)
  getDb().prepare(
    'INSERT INTO notes (user_id, date, score, body, created_at, updated_at) VALUES (?,?,?,?,?,?)'
  ).run('other-user-id', '2026-03-31', 5, 'Other user note', now, now)
})

describe('GET /api/notes', () => {
  it('returns notes for the authenticated user only', async () => {
    const res = await agent.get('/api/notes')
    expect(res.status).toBe(200)
    expect(res.body.notes).toHaveLength(2)
    res.body.notes.forEach(n => expect(n.user_id).toBeUndefined())
  })

  it('returns notes in reverse-chronological order', async () => {
    const res   = await agent.get('/api/notes')
    const dates = res.body.notes.map(n => n.date)
    expect(dates[0] >= dates[1]).toBe(true)
  })

  it('returns preview (max 2 lines) not full body', async () => {
    const res   = await agent.get('/api/notes')
    const first = res.body.notes[0]
    expect(first.preview.split('\n').length).toBeLessThanOrEqual(2)
    expect(first.body).toBeUndefined()
  })

  it('filters notes with ?q search term', async () => {
    const res = await agent.get('/api/notes?q=Another')
    expect(res.status).toBe(200)
    expect(res.body.notes).toHaveLength(1)
    expect(res.body.notes[0].preview).toContain('Another')
  })

  it('returns empty result when search yields no matches', async () => {
    const res = await agent.get('/api/notes?q=xxxxnotfound')
    expect(res.status).toBe(200)
    expect(res.body.notes).toHaveLength(0)
    expect(res.body.total).toBe(0)
  })

  it('returns 401 without a session', async () => {
    const { default: request } = await import('supertest')
    const res = await request(app).get('/api/notes')
    expect(res.status).toBe(401)
  })
})
