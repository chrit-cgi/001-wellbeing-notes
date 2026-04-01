/**
 * Note editor page — load, edit, save, delete, discard.
 */
import { initAuth, guardAuth } from './auth.js'
import { api } from './api.js'

await initAuth()
guardAuth()

const bodyEl        = document.getElementById('body')
const scoreEl       = document.getElementById('score')
const dateEl        = document.getElementById('note-date')
const saveBtn       = document.getElementById('save-btn')
const offlineBanner = document.getElementById('offline-banner')
const menuBtn       = document.getElementById('menu-btn')
const actionMenu    = document.getElementById('action-menu')
const infoBtn       = document.getElementById('info-btn')
const infoModal     = document.getElementById('info-modal')
const infoClose     = document.getElementById('info-close-btn')
const discardBtn    = document.getElementById('discard-btn')
const deleteBtn     = document.getElementById('delete-btn')
const deleteConfirm    = document.getElementById('delete-confirm')
const deleteCancelBtn  = document.getElementById('delete-cancel-btn')
const deleteConfirmBtn = document.getElementById('delete-confirm-btn')

const params  = new URLSearchParams(window.location.search)
const noteId  = params.get('id') ? Number(params.get('id')) : null
let originalBody  = ''
let originalScore = 5

function todayIso() { return new Date().toISOString().slice(0, 10) }
function updateSliderAria(value) { scoreEl.setAttribute('aria-valuenow', value) }

async function loadNote() {
  if (!noteId) {
    dateEl.textContent = todayIso()
    scoreEl.value = '5'
    updateSliderAria(5)
    return
  }
  try {
    const note = await api.get(`/api/notes/${noteId}`)
    bodyEl.value       = note.body
    scoreEl.value      = String(note.score)
    dateEl.textContent = note.date
    updateSliderAria(note.score)
    originalBody  = note.body
    originalScore = note.score
    deleteBtn.hidden = false
  } catch {
    window.location.replace('./notes.html')
  }
}

deleteBtn.hidden = true

function updateOfflineState() {
  const offline = !navigator.onLine
  offlineBanner.hidden = !offline
  saveBtn.disabled = offline
}

window.addEventListener('online',  updateOfflineState)
window.addEventListener('offline', updateOfflineState)
updateOfflineState()

scoreEl.addEventListener('input', () => updateSliderAria(scoreEl.value))

saveBtn.addEventListener('click', async () => {
  saveBtn.disabled = true
  const payload = { score: Number(scoreEl.value), body: bodyEl.value }
  try {
    if (noteId) {
      await api.patch(`/api/notes/${noteId}`, payload)
    } else {
      await api.post('/api/notes', payload)
    }
    window.location.replace('./notes.html')
  } catch (err) {
    saveBtn.disabled = false
    if (err.message !== 'offline') alert('Could not save note. Please try again.')
  }
})

infoBtn.addEventListener('click', () => infoModal.showModal())
infoClose.addEventListener('click', () => infoModal.close())

function toggleMenu(open) {
  actionMenu.hidden = !open
  menuBtn.setAttribute('aria-expanded', String(open))
}

menuBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(actionMenu.hidden) })
document.addEventListener('click', () => toggleMenu(false))
actionMenu.addEventListener('click', (e) => e.stopPropagation())

discardBtn.addEventListener('click', () => {
  bodyEl.value  = originalBody
  scoreEl.value = String(originalScore)
  updateSliderAria(originalScore)
  toggleMenu(false)
})

deleteBtn.addEventListener('click', () => { toggleMenu(false); deleteConfirm.showModal() })
deleteCancelBtn.addEventListener('click', () => deleteConfirm.close())

deleteConfirmBtn.addEventListener('click', async () => {
  deleteConfirmBtn.disabled = true
  try {
    await api.delete(`/api/notes/${noteId}`)
    window.location.replace('./notes.html')
  } catch {
    deleteConfirmBtn.disabled = false
    deleteConfirm.close()
    alert('Could not delete note. Please try again.')
  }
})

loadNote()
