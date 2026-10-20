import { describe, expect, it } from 'vitest';
import { pwaIncludeAssets, pwaManifest } from '../pwaManifest';

// public/ にある実ファイル（存在確認用）
const publicFiles = Object.keys(
  import.meta.glob('../../../public/*.{png,svg}', { query: '?url', import: 'default' }),
).map((path) => path.replace('../../../public/', ''));

describe('pwaManifest', () => {
  it('has the icons required for installation (192px, 512px and maskable)', () => {
    const sizes = pwaManifest.icons.map((icon) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(pwaManifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });

  it('references only files that exist in public/', () => {
    for (const icon of pwaManifest.icons) {
      expect(publicFiles, icon.src).toContain(icon.src);
    }
    for (const asset of pwaIncludeAssets) {
      expect(publicFiles, asset).toContain(asset);
    }
  });

  it('uses relative icon paths so they resolve under the GitHub Pages base path', () => {
    for (const icon of pwaManifest.icons) {
      expect(icon.src.startsWith('/')).toBe(false);
    }
  });
});
