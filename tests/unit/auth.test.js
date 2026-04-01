/**
 * T051 — Unit tests for auth middleware and require-admin middleware.
 * Tests the local adapter (AUTH_PROVIDER=local).
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { initDb } from '../../server/db.js'
import { createTestUser } from '../helpers/auth.js'

// Load middleware after db is ready
const { authMiddleware } = await import('../../server/middleware/auth.js')
const { requireAdmin }   = await import('../../server/middleware/require-admin.js')

beforeAll(() => { initDb(':memory:') })

function makeRes() {
  const res = { _status: 200, _body: null }
  res.status = (code) => { res._status = code; return res }
  res.json   = (body) => { res._body  = body;  return res }
  return res
}

describe('authMiddleware (local adapter)', () => {
  it('sets req.auth and calls next() for a valid session', async () => {
    const user = await createTestUser({ role: 'user' })
    const req  = { session: { userId: user.userId } }
    const res  = makeRes()
    const next = () => { res._nextCalled = true }

    await authMiddleware(req, res, next)

    expect(res._nextCalled).toBe(true)
    expect(req.auth).toEqual({ userId: user.userId, role: 'user' })
  })

  it('returns 401 when no session', async () => {
    const req  = { session: {} }
    const res  = makeRes()
    await authMiddleware(req, res, () => {})
    expect(res._status).toBe(401)
  })

  it('returns 401 when user is inactive', async () => {
    const user = await createTestUser({ active: false })
    const req  = { session: { userId: user.userId, destroy: (cb) => cb() } }
    const res  = makeRes()
    await authMiddleware(req, res, () => {})
    expect(res._status).toBe(401)
  })

  it('returns 401 when user does not exist', async () => {
    const req = { session: { userId: 'nonexistent-id', destroy: (cb) => cb() } }
    const res = makeRes()
    await authMiddleware(req, res, () => {})
    expect(res._status).toBe(401)
  })

  it('sets role correctly for admin user', async () => {
    const user = await createTestUser({ role: 'admin' })
    const req  = { session: { userId: user.userId } }
    const res  = makeRes()
    await authMiddleware(req, res, () => {})
    expect(req.auth.role).toBe('admin')
  })
})

describe('requireAdmin', () => {
  it('calls next() for admin', () => {
    const req  = { auth: { role: 'admin' } }
    const res  = makeRes()
    const next = () => { res._nextCalled = true }
    requireAdmin(req, res, next)
    expect(res._nextCalled).toBe(true)
  })

  it('returns 403 for non-admin', () => {
    const req  = { auth: { role: 'user' } }
    const res  = makeRes()
    requireAdmin(req, res, () => {})
    expect(res._status).toBe(403)
  })
})
