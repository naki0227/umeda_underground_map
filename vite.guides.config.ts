/// <reference types="node" />
import { defineConfig } from 'vite';

// 出口ごとの紹介ページ（src/app/guidePages.ts）を作るスクリプトを、Node で動く形にまとめる。
// アプリのビルドのあとに scripts/guides/run.mjs が動かす（npm run build）
export default defineConfig({
  build: {
    ssr: 'scripts/guides/writeGuides.ts',
    outDir: 'node_modules/.tmp/guides',
    emptyOutDir: true,
    copyPublicDir: false,
  },
});
