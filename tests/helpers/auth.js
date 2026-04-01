/**
 * Shared test helpers for authentication.
 * Creates real users in the test database and returns authenticated supertest agents.
 */
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { getDb } from '../../server/db.js'

/**
 * Insert a user directly into the test database.
 * Uses bcrypt cost factor 1 for speed in tests.
 */
export async function createTestUser({
  role     = 'user',
  email    = `test-${randomUUID()}@example.com`,
  password = 'TestPass1!',
  active   = true,
} = {}) {
  const id   = randomUUID()
  const hash = await bcrypt.hash(password, 1)
  const now  = new Date().toISOString()
  getDb().prepare(`
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, active, created_at)
    VALUES (?, ?, ?, 'Test', 'User', ?, ?, ?)
  `).run(id, email, hash, role, active ? 1 : 0, now)
  return { userId: id, email, password, role, active }
}

/**
 * Log in and return a supertest agent with the session cookie attached.
 */
export async function loginAs(app, { email, password }) {
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ email, password })
  return agent
}
