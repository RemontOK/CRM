import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/CRM/',
  server: {
    port: 4000,
    open: true,
  },
  build: {
    outDir: 'build',
    sourcemap: false, // Отключаем source map для уменьшения размера
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          router: ['react-router-dom'],
          charts: ['recharts'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})

