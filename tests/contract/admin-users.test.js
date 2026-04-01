/**
 * T038 — Contract tests for /api/admin/users endpoints
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { initDb } from '../../server/db.js'
import { createTestUser, loginAs } from '../helpers/auth.js'

const { app } = await import('../../server/index.js')

let adminAgent
let adminUser
let targetUser

beforeAll(async () => {
  initDb(':memory:')
  adminUser  = await createTestUser({ role: 'admin' })
  targetUser = await createTestUser({ role: 'user' })
  adminAgent = await loginAs(app, adminUser)
})

describe('GET /api/admin/users', () => {
  it('returns user list for admin', async () => {
    const res = await adminAgent.get('/api/admin/users')
    expect(res.status).toBe(200)
    expect(res.body.users.length).toBeGreaterThanOrEqual(2)
  })

  it('returns 403 for non-admin', async () => {
    const nonAdminAgent = await loginAs(app, targetUser)
    const res = await nonAdminAgent.get('/api/admin/users')
    expect(res.status).toBe(403)
  })
})

describe('POST /api/admin/users', () => {
  it('creates a user and returns 201', async () => {
    const res = await adminAgent
      .post('/api/admin/users')
      .send({ email: 'newuser@example.com', password: 'Pass1234!', firstName: 'New' })
    expect(res.status).toBe(201)
    expect(res.body.email).toBe('newuser@example.com')
    expect(res.body.role).toBe('user')
    expect(res.body.active).toBe(true)
  })

  it('returns 400 when email is missing', async () => {
    const res = await adminAgent
      .post('/api/admin/users')
      .send({ password: 'Pass1234!' })
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/admin/users/:userId', () => {
  it('returns 400 when admin tries to modify own account', async () => {
    const res = await adminAgent
      .patch(`/api/admin/users/${adminUser.userId}`)
      .send({ active: false })
    expect(res.status).toBe(400)
  })

  it('deactivates user when active: false', async () => {
    const res = await adminAgent
      .patch(`/api/admin/users/${targetUser.userId}`)
      .send({ active: false })
    expect(res.status).toBe(200)
    expect(res.body.active).toBe(false)
  })
})

describe('DELETE /api/admin/users/:userId', () => {
  it('returns 400 when admin tries to delete own account', async () => {
    const res = await adminAgent.delete(`/api/admin/users/${adminUser.userId}`)
    expect(res.status).toBe(400)
  })

  it('deletes user and returns 204', async () => {
    const extra = await createTestUser()
    const res   = await adminAgent.delete(`/api/admin/users/${extra.userId}`)
    expect(res.status).toBe(204)
  })
})
