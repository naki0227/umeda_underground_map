/**
 * PWA マニフェスト。vite.config.ts から vite-plugin-pwa に渡す。
 * アイコンは public/ にある自作画像（favicon.svg から生成）。
 */
import type { ManifestOptions } from 'vite-plugin-pwa';

/** 画面の地（紙色）と同じ。index.html の theme-color と合わせる */
export const PWA_THEME_COLOR = '#efebea';

export const pwaManifest: Partial<ManifestOptions> & Pick<ManifestOptions, 'icons'> = {
  // ホーム画面に出る名前（lang が ja なので日本語に）
  id: './',
  name: '梅田地下ナビ',
  short_name: '梅田地下ナビ',
  description:
    '梅田の地下街の道案内。GPS が届かない地下でも、近くのお店から現在地を当てて案内します。',
  theme_color: PWA_THEME_COLOR,
  background_color: PWA_THEME_COLOR,
  display: 'standalone',
  lang: 'ja',
  icons: [
    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

/** マニフェスト以外に precache する public/ の静的ファイル */
export const pwaIncludeAssets: string[] = ['favicon.svg', 'apple-touch-icon.png'];
