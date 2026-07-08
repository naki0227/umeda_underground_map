import type { MapEdge, MapNode, Shop } from '../types';

/**
 * テスト用の小さな格子状マップ。
 *
 *  exit1(0,100) - j1(0,0) --- j2(100,0) --- j3(200,0)
 *                  |             |
 *                j4(0,-100) - j5(100,-100)  ※ j2-j5 は階段
 */
export const testNodes: MapNode[] = [
  {
    id: 'exit1',
    kind: 'exit',
    name: { ja: '出口1', en: 'Exit 1' },
    area: 'whity',
    x: 0,
    y: 100,
    lat: 34.7025,
    lng: 135.4995,
    exitNo: 'T-1',
  },
  {
    id: 'j1',
    kind: 'junction',
    name: { ja: '交差点1', en: 'Junction 1' },
    area: 'whity',
    x: 0,
    y: 0,
  },
  {
    id: 'j2',
    kind: 'junction',
    name: { ja: '交差点2', en: 'Junction 2' },
    area: 'whity',
    x: 100,
    y: 0,
  },
  {
    id: 'j3',
    kind: 'junction',
    name: { ja: '交差点3', en: 'Junction 3' },
    area: 'whity',
    x: 200,
    y: 0,
  },
  {
    id: 'j4',
    kind: 'junction',
    name: { ja: '交差点4', en: 'Junction 4' },
    area: 'whity',
    x: 0,
    y: -100,
  },
  {
    id: 'j5',
    kind: 'junction',
    name: { ja: '交差点5', en: 'Junction 5' },
    area: 'whity',
    x: 100,
    y: -100,
  },
];

export const testEdges: MapEdge[] = [
  { from: 'exit1', to: 'j1', distanceM: 100 },
  { from: 'j1', to: 'j2', distanceM: 100 },
  { from: 'j2', to: 'j3', distanceM: 100 },
  { from: 'j1', to: 'j4', distanceM: 100 },
  { from: 'j4', to: 'j5', distanceM: 100 },
  { from: 'j2', to: 'j5', distanceM: 100, attrs: ['stairs'] },
];

export const testShops: Shop[] = [
  {
    id: 'shop-a',
    name: { ja: '店A', en: 'Shop A' },
    category: 'cafe',
    nodeId: 'j2',
  },
  {
    id: 'shop-b',
    name: { ja: '店B', en: 'Shop B' },
    category: 'restaurant',
    nodeId: 'j3',
  },
  {
    id: 'shop-c',
    name: { ja: '店C', en: 'Shop C' },
    category: 'goods',
    nodeId: 'j4',
  },
];
