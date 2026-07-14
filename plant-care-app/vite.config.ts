import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/plant-care.svg'],
      manifest: {
        name: 'Rosary Plant Care',
        short_name: 'Plant Care',
        description: 'Check-first plant care for Indian homes and balconies.',
        theme_color: '#173d30',
        background_color: '#f7f3e9',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [{ src: 'icons/plant-care.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        navigateFallback: 'index.html',
        runtimeCaching: [{
          urlPattern: /^https:\/\/(api|geocoding-api)\.open-meteo\.com\//,
          handler: 'NetworkFirst',
          options: { cacheName: 'india-weather', networkTimeoutSeconds: 8, expiration: { maxEntries: 24, maxAgeSeconds: 21_600 } },
        }],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});
