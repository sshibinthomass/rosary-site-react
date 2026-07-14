import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    include: ['src/features/plantCare/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: './src/features/plantCare/test/setup.ts',
    css: true,
  },
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/@firebase/auth') ||
            id.includes('node_modules/firebase/auth')
          ) {
            return 'vendor-firebase-auth';
          }
          if (
            id.includes('node_modules/@firebase/firestore') ||
            id.includes('node_modules/firebase/firestore')
          ) {
            return 'vendor-firebase-firestore';
          }
          if (
            id.includes('node_modules/@firebase/storage') ||
            id.includes('node_modules/firebase/storage')
          ) {
            return 'vendor-firebase-storage';
          }
          if (
            id.includes('node_modules/@firebase/app') ||
            id.includes('node_modules/firebase/app') ||
            id.includes('node_modules/@firebase/component') ||
            id.includes('node_modules/@firebase/logger') ||
            id.includes('node_modules/@firebase/util')
          ) {
            return 'vendor-firebase-app';
          }
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router-dom/') ||
            id.includes('node_modules/react-router/')
          ) {
            return 'vendor-react';
          }
        },
      },
    },
  },
})
