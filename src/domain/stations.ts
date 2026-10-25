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
    name: {
      ja: 'JR大阪駅',
      en: 'JR Osaka Station',
      zh: 'JR大阪站',
      'zh-Hant': 'JR大阪站',
      ko: 'JR 오사카역',
    },
    aliases: ['大阪駅', 'おおさかえき', 'jr', 'osaka station', 'osaka sta', '大阪站', '오사카역'],
    gatePattern: /^JR大阪駅/,
  },
  {
    id: 'hankyu-umeda',
    name: {
      ja: '阪急 大阪梅田駅',
      en: 'Hankyu Osaka-umeda Station',
      zh: '阪急 大阪梅田站',
      'zh-Hant': '阪急 大阪梅田站',
      ko: '한큐 오사카우메다역',
    },
    aliases: [
      '阪急梅田',
      '阪急大阪梅田',
      '梅田駅',
      'うめだえき',
      'hankyu',
      '梅田站',
      '한큐',
      '우메다역',
    ],
    gatePattern: /^阪急大阪梅田駅/,
  },
  {
    id: 'hanshin-umeda',
    name: {
      ja: '阪神 大阪梅田駅',
      en: 'Hanshin Osaka-umeda Station',
      zh: '阪神 大阪梅田站',
      'zh-Hant': '阪神 大阪梅田站',
      ko: '한신 오사카우메다역',
    },
    aliases: [
      '阪神梅田',
      '阪神大阪梅田',
      '梅田駅',
      'うめだえき',
      'hanshin',
      '梅田站',
      '한신',
      '우메다역',
    ],
    gatePattern: /^阪神大阪梅田駅/,
  },
  {
    id: 'metro-umeda',
    name: {
      ja: '梅田駅（御堂筋線）',
      en: 'Umeda Station (Midosuji Line)',
      zh: '梅田站（御堂筋线）',
      'zh-Hant': '梅田站（御堂筋線）',
      ko: '우메다역 (미도스지선)',
    },
    aliases: [
      '梅田駅',
      'うめだえき',
      '地下鉄梅田',
      '御堂筋線',
      'midosuji',
      'umeda station',
      '梅田站',
      '御堂筋线',
      '우메다역',
      '미도스지선',
    ],
    gatePattern: /^御堂筋線梅田駅/,
  },
  {
    id: 'higashi-umeda',
    name: {
      ja: '東梅田駅（谷町線）',
      en: 'Higashi-Umeda Station (Tanimachi Line)',
      zh: '东梅田站（谷町线）',
      'zh-Hant': '東梅田站（谷町線）',
      ko: '히가시우메다역 (다니마치선)',
    },
    aliases: [
      '東梅田',
      'ひがしうめだ',
      '谷町線',
      'higashi-umeda',
      'higashi umeda',
      'tanimachi',
      '东梅田',
      '히가시우메다',
    ],
    gatePattern: /東梅田駅/,
  },
  {
    id: 'nishi-umeda',
    name: {
      ja: '西梅田駅（四つ橋線）',
      en: 'Nishi-Umeda Station (Yotsubashi Line)',
      zh: '西梅田站（四桥线）',
      'zh-Hant': '西梅田站（四橋線）',
      ko: '니시우메다역 (요쓰바시선)',
    },
    aliases: [
      '西梅田',
      'にしうめだ',
      '四つ橋線',
      'nishi-umeda',
      'nishi umeda',
      'yotsubashi',
      '니시우메다',
    ],
    gatePattern: /西梅田駅/,
  },
  {
    id: 'jr-kitashinchi',
    name: {
      ja: 'JR北新地駅',
      en: 'JR Kitashinchi Station',
      zh: 'JR北新地站',
      'zh-Hant': 'JR北新地站',
      ko: 'JR 기타신치역',
    },
    aliases: ['北新地駅', 'きたしんち', 'kitashinchi', '北新地站', '기타신치'],
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
    const names = Object.values(station.name).map((s: string) => s.toLowerCase());
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
