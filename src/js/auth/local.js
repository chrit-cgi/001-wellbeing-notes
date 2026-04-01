/**
 * Frontend local auth adapter — session cookie based.
 * Works with AUTH_PROVIDER=local on the server.
 * The session cookie is sent automatically by the browser on every request.
 */

let _user = null

/** Fetch current session state from the server. */
export async function initAuth() {
  try {
    const res = await fetch('/api/auth/me')
    _user = res.ok ? await res.json() : null
  } catch {
    _user = null
  }
}

/** Return the current user object or null. */
export function getUser() {
  return _user
}

/**
 * Session cookie is attached automatically — no explicit token needed.
 * Returning null causes api.js to omit the Authorization header, which is correct.
 */
export async function getToken() {
  return null
}

/**
 * Redirect guard. Call at the top of every protected page after initAuth().
 * @param {{ requireAdmin?: boolean }} opts
 */
export function guardAuth(opts = {}) {
  if (!_user) {
    window.location.replace('/pages/login.html')
    return
  }
  if (opts.requireAdmin && _user.role !== 'admin') {
    window.location.replace('/pages/notes.html')
  }
}

/**
 * Render a plain login form into the given element.
 * On success redirects to the appropriate page based on role.
 */
export function mountLoginUI(element) {
  element.innerHTML = `
    <form id="login-form" class="login-form">
      <div class="form-field">
        <label for="login-email">Email</label>
        <input type="email" id="login-email" name="email" required autocomplete="email" />
      </div>
      <div class="form-field">
        <label for="login-password">Password</label>
        <input type="password" id="login-password" name="password" required autocomplete="current-password" />
      </div>
      <p class="form-error" id="login-error" hidden></p>
      <button type="submit" class="btn btn-primary">Sign in</button>
    </form>
  `

  const form    = element.querySelector('#login-form')
  const errorEl = element.querySelector('#login-error')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    errorEl.hidden = true
    const btn = form.querySelector('button[type=submit]')
    btn.disabled = true

    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: form.email.value, password: form.password.value }),
      })
      const data = await res.json()
      if (!res.ok) {
        errorEl.textContent = data.error
        errorEl.hidden = false
        btn.disabled = false
        return
      }
      window.location.replace(data.role === 'admin' ? '/pages/admin.html' : '/pages/notes.html')
    } catch {
      errorEl.textContent = 'Connection error — please try again'
      errorEl.hidden = false
      btn.disabled = false
    }
  })
}

/** Sign out and redirect to login. */
export async function signOut() {
  await fetch('/api/auth/logout', { method: 'POST' })
  window.location.replace('/pages/login.html')
}
