/**
 * Frontend auth adapter loader.
 * Selects the adapter based on VITE_AUTH_PROVIDER env var (default: 'local').
 *
 * Exports: initAuth, getUser, getToken, guardAuth, mountLoginUI, signOut
 */
const provider = import.meta.env.VITE_AUTH_PROVIDER ?? 'local'
const adapter  = await import(`./auth/${provider}.js`)

export const {
  initAuth,
  getUser,
  getToken,
  guardAuth,
  mountLoginUI,
  signOut,
} = adapter
