import type { MapNode } from './types';

/**
 * 出口番号の書き方をそろえる（全角・小文字・ハイフンや空白の違いをなくす）。
 * 「ｍ－１２」「m 12」「M-12」は同じ「M12」になる。
 */
export function normalizeExitCode(text: string): string {
  return text
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[\s\-‐‑–—ー－_]/g, '');
}

/**
 * 案内板などで見た番号に合う出口。番号が同じものを先に、続けて番号がその文字で始まるもの。
 * 「M12」と打つと M-12 が先頭、「M1」なら M-1・M-10… の順。
 */
export function matchExitCode(nodes: Iterable<MapNode>, query: string, limit = 8): MapNode[] {
  const q = normalizeExitCode(query);
  if (q === '') return [];
  const exits = [...nodes].filter((n) => n.kind === 'exit' && n.exitNo !== undefined);
  const code = (n: MapNode) => normalizeExitCode(n.exitNo ?? '');
  const exact = exits.filter((n) => code(n) === q);
  const prefix = exits
    .filter((n) => code(n) !== q && code(n).startsWith(q))
    .sort((a, b) => code(a).length - code(b).length || code(a).localeCompare(code(b)));
  return [...exact, ...prefix].slice(0, limit);
}
