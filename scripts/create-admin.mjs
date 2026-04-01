#!/usr/bin/env node
/**
 * Bootstrap script: create the first admin user in the local database.
 * Run once after first deployment or on a fresh database.
 *
 * Usage:
 *   node --env-file=.env scripts/create-admin.mjs <email> <password>
 *
 * Example:
 *   node --env-file=.env scripts/create-admin.mjs admin@example.com MySecurePass1!
 */
import { initDb } from '../server/db.js'
import { createUser } from '../server/auth/local.js'

const [email, password] = process.argv.slice(2)

if (!email || !password) {
  console.error('Usage: node --env-file=.env scripts/create-admin.mjs <email> <password>')
  process.exit(1)
}

initDb(process.env.DATABASE_PATH ?? './data/db.sqlite')

try {
  const { userId } = await createUser({ email, password, role: 'admin' })
  console.log(`Admin user created: ${email} (id: ${userId})`)
} catch (err) {
  console.error(`Error: ${err.message}`)
  process.exit(1)
}
