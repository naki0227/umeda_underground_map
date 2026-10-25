import { projectToPlane } from '../domain/geo';
import type { LocalizedText, MapNode, NodeId } from '../domain/types';
import { amenities as generated } from './generated/amenities';
import { umedaMap } from './map';
import type { AmenityKind, GeneratedAmenity } from './types';

/** 設備（トイレ・コインロッカーなど）。いちばん近い通路の点に付けてある */
export interface Amenity extends GeneratedAmenity {
  nodeId: NodeId;
  /** 案内に出す名前（「トイレ B1」「ATM セブン銀行」） */
  label: LocalizedText;
}

/** 通路の点からこれより遠い設備は、地下からは行きにくいので出さない（m） */
const MAX_DISTANCE_M = 40;

export const AMENITY_KINDS: AmenityKind[] = ['toilet', 'locker', 'atm', 'elevator', 'info', 'aed'];

const KIND_NAMES: Record<AmenityKind, Required<Omit<LocalizedText, never>>> = {
  toilet: { ja: 'トイレ', en: 'Toilet', zh: '洗手间', 'zh-Hant': '洗手間', ko: '화장실' },
  locker: {
    ja: 'コインロッカー',
    en: 'Coin lockers',
    zh: '投币储物柜',
    'zh-Hant': '投幣置物櫃',
    ko: '코인로커',
  },
  atm: { ja: 'ATM', en: 'ATM', zh: 'ATM', 'zh-Hant': 'ATM', ko: 'ATM' },
  elevator: { ja: 'エレベーター', en: 'Elevator', zh: '电梯', 'zh-Hant': '電梯', ko: '엘리베이터' },
  info: { ja: '案内所', en: 'Information', zh: '咨询处', 'zh-Hant': '詢問處', ko: '안내소' },
  aed: { ja: 'AED', en: 'AED', zh: 'AED', 'zh-Hant': 'AED', ko: 'AED' },
};
const WHEELCHAIR_TOILET: Required<LocalizedText> = {
  ja: '多目的トイレ',
  en: 'Accessible toilet',
  zh: '无障碍洗手间',
  'zh-Hant': '無障礙洗手間',
  ko: '다목적 화장실',
};

function labelOf(item: GeneratedAmenity): LocalizedText {
  const base =
    item.kind === 'toilet' && item.wheelchair ? WHEELCHAIR_TOILET : KIND_NAMES[item.kind];
  const suffix = (lang: 'ja' | 'en') =>
    [item.name?.[lang], item.floor].filter((part) => part !== undefined).join(' ');
  const join = (text: string, extra: string) => (extra === '' ? text : `${text} ${extra}`);
  return {
    ja: join(base.ja, suffix('ja')),
    en: join(base.en, suffix('en')),
    zh: join(base.zh, suffix('en')),
    'zh-Hant': join(base['zh-Hant'], suffix('en')),
    ko: join(base.ko, suffix('en')),
  };
}

/** 設備をいちばん近い通路の点に付ける（地下の設備は地下の点、出口には付けない） */
export function attachAmenities(nodes: MapNode[], items: GeneratedAmenity[]): Amenity[] {
  const candidates = nodes.filter((n) => n.kind !== 'exit');
  return items.flatMap((item) => {
    const p = projectToPlane(item);
    let best: MapNode | null = null;
    let bestD = Infinity;
    for (const node of candidates) {
      const d = Math.hypot(node.x - p.x, node.y - p.y);
      if (d < bestD) {
        best = node;
        bestD = d;
      }
    }
    if (best === null || bestD > MAX_DISTANCE_M) return [];
    return [{ ...item, nodeId: best.id, label: labelOf(item) }];
  });
}

export const umedaAmenities: Amenity[] = attachAmenities(umedaMap.nodes, generated);
