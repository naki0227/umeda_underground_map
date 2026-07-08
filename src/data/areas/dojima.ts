import type { MapEdge, MapNode, Shop } from '../../domain/types';

/** ドージマ地下センター（ドーチカ）: 西梅田から堂島方面へ南下 */
export const dojimaNodes: MapNode[] = [
  {
    id: 'dj-1',
    kind: 'junction',
    name: { ja: 'ドーチカ北', en: 'Dotica North' },
    area: 'dojima',
    x: -170,
    y: -470,
  },
  {
    id: 'dj-2',
    kind: 'junction',
    name: { ja: 'ドーチカ中央', en: 'Dotica Center' },
    area: 'dojima',
    x: -160,
    y: -560,
  },
  {
    id: 'dj-3',
    kind: 'junction',
    name: { ja: 'ドーチカ南', en: 'Dotica South' },
    area: 'dojima',
    x: -150,
    y: -650,
  },
  {
    id: 'dj-exit-c90',
    kind: 'exit',
    name: { ja: '堂島アバンザ前 出口', en: 'Dojima Avanza Exit' },
    area: 'dojima',
    x: -150,
    y: -690,
    lat: 34.696,
    lng: 135.4936,
    exitNo: 'C-90',
  },
];

export const dojimaEdges: MapEdge[] = [
  { from: 'dj-1', to: 'dj-2', distanceM: 95 },
  { from: 'dj-2', to: 'dj-3', distanceM: 95 },
  { from: 'dj-3', to: 'dj-exit-c90', distanceM: 45, attrs: ['stairs'] },
];

export const dojimaShops: Shop[] = [
  {
    id: 'dj-shop-piccolo',
    name: { ja: 'カレーショップ ピッコロ ドーチカ店', en: 'Curry Shop Piccolo Dotica' },
    category: 'restaurant',
    nodeId: 'dj-2',
  },
  {
    id: 'dj-shop-doutor',
    name: { ja: 'ドトールコーヒー ドージマ地下センター店', en: 'Doutor Coffee Dojima Underground' },
    category: 'cafe',
    nodeId: 'dj-1',
  },
];
