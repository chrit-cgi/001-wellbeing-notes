/**
 * T052 — Integration test: full note lifecycle
 * Create → retrieve → update → search → delete → confirm gone
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { initDb } from '../../server/db.js'
import { createTestUser, loginAs } from '../helpers/auth.js'

const { app } = await import('../../server/index.js')

let agent

beforeAll(async () => {
  initDb(':memory:')
  const user = await createTestUser()
  agent = await loginAs(app, user)
})

describe('note lifecycle', () => {
  let noteId

  it('creates a note', async () => {
    const res = await agent
      .post('/api/notes')
      .send({ score: 6, body: 'Integration test note\nSecond line here' })
    expect(res.status).toBe(201)
    noteId = res.body.id
    expect(noteId).toBeDefined()
  })

  it('retrieves the created note by id', async () => {
    const res = await agent.get(`/api/notes/${noteId}`)
    expect(res.status).toBe(200)
    expect(res.body.score).toBe(6)
    expect(res.body.body).toContain('Integration test note')
  })

  it('note appears in list', async () => {
    const res = await agent.get('/api/notes')
    expect(res.status).toBe(200)
    const ids = res.body.notes.map(n => n.id)
    expect(ids).toContain(noteId)
  })

  it('updates score and body', async () => {
    const res = await agent
      .patch(`/api/notes/${noteId}`)
      .send({ score: 9, body: 'Updated integration note' })
    expect(res.status).toBe(200)
    expect(res.body.score).toBe(9)
  })

  it('search returns updated note', async () => {
    const res = await agent.get('/api/notes?q=Updated+integration')
    expect(res.status).toBe(200)
    expect(res.body.notes.some(n => n.id === noteId)).toBe(true)
  })

  it('deletes the note', async () => {
    const res = await agent.delete(`/api/notes/${noteId}`)
    expect(res.status).toBe(204)
  })

  it('note is gone after deletion', async () => {
    const res = await agent.get(`/api/notes/${noteId}`)
    expect(res.status).toBe(404)
  })

  it('note no longer appears in list', async () => {
    const res = await agent.get('/api/notes')
    const ids = res.body.notes.map(n => n.id)
    expect(ids).not.toContain(noteId)
  })
})
