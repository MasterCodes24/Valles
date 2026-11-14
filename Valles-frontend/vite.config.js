import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['maplibre-gl'],
  },
  server: {
    proxy: {
      '/realistic': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
