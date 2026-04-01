#!/usr/bin/env node
/**
 * One-shot script: promote a Clerk user to admin role.
 *
 * Usage:
 *   node scripts/set-admin.mjs <clerk-user-id>
 *
 * Requires CLERK_SECRET_KEY in environment (or .env file loaded externally).
 */
import { createClerkClient } from '@clerk/backend'

const userId = process.argv[2]

if (!userId) {
  console.error('Usage: node scripts/set-admin.mjs <clerk-user-id>')
  process.exit(1)
}

if (!process.env.CLERK_SECRET_KEY) {
  console.error('Error: CLERK_SECRET_KEY environment variable is not set.')
  process.exit(1)
}

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

try {
  await clerkClient.users.updateUser(userId, {
    publicMetadata: { role: 'admin' },
  })
  console.log(`✓ User ${userId} is now an admin.`)
  console.log('Remember to configure the JWT Claims editor in Clerk Dashboard if not already done.')
} catch (err) {
  console.error(`Error: ${err.message}`)
  process.exit(1)
}
