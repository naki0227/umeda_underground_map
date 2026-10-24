/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaIncludeAssets, pwaManifest } from './src/app/pwaManifest.ts';

// GitHub Pages (https://naki0227.github.io/umeda_underground_map/) 配下で配信するため。
// 独自ドメインの直下で配信する場合は BASE_PATH=/ と SITE_ORIGIN=https://<ドメイン> でビルドする（docs/DEPLOY.md）
const base = process.env.BASE_PATH ?? '/umeda_underground_map/';
/** 公開URL（共有カードの画像は絶対URLで書く必要がある） */
const siteUrl = `${process.env.SITE_ORIGIN ?? 'https://naki0227.github.io'}${base}`;

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    {
      name: 'site-url',
      transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', siteUrl),
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: pwaIncludeAssets,
      manifest: pwaManifest,
      // 数字の丸い字（woff2）もオフラインで使えるよう先に保存する
      workbox: { globPatterns: ['**/*.{js,css,html,woff2}'] },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
