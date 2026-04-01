/**
 * Auth middleware — thin re-export from the active adapter.
 * The adapter is selected by AUTH_PROVIDER env var (default: 'local').
 */
import { attachAuth } from '../auth/index.js'

export { attachAuth as authMiddleware }
