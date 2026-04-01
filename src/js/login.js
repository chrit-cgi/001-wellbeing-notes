/**
 * Login page — mounts the auth provider's login UI.
 * Redirects already-signed-in users away immediately.
 */
import { initAuth, getUser, mountLoginUI } from './auth.js'

await initAuth()

const user = getUser()
if (user) {
  window.location.replace(user.role === 'admin' ? '/pages/admin.html' : '/pages/notes.html')
} else {
  mountLoginUI(document.getElementById('sign-in'))
}
