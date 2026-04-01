/**
 * T034 — Contract tests for DELETE /api/notes/:id
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

function insertNote(ownerId, body = 'To delete') {
  const now = new Date().toISOString()
  return getDb().prepare(
    'INSERT INTO notes (user_id, date, score, body, created_at, updated_at) VALUES (?,?,?,?,?,?)'
  ).run(ownerId, '2026-03-31', 5, body, now, now).lastInsertRowid
}

describe('DELETE /api/notes/:id', () => {
  it('deletes own note and returns 204', async () => {
    const id  = insertNote(userId)
    const res = await agent.delete(`/api/notes/${id}`)
    expect(res.status).toBe(204)
  })

  it('returns 404 after deletion', async () => {
    const id = insertNote(userId)
    await agent.delete(`/api/notes/${id}`)
    const res = await agent.get(`/api/notes/${id}`)
    expect(res.status).toBe(404)
  })

  it("returns 404 when deleting another user's note", async () => {
    const id  = insertNote('other-user-id')
    const res = await agent.delete(`/api/notes/${id}`)
    expect(res.status).toBe(404)
  })
})
