import { umedaMap } from '../data/map';
import { normalizeExitCode } from '../domain/exitCode';
import { buildGraph } from '../domain/graph';
import { isUndergroundShop } from '../domain/shopLabel';
import { nodeFloor, type MapNode } from '../domain/types';
import { APP_LANGUAGES, localized, type AppLanguage } from '../i18n';
import { en } from '../i18n/locales/en';
import { es } from '../i18n/locales/es';
import { fr } from '../i18n/locales/fr';
import { id } from '../i18n/locales/id';
import { ja } from '../i18n/locales/ja';
import { ko } from '../i18n/locales/ko';
import { th } from '../i18n/locales/th';
import { vi } from '../i18n/locales/vi';
import { zh } from '../i18n/locales/zh';
import { zhHant } from '../i18n/locales/zhHant';

/**
 * 出口ごとの紹介ページ（10 言語）。「Umeda exit D-21」のように検索して来る人向けに、
 * その出口の地下街・階・地上の近くの建物・地下の近くの店を載せ、アプリでその出口への案内を開く。
 * ビルド時に vite.config.ts が guide/<言語>/ の下に書き出す（Service Worker には入れない）
 */
const RESOURCES: Record<AppLanguage, typeof ja> = {
  ja,
  en,
  zh,
  'zh-Hant': zhHant,
  ko,
  th,
  vi,
  id,
  fr,
  es,
} as Record<AppLanguage, typeof ja>;

/** 地下の近くの店を拾う範囲（m） */
const NEARBY_SHOP_M = 60;
const MAX_LISTED = 8;

export interface GuidePage {
  /** 公開URLからの相対パス（guide/ja/exit/d-21/index.html） */
  fileName: string;
  /** サイトマップに載せる URL のパス（guide/ja/exit/d-21/） */
  path: string;
  html: string;
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/{{(\w+)}}/g, (_, key: string) => String(values[key] ?? ''));

interface ExitEntry {
  node: MapNode;
  slug: string;
}

/** 出口の一覧と、URL に使う名前（番号の小文字。同じ番号が 2 か所あれば -2 を付ける） */
export function exitEntries(nodes: MapNode[] = umedaMap.nodes): ExitEntry[] {
  const used = new Map<string, number>();
  return nodes
    .filter((n) => n.kind === 'exit' && n.exitNo !== undefined)
    .sort((a, b) => (a.exitNo ?? '').localeCompare(b.exitNo ?? '', 'en', { numeric: true }))
    .map((node) => {
      const base = normalizeExitCode(node.exitNo ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      const count = (used.get(base) ?? 0) + 1;
      used.set(base, count);
      return { node, slug: count === 1 ? base : `${base}-${count}` };
    });
}

function page(
  lang: AppLanguage,
  siteUrl: string,
  title: string,
  description: string,
  canonicalPath: string,
  alternates: string,
  body: string,
  jsonLd: object,
): string {
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${siteUrl}${canonicalPath}" />
${alternates}
<link rel="icon" type="image/svg+xml" href="${siteUrl}favicon.svg" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${siteUrl}ogp.jpg" />
<meta name="twitter:card" content="summary_large_image" />
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
<style>
body{margin:0;font-family:system-ui,sans-serif;background:#efebea;color:#3b201b;line-height:1.7}
main{max-width:640px;margin:0 auto;padding:24px 16px 48px}
h1{font-size:24px;line-height:1.4;margin:0 0 8px}h2{font-size:16px;margin:24px 0 8px}
p,li{font-size:16px}ul{padding-left:20px}a{color:#1d4ed8}
.cta{display:block;margin:20px 0;padding:14px 16px;border-radius:999px;background:#1d4ed8;color:#fff;text-align:center;font-weight:700;text-decoration:none}
.meta{color:#725852;font-size:14px}nav{font-size:14px;margin-top:32px}nav a{margin-right:10px}
.grid{display:flex;flex-wrap:wrap;gap:8px;padding:0;list-style:none}.grid a{display:inline-block;padding:6px 12px;border-radius:999px;background:#fff;text-decoration:none}
</style>
</head>
<body><main>
${body}
</main></body>
</html>
`;
}

/** すべての出口・すべての言語のページと、言語ごとの出口一覧のページ */
export function buildGuidePages(siteUrl: string): GuidePage[] {
  const entries = exitEntries();
  const shops = umedaMap.shops.filter(isUndergroundShop);
  const nodeById = new Map(umedaMap.nodes.map((n) => [n.id, n]));
  const graph = buildGraph(umedaMap);
  /** 出口がつながる地下の点（地下街・階はこちらで言う。出口そのものは地上 1F） */
  const below = (exit: MapNode) => {
    const to = graph.adjacency.get(exit.id)?.[0]?.to;
    return (to !== undefined ? nodeById.get(to) : undefined) ?? exit;
  };
  const pages: GuidePage[] = [];
  const languageLinks = (pathOf: (lang: AppLanguage) => string) =>
    APP_LANGUAGES.map(
      (lang) => `<link rel="alternate" hreflang="${lang}" href="${siteUrl}${pathOf(lang)}" />`,
    ).join('\n') +
    `\n<link rel="alternate" hreflang="x-default" href="${siteUrl}${pathOf('en')}" />`;
  const languageNav = (pathOf: (lang: AppLanguage) => string) =>
    `<nav>${APP_LANGUAGES.map((lang) => `<a href="${siteUrl}${pathOf(lang)}" hreflang="${lang}">${escapeHtml(LANGUAGE_NAMES[lang])}</a>`).join('')}</nav>`;

  for (const lang of APP_LANGUAGES) {
    const r = RESOURCES[lang];
    const indexPath = (l: AppLanguage) => `guide/${l}/`;
    const exitPath = (l: AppLanguage, slug: string) => `guide/${l}/exit/${slug}/`;

    for (const { node, slug } of entries) {
      const exit = node.exitNo ?? '';
      const inside = below(node);
      const area = r.area[inside.area as keyof typeof r.area] ?? '';
      const floor = nodeFloor(inside);
      const pois = umedaMap.pois.filter((p) => p.nodeId === node.id).slice(0, MAX_LISTED);
      const nearbyShops = shops
        .filter((s) => {
          const at = nodeById.get(s.nodeId);
          return at !== undefined && Math.hypot(at.x - node.x, at.y - node.y) <= NEARBY_SHOP_M;
        })
        .slice(0, MAX_LISTED);
      const title = fill(r.guide.exitTitle, { exit, area });
      const names = [...pois.map((p) => p.name), ...nearbyShops.map((s) => s.name)]
        .slice(0, 4)
        .map((n) => localized(n, lang));
      const description = fill(r.guide.exitDescription, {
        exit,
        area,
        nearby: names.join(lang === 'ja' || lang.startsWith('zh') ? '、' : ', '),
      });
      const appUrl = `${siteUrl}?to=${encodeURIComponent(node.id)}&n=${encodeURIComponent(node.name.ja)}&hl=${lang}`;
      const list = (items: string[]) =>
        `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
      const body = [
        `<p class="meta"><a href="${siteUrl}${indexPath(lang)}">${escapeHtml(r.guide.allExits)}</a></p>`,
        `<h1>${escapeHtml(title.split(' | ')[0])}</h1>`,
        `<p>${escapeHtml(fill(r.guide.exitIntro, { exit, area, floor }))}</p>`,
        `<a class="cta" href="${appUrl}">${escapeHtml(r.guide.openApp)}</a>`,
        pois.length > 0
          ? `<h2>${escapeHtml(r.guide.nearbyAbove)}</h2>${list(pois.map((p) => localized(p.name, lang)))}`
          : '',
        nearbyShops.length > 0
          ? `<h2>${escapeHtml(r.guide.nearbyShops)}</h2>${list(nearbyShops.map((s) => localized(s.name, lang)))}`
          : '',
        `<p class="meta">${escapeHtml(r.guide.attribution)}</p>`,
        languageNav((l) => exitPath(l, slug)),
      ].join('\n');
      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Place',
        name: title,
        description,
        ...(node.lat !== undefined && node.lng !== undefined
          ? { geo: { '@type': 'GeoCoordinates', latitude: node.lat, longitude: node.lng } }
          : {}),
        containedInPlace: { '@type': 'Place', name: area },
      };
      pages.push({
        fileName: `${exitPath(lang, slug)}index.html`,
        path: exitPath(lang, slug),
        html: page(
          lang,
          siteUrl,
          title,
          description,
          exitPath(lang, slug),
          languageLinks((l) => exitPath(l, slug)),
          body,
          jsonLd,
        ),
      });
    }

    // 言語ごとの出口一覧
    const byArea = new Map<string, ExitEntry[]>();
    for (const entry of entries) {
      const area = r.area[below(entry.node).area as keyof typeof r.area] ?? '';
      byArea.set(area, [...(byArea.get(area) ?? []), entry]);
    }
    const indexBody = [
      `<h1>${escapeHtml(r.guide.indexTitle)}</h1>`,
      `<p>${escapeHtml(fill(r.guide.indexIntro, { count: entries.length }))}</p>`,
      `<a class="cta" href="${siteUrl}?hl=${lang}">${escapeHtml(r.guide.openAppTop)}</a>`,
      ...[...byArea].map(
        ([area, list]) =>
          `<h2>${escapeHtml(area)}</h2><ul class="grid">${list
            .map(
              ({ node, slug }) =>
                `<li><a href="${siteUrl}${exitPath(lang, slug)}">${escapeHtml(node.exitNo ?? '')}</a></li>`,
            )
            .join('')}</ul>`,
      ),
      `<p class="meta">${escapeHtml(r.guide.attribution)}</p>`,
      languageNav(indexPath),
    ].join('\n');
    pages.push({
      fileName: `${indexPath(lang)}index.html`,
      path: indexPath(lang),
      html: page(
        lang,
        siteUrl,
        r.guide.indexTitle,
        fill(r.guide.indexIntro, { count: entries.length }),
        indexPath(lang),
        languageLinks(indexPath),
        indexBody,
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: r.guide.indexTitle,
        },
      ),
    });
  }
  return pages;
}

const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  ja: '日本語',
  en: 'English',
  zh: '简体中文',
  'zh-Hant': '繁體中文',
  ko: '한국어',
  th: 'ไทย',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
  fr: 'Français',
  es: 'Español',
};
