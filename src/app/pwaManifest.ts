/**
 * PWA マニフェスト。vite.config.ts から vite-plugin-pwa に渡す。
 * アイコンは public/ にある自作画像（favicon.svg から生成）。
 */
import type { ManifestOptions } from 'vite-plugin-pwa';

export const PWA_THEME_COLOR = '#0e7490';

export const pwaManifest: Partial<ManifestOptions> & Pick<ManifestOptions, 'icons'> = {
  name: 'Umeda Underground Navi',
  short_name: 'UmedaNavi',
  description: 'Offline-first navigation for the Umeda underground mall',
  theme_color: PWA_THEME_COLOR,
  background_color: '#ffffff',
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
