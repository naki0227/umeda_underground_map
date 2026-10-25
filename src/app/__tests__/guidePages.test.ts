import { describe, expect, it } from 'vitest';
import { languageFromUrl } from '../../i18n';
import { buildGuidePages, exitEntries } from '../guidePages';

const site = 'https://umeda.enludus.com/';
const pages = buildGuidePages(site);

describe('exit guide pages', () => {
  it('makes one page per exit and language, plus a list per language', () => {
    const exits = exitEntries();
    expect(pages).toHaveLength((exits.length + 1) * 10);
    expect(new Set(exits.map((e) => e.slug)).size).toBe(exits.length);
    expect(new Set(pages.map((p) => p.fileName)).size).toBe(pages.length);
  });

  it('links the other languages and opens the app at the exit in the same language', () => {
    const page = pages.find((p) => p.fileName === 'guide/ko/exit/d21/index.html')!;
    expect(page.html).toContain('<html lang="ko">');
    expect(page.html).toContain('hreflang="zh-Hant"');
    expect(page.html).toContain(
      '<link rel="canonical" href="https://umeda.enludus.com/guide/ko/exit/d21/" />',
    );
    expect(page.html).toMatch(
      /href="https:\/\/umeda\.enludus\.com\/\?to=[^"]+&amp;n=|href="https:\/\/umeda\.enludus\.com\/\?to=[^"]+&n=/,
    );
    expect(page.html).toContain('hl=ko');
    expect(page.html).toContain('OpenStreetMap');
  });

  it('escapes shop names so they cannot break the page', () => {
    for (const page of pages) expect(page.html).not.toMatch(/<li>[^<]*<script/);
  });

  it('opens the app in the language given in the link', () => {
    expect(languageFromUrl('?to=x&hl=ko')).toBe('ko');
    expect(languageFromUrl('?hl=xx')).toBeNull();
    expect(languageFromUrl('')).toBeNull();
  });
});
