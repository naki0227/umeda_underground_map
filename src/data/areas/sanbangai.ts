import type { MapEdge, MapNode, Shop } from '../../domain/types';

/** 阪急三番街（南館・北館 B1/B2） */
export const sanbangaiNodes: MapNode[] = [
  {
    id: 'sb-s',
    kind: 'junction',
    name: { ja: '三番街南館', en: 'Sanbangai South Bldg.' },
    area: 'sanbangai',
    x: 220,
    y: 180,
  },
  {
    id: 'sb-n',
    kind: 'junction',
    name: { ja: '三番街北館', en: 'Sanbangai North Bldg.' },
    area: 'sanbangai',
    x: 220,
    y: 300,
  },
  {
    id: 'sb-w',
    kind: 'junction',
    name: { ja: '三番街西通路', en: 'Sanbangai West Corridor' },
    area: 'sanbangai',
    x: 140,
    y: 240,
  },
  {
    id: 'sb-exit-n1',
    kind: 'exit',
    name: { ja: '茶屋町 出口', en: 'Chayamachi Exit' },
    area: 'sanbangai',
    x: 220,
    y: 360,
    lat: 34.706,
    lng: 135.4986,
    exitNo: 'N-1',
  },
];

export const sanbangaiEdges: MapEdge[] = [
  { from: 'sb-s', to: 'sb-n', distanceM: 120 },
  { from: 'sb-s', to: 'sb-w', distanceM: 100 },
  { from: 'sb-w', to: 'sb-n', distanceM: 100 },
  { from: 'sb-n', to: 'sb-exit-n1', distanceM: 60, attrs: ['escalator'] },
];

export const sanbangaiShops: Shop[] = [
  {
    id: 'sb-shop-kinokuniya',
    name: { ja: '紀伊國屋書店 梅田本店', en: 'Kinokuniya Books Umeda Main Store' },
    category: 'bookstore',
    nodeId: 'sb-s',
  },
  {
    id: 'sb-shop-indian-curry',
    name: { ja: 'インデアンカレー 阪急三番街店', en: 'Indian Curry Hankyu Sanbangai' },
    category: 'restaurant',
    nodeId: 'sb-s',
  },
  {
    id: 'sb-shop-botejyu',
    name: { ja: 'お好み焼き ぼてぢゅう 阪急三番街店', en: 'Okonomiyaki Botejyu Hankyu Sanbangai' },
    category: 'restaurant',
    nodeId: 'sb-s',
  },
  {
    id: 'sb-shop-hokkyokusei',
    name: { ja: 'レストラン北極星 阪急三番街店', en: 'Restaurant Hokkyokusei Hankyu Sanbangai' },
    category: 'restaurant',
    nodeId: 'sb-s',
  },
  {
    id: 'sb-shop-ganko',
    name: { ja: 'がんこ寿司 阪急三番街店', en: 'Ganko Sushi Hankyu Sanbangai' },
    category: 'restaurant',
    nodeId: 'sb-s',
  },
  {
    id: 'sb-shop-seijoishii',
    name: { ja: '成城石井 阪急三番街店', en: 'Seijo Ishii Hankyu Sanbangai' },
    category: 'convenience',
    nodeId: 'sb-s',
  },
  {
    id: 'sb-shop-godiva',
    name: { ja: 'ゴディバ 阪急三番街店', en: 'GODIVA Hankyu Sanbangai' },
    category: 'cafe',
    nodeId: 'sb-s',
  },
  {
    id: 'sb-shop-kiddyland',
    name: { ja: 'キディランド 大阪梅田店', en: 'Kiddy Land Osaka Umeda' },
    category: 'goods',
    nodeId: 'sb-n',
  },
  {
    id: 'sb-shop-foodhall',
    name: { ja: 'UMEDA FOOD HALL', en: 'UMEDA FOOD HALL' },
    category: 'restaurant',
    nodeId: 'sb-n',
  },
  {
    id: 'sb-shop-yabaton',
    name: { ja: '矢場とん 阪急三番街店', en: 'Yabaton Hankyu Sanbangai' },
    category: 'restaurant',
    nodeId: 'sb-n',
  },
  {
    id: 'sb-shop-freshness',
    name: { ja: 'フレッシュネスバーガー 阪急三番街店', en: 'Freshness Burger Hankyu Sanbangai' },
    category: 'restaurant',
    nodeId: 'sb-n',
  },
  {
    id: 'sb-shop-maisonkayser',
    name: { ja: 'メゾンカイザー 阪急三番街店', en: 'Maison Kayser Hankyu Sanbangai' },
    category: 'bakery',
    nodeId: 'sb-n',
  },
];
