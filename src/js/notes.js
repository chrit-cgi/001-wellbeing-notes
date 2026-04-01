/**
 * Notes list page — fetch, render, search.
 */
import { initAuth, guardAuth, signOut } from './auth.js'
import { api } from './api.js'

await initAuth()
guardAuth()

const listEl    = document.getElementById('notes-list')
const emptyEl   = document.getElementById('empty-state')
const skelEl    = document.getElementById('skeleton-list')
const searchEl  = document.getElementById('search')
const newBtn    = document.getElementById('new-note-btn')
const menuBtn   = document.getElementById('menu-btn')
const actionMenu = document.getElementById('action-menu')

function toggleMenu(open) {
  actionMenu.hidden = !open
  menuBtn.setAttribute('aria-expanded', String(open))
}

menuBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(actionMenu.hidden) })
document.addEventListener('click', () => toggleMenu(false))
actionMenu.addEventListener('click', (e) => e.stopPropagation())
document.getElementById('signout-btn').addEventListener('click', () => signOut())

/** Interpolate score (0–10) to a brown→yellow hsl colour. */
function scoreColor(score) {
  const h = 25 + (score / 10) * 23
  const s = 70 + (score / 10) * 30
  const l = 30 + (score / 10) * 20
  return `hsl(${h},${s}%,${l}%)`
}

function renderCard(note) {
  const li  = document.createElement('li')
  const btn = document.createElement('button')
  btn.className = 'note-card'
  btn.setAttribute('aria-label', `Note from ${note.date}`)

  const dateLine = document.createElement('div')
  dateLine.className = 'note-card-date'

  const badge = document.createElement('span')
  badge.className = 'score-badge'
  badge.textContent = note.score
  badge.style.setProperty('--score-color', scoreColor(note.score))
  badge.setAttribute('aria-label', `Wellbeing score ${note.score}`)

  dateLine.appendChild(badge)
  dateLine.appendChild(document.createTextNode(note.date))

  const previewEl = document.createElement('div')
  previewEl.className = 'note-card-preview'
  previewEl.textContent = note.preview || '(empty note)'

  btn.appendChild(dateLine)
  btn.appendChild(previewEl)
  btn.addEventListener('click', () => { window.location.href = `./note.html?id=${note.id}` })

  li.appendChild(btn)
  return li
}

async function loadNotes(q = '') {
  skelEl.hidden = false
  emptyEl.hidden = true
  listEl.innerHTML = ''

  try {
    const url = q.trim() ? `/api/notes?q=${encodeURIComponent(q.trim())}` : '/api/notes'
    const { notes } = await api.get(url)
    skelEl.hidden = true
    if (notes.length === 0) { emptyEl.hidden = false; return }
    notes.forEach(n => listEl.appendChild(renderCard(n)))
  } catch (err) {
    skelEl.hidden = true
    if (err.message !== 'offline') emptyEl.hidden = false
  }
}

let debounceTimer
searchEl.addEventListener('input', () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => loadNotes(searchEl.value), 300)
})

newBtn.addEventListener('click', () => { window.location.href = './note.html' })

loadNotes()
