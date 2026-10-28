import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:8889',
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:8889',
        changeOrigin: true,
      },
    },
  },
})
