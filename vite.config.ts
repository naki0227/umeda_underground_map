/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Umeda Underground Navi',
        short_name: 'UmedaNavi',
        description: 'Offline-first navigation for the Umeda underground mall',
        theme_color: '#7dd3e8',
        background_color: '#ffffff',
        display: 'standalone',
        lang: 'ja',
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
