import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
    globals: false,
    env: {
      AUTH_PROVIDER:    'local',
      SESSION_SECRET:   'test-secret',
      VITE_AUTH_PROVIDER: 'local',
    },
  },
})
