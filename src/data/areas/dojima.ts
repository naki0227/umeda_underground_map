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
    id: 'dj-shop-indiancurry',
    name: { ja: 'インデアンカレー 堂島店', en: 'Indian Curry Dojima' },
    category: 'restaurant',
    nodeId: 'dj-2',
  },
  {
    id: 'dj-shop-kineya',
    name: { ja: '自家製麺 杵屋 ドーチカ店', en: 'Kineya Udon Dotica' },
    category: 'restaurant',
    nodeId: 'dj-2',
  },
  {
    id: 'dj-shop-chuoken',
    name: { ja: '中央軒 ドーチカ店', en: 'Chuoken Dotica' },
    category: 'restaurant',
    nodeId: 'dj-3',
  },
  {
    id: 'dj-shop-doutor',
    name: { ja: 'ドトールコーヒーショップ ドーチカ店', en: 'Doutor Coffee Dotica' },
    category: 'cafe',
    nodeId: 'dj-1',
  },
  {
    id: 'dj-shop-kiefel',
    name: { ja: 'KIEFEL COFFEE ドーチカ店', en: 'KIEFEL COFFEE Dotica' },
    category: 'cafe',
    nodeId: 'dj-1',
  },
  {
    id: 'dj-shop-daiso',
    name: { ja: 'ダイソー ドーチカ店', en: 'DAISO Dotica' },
    category: 'goods',
    nodeId: 'dj-2',
  },
  {
    id: 'dj-shop-kokumin',
    name: { ja: 'コクミンドラッグ ドーチカ店', en: 'Kokumin Drug Dotica' },
    category: 'drugstore',
    nodeId: 'dj-1',
  },
  {
    id: 'dj-shop-chidoriya',
    name: { ja: '千鳥屋宗家 堂島店', en: 'Chidoriya Sohke Dojima' },
    category: 'goods',
    nodeId: 'dj-3',
  },
  {
    id: 'dj-shop-aburagumi',
    name: { ja: '東京油組総本店 ドーチカ組', en: 'Tokyo Aburagumi Sohonten Dotica' },
    category: 'restaurant',
    nodeId: 'dj-3',
  },
];
