/**
 * 公開URLに合わせて作る、検索エンジン向けのファイル（robots.txt・sitemap.xml）。
 * public/ に置くと公開URLを書き込めないので、vite.config.ts のビルドで出力する。
 */
export function robotsTxt(siteUrl: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}sitemap.xml\n`;
}

/** paths は公開URLからの相対パス（出口の紹介ページなど） */
export function sitemapXml(siteUrl: string, paths: string[] = []): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  <url><loc>${siteUrl}</loc></url>`,
    ...paths.map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');
}
