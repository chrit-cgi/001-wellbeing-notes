/**
 * Singleton Clerk backend client.
 * Import clerkClient wherever Clerk API calls are needed.
 */
import { createClerkClient } from '@clerk/backend'

// In DEV_BYPASS_AUTH mode no Clerk API calls are made, so we skip
// instantiation to avoid errors from missing/placeholder keys.
export const clerkClient = process.env.DEV_BYPASS_AUTH === 'true'
  ? null
  : createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
