import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/tennis/',
  server: {
    proxy: {
      '/tennis/api': {
        target: 'http://localhost:3001',
        rewrite: path => path.replace(/^\/tennis\/api/, '')
      }
    }
  }
})
