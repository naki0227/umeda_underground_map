import type { MapEdge, MapNode, Shop } from '../../domain/types';

/** ekimo梅田（御堂筋線梅田駅沿いの駅ナカ商業ゾーン） */
export const ekimoNodes: MapNode[] = [
  {
    id: 'ek-1',
    kind: 'junction',
    name: { ja: 'ekimo梅田 南', en: 'ekimo Umeda South' },
    area: 'ekimo',
    x: 230,
    y: 60,
  },
  {
    id: 'ek-2',
    kind: 'junction',
    name: { ja: 'ekimo梅田 北', en: 'ekimo Umeda North' },
    area: 'ekimo',
    x: 240,
    y: 110,
  },
];

export const ekimoEdges: MapEdge[] = [{ from: 'ek-1', to: 'ek-2', distanceM: 55 }];

export const ekimoShops: Shop[] = [
  {
    id: 'ek-shop-gongcha',
    name: { ja: 'ゴンチャ ekimo梅田店', en: 'Gong cha ekimo Umeda' },
    category: 'cafe',
    nodeId: 'ek-1',
  },
  {
    id: 'ek-shop-cosme',
    name: { ja: 'コスメショップ ekimo梅田', en: 'Cosmetics Shop ekimo Umeda' },
    category: 'goods',
    nodeId: 'ek-2',
  },
];
