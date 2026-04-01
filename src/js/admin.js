/**
 * Admin page — user management (list, create, edit, activate/deactivate, delete).
 */
import { initAuth, guardAuth, getUser, signOut } from './auth.js'
import { api } from './api.js'

await initAuth()
guardAuth({ requireAdmin: true })

const skelEl     = document.getElementById('skeleton-list')
const emptyEl    = document.getElementById('empty-state')
const tableEl    = document.getElementById('user-table')
const tbodyEl    = document.getElementById('user-tbody')
const createBtn  = document.getElementById('create-user-btn')
const userForm   = document.getElementById('user-form')
const formTitle  = document.getElementById('form-title')
const formEl     = document.getElementById('user-form-el')
const fFirst     = document.getElementById('f-first')
const fLast      = document.getElementById('f-last')
const fEmail     = document.getElementById('f-email')
const fPassword  = document.getElementById('f-password')
const pwField    = document.getElementById('password-field')
const formError  = document.getElementById('form-error')
const formCancel = document.getElementById('form-cancel-btn')
const formSubmit = document.getElementById('form-submit-btn')
const deleteDialog     = document.getElementById('delete-confirm')
const deleteMsg        = document.getElementById('delete-confirm-msg')
const deleteCancelBtn  = document.getElementById('delete-cancel-btn')
const deleteConfirmBtn = document.getElementById('delete-confirm-btn')

let editingUserId  = null
let pendingDeleteId = null
const selfId = getUser().userId

function statusBadge(active) {
  const span = document.createElement('span')
  span.className = `status-badge status-badge--${active ? 'active' : 'inactive'}`
  span.textContent = active ? 'Active' : 'Inactive'
  return span
}

function actionBtn(label, cls, handler, disabled = false) {
  const btn = document.createElement('button')
  btn.className = `action-btn ${cls}`
  btn.textContent = label
  btn.disabled = disabled
  btn.addEventListener('click', handler)
  return btn
}

function renderRow(user) {
  const isSelf = user.userId === selfId
  const tr = document.createElement('tr')
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || '—'
  tr.innerHTML = `<td>${name}</td><td>${user.email}</td><td class="status-cell"></td><td class="row-actions"></td>`
  tr.querySelector('.status-cell').appendChild(statusBadge(user.active))
  const actions = tr.querySelector('.row-actions')
  actions.appendChild(actionBtn('Edit', '', () => openEdit(user), isSelf))
  actions.appendChild(actionBtn(
    user.active ? 'Deactivate' : 'Activate',
    user.active ? 'action-btn--danger' : '',
    () => toggleActive(user), isSelf
  ))
  actions.appendChild(actionBtn('Delete', 'action-btn--danger', () => confirmDelete(user), isSelf))
  return tr
}

async function loadUsers() {
  skelEl.hidden = false
  tableEl.hidden = true
  emptyEl.hidden = true
  try {
    const { users } = await api.get('/api/admin/users')
    skelEl.hidden = true
    if (users.length === 0) { emptyEl.hidden = false; return }
    tbodyEl.innerHTML = ''
    users.forEach(u => tbodyEl.appendChild(renderRow(u)))
    tableEl.hidden = false
  } catch {
    skelEl.hidden = true
    emptyEl.hidden = false
  }
}

async function toggleActive(user) {
  try {
    await api.patch(`/api/admin/users/${user.userId}`, { active: !user.active })
    loadUsers()
  } catch (err) { alert(err.message) }
}

function confirmDelete(user) {
  pendingDeleteId = user.userId
  deleteMsg.textContent = `Delete ${user.email}? This will permanently remove their account and all notes.`
  deleteDialog.showModal()
}

deleteCancelBtn.addEventListener('click', () => { deleteDialog.close(); pendingDeleteId = null })

deleteConfirmBtn.addEventListener('click', async () => {
  if (!pendingDeleteId) return
  deleteConfirmBtn.disabled = true
  try {
    await api.delete(`/api/admin/users/${pendingDeleteId}`)
    deleteDialog.close()
    pendingDeleteId = null
    loadUsers()
  } catch (err) {
    alert(err.message)
  } finally {
    deleteConfirmBtn.disabled = false
  }
})

function resetForm() {
  formEl.reset()
  formError.hidden = true
  formError.textContent = ''
  editingUserId = null
}

function openCreate() {
  resetForm()
  formTitle.textContent = 'New user'
  pwField.hidden = false
  fPassword.required = true
  formSubmit.textContent = 'Create'
  userForm.showModal()
}

function openEdit(user) {
  resetForm()
  editingUserId = user.userId
  formTitle.textContent = 'Edit user'
  fFirst.value = user.firstName
  fLast.value  = user.lastName
  fEmail.value = user.email
  fEmail.disabled = true
  pwField.hidden = true
  fPassword.required = false
  formSubmit.textContent = 'Save'
  userForm.showModal()
}

document.getElementById('logout-btn').addEventListener('click', () => signOut())
createBtn.addEventListener('click', openCreate)
formCancel.addEventListener('click', () => { userForm.close(); resetForm() })

formEl.addEventListener('submit', async (e) => {
  e.preventDefault()
  formError.hidden = true
  formSubmit.disabled = true
  try {
    if (editingUserId) {
      await api.patch(`/api/admin/users/${editingUserId}`, { firstName: fFirst.value, lastName: fLast.value })
    } else {
      await api.post('/api/admin/users', { email: fEmail.value, password: fPassword.value, firstName: fFirst.value, lastName: fLast.value })
    }
    userForm.close()
    resetForm()
    loadUsers()
  } catch (err) {
    formError.textContent = err.message
    formError.hidden = false
  } finally {
    fEmail.disabled = false
    formSubmit.disabled = false
  }
})

loadUsers()
