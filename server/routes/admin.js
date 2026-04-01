/**
 * Admin routes — user management via the active auth adapter.
 * All routes require admin role (enforced by requireAdmin middleware).
 *
 * GET    /api/admin/users            — list all users
 * POST   /api/admin/users            — create a user
 * PATCH  /api/admin/users/:userId    — update name/email or active status
 * DELETE /api/admin/users/:userId    — delete user and all their notes
 */
import { Router } from 'express'
import { createUser, getUser, listUsers, updateUser, setUserActive, deleteUser } from '../auth/index.js'

export const adminRouter = Router()

// GET /api/admin/users
adminRouter.get('/users', async (req, res) => {
  try {
    const users = await listUsers(req.query.q)
    res.json({ users, total: users.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/users
adminRouter.post('/users', async (req, res) => {
  const { email, password, firstName = '', lastName = '' } = req.body ?? {}
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' })
  }
  try {
    const { userId } = await createUser({ email, password, firstName, lastName, role: 'user' })
    const user = await getUser(userId)
    res.status(201).json(user)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PATCH /api/admin/users/:userId
adminRouter.patch('/users/:userId', async (req, res) => {
  const { userId } = req.params
  if (userId === req.auth.userId) {
    return res.status(400).json({ error: 'Cannot modify your own admin account' })
  }
  try {
    const { firstName, lastName, email, active } = req.body ?? {}
    await updateUser(userId, { firstName, lastName, email })
    if (active === false) await setUserActive(userId, false)
    if (active === true)  await setUserActive(userId, true)
    const user = await getUser(userId)
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// DELETE /api/admin/users/:userId
adminRouter.delete('/users/:userId', async (req, res) => {
  const { userId } = req.params
  if (userId === req.auth.userId) {
    return res.status(400).json({ error: 'Cannot delete your own admin account' })
  }
  try {
    await deleteUser(userId)
    res.status(204).send()
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})
