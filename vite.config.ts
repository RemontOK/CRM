import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => ({
  plugins: [react()],
  base: '/',
  server: {
    port: 4000,
    open: true,
  },
  build: {
    outDir: 'build',
    emptyOutDir: true,
    sourcemap: false,
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
    alias: {
      '@': '/src',
    },
  },
}));
