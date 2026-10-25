import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { PWA_THEME_COLOR, pwaManifest } from '../pwaManifest';
import { checkForUpdatesWhenVisible } from '../serviceWorkerUpdate';
import { robotsTxt, sitemapXml } from '../siteFiles';

const html = readFileSync(resolve(__dirname, '../../../index.html'), 'utf8');
const site = 'https://umeda.enludus.com/';

describe('files for search engines', () => {
  it('points robots.txt at the sitemap on the public URL', () => {
    expect(robotsTxt(site)).toContain('Sitemap: https://umeda.enludus.com/sitemap.xml');
  });

  it('lists the top page in the sitemap', () => {
    expect(sitemapXml(site)).toContain('<loc>https://umeda.enludus.com/</loc>');
  });

  it('has a canonical URL and structured data in index.html', () => {
    expect(html).toContain('<link rel="canonical" href="%SITE_URL%" />');
    expect(html).toContain('"@type": "WebApplication"');
  });
});

describe('install (PWA)', () => {
  it('uses the Japanese name and the same theme colour as the page', () => {
    expect(pwaManifest.name).toBe('梅田地下ナビ');
    expect(html).toContain(`<meta name="theme-color" content="${PWA_THEME_COLOR}" />`);
  });
});

describe('checkForUpdatesWhenVisible', () => {
  it('asks the service worker to update when the app comes back to the screen', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const sw = { getRegistration: vi.fn().mockResolvedValue({ update }) };
    const stop = checkForUpdatesWhenVisible(document, sw as unknown as ServiceWorkerContainer);
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    stop();
    document.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
    expect(sw.getRegistration).toHaveBeenCalledTimes(1);
  });
});
