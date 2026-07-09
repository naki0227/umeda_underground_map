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
    id: 'ek-shop-uniqlo',
    name: { ja: 'UNIQLO ekimo梅田店', en: 'UNIQLO ekimo Umeda' },
    category: 'fashion',
    nodeId: 'ek-1',
  },
  {
    id: 'ek-shop-mujicom',
    name: { ja: 'MUJI com ekimo梅田店', en: 'MUJI com ekimo Umeda' },
    category: 'goods',
    nodeId: 'ek-2',
  },
  {
    id: 'ek-shop-misdo',
    name: { ja: 'ミスタードーナツ ekimo梅田店', en: 'Mister Donut ekimo Umeda' },
    category: 'cafe',
    nodeId: 'ek-1',
  },
  {
    id: 'ek-shop-hattendo',
    name: { ja: '八天堂 ekimo梅田店', en: 'Hattendo ekimo Umeda' },
    category: 'bakery',
    nodeId: 'ek-2',
  },
  {
    id: 'ek-shop-jins',
    name: { ja: 'JINS ekimo梅田店', en: 'JINS ekimo Umeda' },
    category: 'goods',
    nodeId: 'ek-1',
  },
  {
    id: 'ek-shop-osdrug',
    name: { ja: 'オーエスドラッグ ekimo梅田店', en: 'OS Drug ekimo Umeda' },
    category: 'drugstore',
    nodeId: 'ek-2',
  },
  {
    id: 'ek-shop-karendo',
    name: { ja: 'karendo ekimo梅田店', en: 'karendo ekimo Umeda' },
    category: 'goods',
    nodeId: 'ek-2',
  },
];
