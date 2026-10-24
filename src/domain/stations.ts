import type { LocalizedText, MapNode, NodeId } from './types';

/**
 * 駅（改札がいくつもある）。「大阪駅へ」のように駅として選ぶと、いまいる所から一番近い改札へ案内する。
 * 改札はデータの改札（gate）の名前で見つける
 */
export interface Station {
  id: string;
  name: LocalizedText;
  /** 検索で駅として見つける言い方（ひらがな・路線名・英語など） */
  aliases: string[];
  gatePattern: RegExp;
}

export const STATIONS: Station[] = [
  {
    id: 'jr-osaka',
    name: { ja: 'JR大阪駅', en: 'JR Osaka Station' },
    aliases: ['大阪駅', 'おおさかえき', 'jr', 'osaka station', 'osaka sta'],
    gatePattern: /^JR大阪駅/,
  },
  {
    id: 'hankyu-umeda',
    name: { ja: '阪急 大阪梅田駅', en: 'Hankyu Osaka-umeda Station' },
    aliases: ['阪急梅田', '阪急大阪梅田', '梅田駅', 'うめだえき', 'hankyu'],
    gatePattern: /^阪急大阪梅田駅/,
  },
  {
    id: 'hanshin-umeda',
    name: { ja: '阪神 大阪梅田駅', en: 'Hanshin Osaka-umeda Station' },
    aliases: ['阪神梅田', '阪神大阪梅田', '梅田駅', 'うめだえき', 'hanshin'],
    gatePattern: /^阪神大阪梅田駅/,
  },
  {
    id: 'metro-umeda',
    name: { ja: '梅田駅（御堂筋線）', en: 'Umeda Station (Midosuji Line)' },
    aliases: ['梅田駅', 'うめだえき', '地下鉄梅田', '御堂筋線', 'midosuji', 'umeda station'],
    gatePattern: /^御堂筋線梅田駅/,
  },
  {
    id: 'higashi-umeda',
    name: { ja: '東梅田駅（谷町線）', en: 'Higashi-Umeda Station (Tanimachi Line)' },
    aliases: ['東梅田', 'ひがしうめだ', '谷町線', 'higashi-umeda', 'higashi umeda', 'tanimachi'],
    gatePattern: /東梅田駅/,
  },
  {
    id: 'nishi-umeda',
    name: { ja: '西梅田駅（四つ橋線）', en: 'Nishi-Umeda Station (Yotsubashi Line)' },
    aliases: ['西梅田', 'にしうめだ', '四つ橋線', 'nishi-umeda', 'nishi umeda', 'yotsubashi'],
    gatePattern: /西梅田駅/,
  },
  {
    id: 'jr-kitashinchi',
    name: { ja: 'JR北新地駅', en: 'JR Kitashinchi Station' },
    aliases: ['北新地駅', 'きたしんち', 'kitashinchi'],
    gatePattern: /北新地駅/,
  },
];

/** 駅の改札のノード（データの並び順） */
export function stationGates(station: Station, nodes: Iterable<MapNode>): NodeId[] {
  return [...nodes]
    .filter((n) => n.kind === 'gate' && station.gatePattern.test(n.name.ja))
    .map((n) => n.id);
}

/**
 * 検索の言葉に合う駅。駅名か言い方が言葉を含む、または言葉が言い方を含む（「大阪駅へ行きたい」でも見つかる）。
 * よく合うもの（言い方と同じ・駅名と同じ）を先に
 */
export function matchStations(query: string): Station[] {
  const q = query.trim().toLowerCase();
  if (q === '') return [];
  const score = (station: Station) => {
    const names = [station.name.ja, station.name.en].map((s) => s.toLowerCase());
    const aliases = station.aliases.map((s) => s.toLowerCase());
    if (names.includes(q) || aliases.includes(q)) return 3;
    if (names.some((n) => n.includes(q)) || aliases.some((a) => a.includes(q))) return 2;
    // 「大阪駅前第1ビル」のような駅前の建物は駅として出さない
    if (aliases.some((a) => a.length >= 2 && q.includes(a) && !q.includes(`${a}前`))) return 1;
    return 0;
  };
  return STATIONS.map((station) => ({ station, s: score(station) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)
    .map(({ station }) => station);
}

/**
 * 行き先の候補（駅の改札など）から、いまいる所から一番近いもの。distanceTo は経路の長さ（無ければ null）
 */
export function nearestCandidate(
  candidates: NodeId[],
  distanceTo: (target: NodeId) => number | null,
): NodeId | null {
  let best: { id: NodeId; d: number } | null = null;
  for (const id of candidates) {
    const d = distanceTo(id);
    if (d !== null && (best === null || d < best.d)) best = { id, d };
  }
  return best?.id ?? null;
}
