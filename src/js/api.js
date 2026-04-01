/**
 * Fetch wrapper that attaches auth credentials to every request.
 * For the local adapter, the session cookie is sent automatically (getToken returns null).
 * For the Clerk adapter, getToken returns a JWT which is added as a Bearer header.
 *
 * Usage:
 *   import { api } from './api.js'
 *   const notes = await api.get('/api/notes')
 */
import { getToken } from './auth.js'

async function request(method, url, body) {
  if (!navigator.onLine) throw new Error('offline')

  const token   = await getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    window.location.href = '/pages/login.html'
    throw new Error('Session expired')
  }
  if (res.status === 403) throw new Error('Forbidden')
  if (res.status === 204) return null

  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Request failed')
  return data
}

export const api = {
  get:    (url)       => request('GET',    url),
  post:   (url, body) => request('POST',   url, body),
  patch:  (url, body) => request('PATCH',  url, body),
  delete: (url)       => request('DELETE', url),
}
