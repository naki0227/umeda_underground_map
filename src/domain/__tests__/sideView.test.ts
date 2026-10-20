import { describe, expect, it } from 'vitest';
import { buildGraph } from '../graph';
import { buildSideView } from '../sideView';
import type { MapNode, Shop } from '../types';
import { projectToPlane } from '../geo';

const node = (id: string, x: number, y: number, kind: MapNode['kind'] = 'junction'): MapNode => ({
  id,
  kind,
  name: { ja: id, en: id },
  area: 'whity',
  x,
  y,
  ...(kind === 'exit' ? { exitNo: id.toUpperCase() } : {}),
});

/*
 * 北へ進む通路 a(0,0) → b(0,50) → c(0,100)。b から西に exit-w、東に side-e が分かれる。
 * 店: b の東（右）・西（左）・位置なし
 */
const graph = buildGraph({
  nodes: [
    node('a', 0, 0),
    node('b', 0, 50),
    node('c', 0, 100),
    node('exit-w', -10, 50, 'exit'),
    node('side-e', 30, 50),
  ],
  edges: [
    { from: 'a', to: 'b', distanceM: 50 },
    { from: 'b', to: 'c', distanceM: 50 },
    { from: 'b', to: 'exit-w', distanceM: 10 },
    { from: 'b', to: 'side-e', distanceM: 30 },
  ],
});
// 平面座標から緯度経度へ戻す（projectToPlane の逆）
const at = (x: number, y: number) => {
  const origin = projectToPlane({ lat: 34.7025, lng: 135.4959 });
  const lat = 34.7025 + (y - origin.y) / 111_320;
  const lng = 135.4959 + (x - origin.x) / (111_320 * Math.cos((34.7025 * Math.PI) / 180));
  return { lat, lng };
};
const shop = (id: string, pos?: { lat: number; lng: number }): Shop => ({
  id,
  name: { ja: id, en: id },
  category: 'cafe',
  nodeId: 'b',
  ...(pos ?? {}),
});
const shops = [shop('east', at(5, 50)), shop('west', at(-5, 50)), shop('unknown')];

describe('buildSideView', () => {
  it('puts shops, exits and side passages on the side they are seen when walking', () => {
    const view = buildSideView(graph, shops, ['a', 'b', 'c']);
    expect(view.right.map((i) => i.key)).toEqual(['shop:east', 'passage:side-e']);
    expect(view.left.map((i) => i.key)).toEqual(['shop:west', 'exit:exit-w']);
    expect(view.along.map((i) => i.key)).toEqual(['shop:unknown']);
    expect(view.left[0].distanceM).toBe(50);
    // 出口は出口番号で出す
    expect(view.left[1].name.ja).toBe('EXIT-W');
  });

  it('swaps left and right when walking the other way', () => {
    const view = buildSideView(graph, shops, ['c', 'b', 'a']);
    expect(view.left.map((i) => i.key)).toEqual(['shop:east', 'passage:side-e']);
    expect(view.right.map((i) => i.key)).toEqual(['shop:west', 'exit:exit-w']);
  });

  it('does not count the way the route continues as a side passage', () => {
    const view = buildSideView(graph, [], ['a', 'b'], ['side-e']);
    expect(view.right).toEqual([]);
  });

  it('shows the exit itself for a stub that only leads to exits', () => {
    // b の東に階段の下の点 stub があり、その先は出口 E-1 だけ
    const withStub = buildGraph({
      nodes: [
        node('a', 0, 0),
        node('b', 0, 50),
        node('c', 0, 100),
        node('stub', 8, 50),
        node('e-1', 12, 50, 'exit'),
      ],
      edges: [
        { from: 'a', to: 'b', distanceM: 50 },
        { from: 'b', to: 'c', distanceM: 50 },
        { from: 'b', to: 'stub', distanceM: 8 },
        { from: 'stub', to: 'e-1', distanceM: 4, attrs: ['stairs'] },
      ],
    });
    const view = buildSideView(withStub, [], ['a', 'b', 'c']);
    expect(view.right.map((i) => i.key)).toEqual(['exit:e-1']);
  });

  it('returns empty lists for an empty step', () => {
    expect(buildSideView(graph, shops, [])).toEqual({ left: [], right: [], along: [] });
  });
});
