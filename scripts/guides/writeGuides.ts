// 出口ごとの紹介ページを dist/guide/ に書き出し、サイトマップに足す。npm run build の最後に動く。
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { buildGuidePages } from '../../src/app/guidePages';
import { sitemapXml } from '../../src/app/siteFiles';

const base = process.env.BASE_PATH ?? '/';
const siteUrl = `${process.env.SITE_ORIGIN ?? 'https://umeda.enludus.com'}${base}`;
const pages = buildGuidePages(siteUrl);
for (const page of pages) {
  const file = join('dist', page.fileName);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, page.html);
}
writeFileSync(
  join('dist', 'sitemap.xml'),
  sitemapXml(
    siteUrl,
    pages.map((page) => page.path),
  ),
);
console.log(`wrote ${pages.length} guide pages`);
