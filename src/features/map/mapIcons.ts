import type { LocalizedText, MapNode, Poi } from '../../domain/types';

/*
 * 地図の目印のアイコン。文字を減らし、ひと目で種類が分かるようにする。
 * 名前は拡大したとき（詳細表示）か、選んだときに出す。
 */

const POI_ICON: Record<string, string> = {
  'poi-hepfive': '🎡',
  'poi-hepnavio': '🛍️',
  'poi-hankyu-dept': '🏬',
  'poi-hanshin-dept': '🏬',
  'poi-daimaru': '🏬',
  'poi-lucua': '🛍️',
  'poi-yodobashi': '🏬',
  'poi-nu-chayamachi': '🛍️',
  'poi-chayamachi': '🛍️',
  'poi-umeda-loft': '🛍️',
  'poi-ohatsutenjin': '⛩️',
  'poi-sonezaki-police': '👮',
  'poi-hilton-west': '🛍️',
  'poi-hilton-east': '🛍️',
  'poi-kitte': '🛍️',
  'poi-central-post': '📮',
  'poi-kitashinchi': '🍸',
  'poi-hankyu-sta': '🚉',
  'poi-sanbangai-bus': '🚌',
  'poi-jr-bus': '🚌',
  'poi-grand-green': '🌳',
};

/** 表にない地上スポットは名前から決める */
const POI_KEYWORDS: [RegExp, string][] = [
  [/駅/, '🚉'],
  [/バス/, '🚌'],
  [/神社|天神/, '⛩️'],
  [/郵便/, '📮'],
  [/ホテル/, '🏨'],
  [/公園|グリーン/, '🌳'],
  [/百貨店|本店/, '🏬'],
  [/ビル|タワー|ENT|PLAZA/i, '🏢'],
];

export function poiIcon(poi: Pick<Poi, 'id' | 'name'>): string {
  const known = POI_ICON[poi.id];
  if (known !== undefined) return known;
  return POI_KEYWORDS.find(([pattern]) => pattern.test(poi.name.ja))?.[1] ?? '📍';
}

/** 改札の鉄道会社・路線。短い名前と色（路線の色）で見分けられるようにする */
const RAILWAYS: { pattern: RegExp; short: LocalizedText; color: string }[] = [
  { pattern: /^JR/, short: { ja: 'JR', en: 'JR' }, color: '#0072bc' },
  { pattern: /阪急/, short: { ja: '阪急', en: 'Hankyu' }, color: '#8c1c2c' },
  { pattern: /阪神/, short: { ja: '阪神', en: 'Hanshin' }, color: '#0067b0' },
  { pattern: /御堂筋/, short: { ja: '御堂筋線', en: 'Midosuji' }, color: '#e5171f' },
  { pattern: /谷町/, short: { ja: '谷町線', en: 'Tanimachi' }, color: '#522886' },
  { pattern: /四つ橋/, short: { ja: '四つ橋線', en: 'Yotsubashi' }, color: '#0078ba' },
];

export const DEFAULT_RAILWAY_COLOR = '#475569';

/** 改札の路線（分からなければ null） */
export function gateRailway(node: Pick<MapNode, 'name'>) {
  return RAILWAYS.find(({ pattern }) => pattern.test(node.name.ja)) ?? null;
}

/** 広場・改札などの目印のアイコン */
export function pinIcon(node: Pick<MapNode, 'kind' | 'name'>): string {
  if (node.kind === 'gate') return '🚉';
  if (/広場/.test(node.name.ja)) return '⛲';
  return '🏢';
}

/**
 * 詳細表示でないときの目印の短い名前。改札は路線名、広場は名前、ビルの地下は出さない（アイコンだけ）
 */
export function pinShortName(node: Pick<MapNode, 'kind' | 'name'>): LocalizedText | null {
  if (node.kind === 'gate') return gateRailway(node)?.short ?? null;
  if (/広場/.test(node.name.ja)) return node.name;
  return null;
}
