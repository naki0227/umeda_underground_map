/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaIncludeAssets, pwaManifest } from './src/app/pwaManifest.ts';

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages (https://naki0227.github.io/umeda_underground_map/) 配下で配信するため
  base: '/umeda_underground_map/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: pwaIncludeAssets,
      manifest: pwaManifest,
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
