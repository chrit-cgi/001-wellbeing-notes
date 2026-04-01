/**
 * Health check route — no authentication required.
 * Used by Sliplane and local readiness probes.
 */
import { Router } from 'express'

export const healthRouter = Router()

healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok' })
})
