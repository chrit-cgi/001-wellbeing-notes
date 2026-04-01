/**
 * Auth adapter loader.
 * Selects the adapter based on AUTH_PROVIDER env var (default: 'local').
 *
 * Supported values:
 *   local  — express-session + bcryptjs (development, no external services)
 *   clerk  — Clerk SDK (production on Sliplane)
 */
const provider = process.env.AUTH_PROVIDER ?? 'local'
const adapter  = await import(`./${provider}.js`)

export const {
  attachAuth,
  createUser,
  getUser,
  listUsers,
  updateUser,
  setUserActive,
  deleteUser,
} = adapter
