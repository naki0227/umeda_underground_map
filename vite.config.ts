/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaIncludeAssets, pwaManifest } from './src/app/pwaManifest.ts';
import { robotsTxt, sitemapXml } from './src/app/siteFiles.ts';

// 公開先は独自ドメイン https://umeda.enludus.com/ の直下（GitHub Pages）。
// github.io の下（https://naki0227.github.io/umeda_underground_map/）で配信し直すときは
// BASE_PATH=/umeda_underground_map/ と SITE_ORIGIN=https://naki0227.github.io でビルドする（docs/DEPLOY.md）
const base = process.env.BASE_PATH ?? '/';
/** 公開URL（共有カードの画像は絶対URLで書く必要がある） */
const siteUrl = `${process.env.SITE_ORIGIN ?? 'https://umeda.enludus.com'}${base}`;

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    {
      name: 'site-url',
      transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', siteUrl),
      // 検索エンジン向けのファイル（公開URLを書き込む）と、GitHub Pages で知らない URL を
      // 開いたときもアプリを出すための 404.html（index.html と同じもの）
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt(siteUrl) });
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(siteUrl) });
      },
    },
    {
      name: 'pages-404',
      // index.html ができたあと（ほかのプラグインの後）に写す
      enforce: 'post',
      generateBundle(_, bundle) {
        const index = bundle['index.html'];
        if (index?.type === 'asset') {
          this.emitFile({ type: 'asset', fileName: '404.html', source: index.source });
        }
      },
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
