/**
 * Authorization middleware — restricts access to admin role.
 * Must be used after authMiddleware (req.auth must be set).
 * Returns 403 for authenticated non-admin users.
 */

/** @type {import('express').RequestHandler} */
export function requireAdmin(req, res, next) {
  if (req.auth?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  next()
}
