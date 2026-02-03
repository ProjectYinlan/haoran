import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const baseDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: resolve(baseDir, 'src/template-preview'),
  publicDir: resolve(baseDir, 'assets'),
  plugins: [react()],
  server: {
    port: 39993,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  build: {
    outDir: resolve(baseDir, 'dist/template-preview'),
    emptyOutDir: true,
  },
})

