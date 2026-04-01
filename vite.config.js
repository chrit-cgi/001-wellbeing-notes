import { defineConfig } from 'vite'
import { resolve } from 'path'

const dir = import.meta.dirname

export default defineConfig({
  root: resolve(dir, 'src'),
  envDir: dir,
  build: {
    target: 'es2022',
    outDir: resolve(dir, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(dir, 'src/index.html'),
        login: resolve(dir, 'src/pages/login.html'),
        notes: resolve(dir, 'src/pages/notes.html'),
        note: resolve(dir, 'src/pages/note.html'),
        admin: resolve(dir, 'src/pages/admin.html'),
        settings: resolve(dir, 'src/pages/settings.html'),
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    hmr: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
