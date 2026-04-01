/**
 * Clerk initialisation and auth guard.
 *
 * initClerk()  — creates and loads the Clerk instance (call once per page)
 * guardAuth()  — redirects based on session state and role
 */
import { setClerk } from './api.js'

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'

const DEV_CLERK = {
  user: {
    id: 'dev-user',
    firstName: 'Dev',
    lastName: 'User',
    publicMetadata: { role: 'user' },
    primaryEmailAddress: { emailAddress: 'dev@local' },
  },
  session: { getToken: async () => 'dev-token' },
  mountSignIn: () => {},
  addListener:  () => {},
  signOut:      async () => {},
}

let _clerk = null

/** @returns {Promise<import('@clerk/clerk-js').Clerk>} */
export async function initClerk() {
  if (_clerk) return _clerk

  if (DEV_BYPASS) {
    _clerk = DEV_CLERK
    setClerk(_clerk)
    return _clerk
  }

  const { Clerk } = await import('@clerk/clerk-js')
  _clerk = new Clerk(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)
  await _clerk.load()
  setClerk(_clerk)
  return _clerk
}

/**
 * Redirect the user to the appropriate page based on session state.
 * Call after initClerk().
 *
 * @param {import('@clerk/clerk-js').Clerk} clerk
 * @param {{ requireAuth?: boolean }} [opts]
 */
export function guardAuth(clerk, opts = {}) {
  if (DEV_BYPASS) return

  const { requireAuth = true } = opts
  const isSignedIn = !!clerk.user

  if (!isSignedIn && requireAuth) {
    window.location.replace('/pages/login.html')
    return
  }

  if (isSignedIn && !requireAuth) {
    // Already signed in — redirect away from login
    const role = clerk.user.publicMetadata?.role
    window.location.replace(role === 'admin' ? '/pages/admin.html' : '/pages/notes.html')
  }
}

/** Returns 'admin' | 'user' for the signed-in user, or null if not signed in. */
export function getRole(clerk) {
  return clerk.user?.publicMetadata?.role ?? 'user'
}
