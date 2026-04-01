/**
 * Settings page — display account info and logout.
 */
import { initAuth, guardAuth, getUser, signOut } from './auth.js'

await initAuth()
guardAuth()

const nameEl   = document.getElementById('user-name')
const emailEl  = document.getElementById('user-email')
const logoutBtn = document.getElementById('logout-btn')

const user = getUser()
if (user) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ')
  nameEl.textContent  = name || '—'
  emailEl.textContent = user.email ?? '—'
}

logoutBtn.addEventListener('click', async () => {
  logoutBtn.disabled = true
  await signOut()
})
