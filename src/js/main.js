/**
 * Entry point — auth guard only.
 * Initialises auth and redirects to the correct page.
 */
import { initAuth, getUser } from './auth.js'

await initAuth()

const user = getUser()
if (user) {
  window.location.replace(user.role === 'admin' ? '/pages/admin.html' : '/pages/notes.html')
} else {
  window.location.replace('/pages/login.html')
}
