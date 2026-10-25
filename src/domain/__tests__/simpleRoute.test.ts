import { describe, expect, it } from 'vitest';
import { buildGraph } from '../graph';
import { findRoute } from '../route';
import type { MapEdge, MapNode } from '../types';

const node = (id: string, x: number, y: number): MapNode => ({
  id,
  kind: 'junction',
  name: { ja: id, en: id },
  area: 'whity',
  x,
  y,
});

/**
 * a から d へ。ジグザグの近道（a-z1-z2-z3-d、4 回曲がる）と、
 * 少し長いまっすぐの道（a-s-d、1 回曲がる）がある
 *
 *   a ─────────── s
 *   │ z1─z2       │
 *   └─┘   └z3─────d
 */
const nodes = [
  node('a', 0, 0),
  node('z1', 0, -40),
  node('z2', 40, -40),
  node('z3', 40, -80),
  node('d', 100, -80),
  node('s', 100, 0),
];
const edges: MapEdge[] = [
  { from: 'a', to: 'z1', distanceM: 40 },
  { from: 'z1', to: 'z2', distanceM: 40 },
  { from: 'z2', to: 'z3', distanceM: 40 },
  { from: 'z3', to: 'd', distanceM: 60 },
  { from: 'a', to: 's', distanceM: 100 },
  { from: 's', to: 'd', distanceM: 85 },
];
const graph = buildGraph({ nodes, edges });

describe('simple routes', () => {
  it('takes the slightly longer route with fewer turns', () => {
    expect(findRoute(graph, 'a', 'd')?.nodeIds).toEqual(['a', 'z1', 'z2', 'z3', 'd']);
    const simple = findRoute(graph, 'a', 'd', { simple: true });
    expect(simple?.nodeIds).toEqual(['a', 's', 'd']);
    expect(simple?.totalDistanceM).toBe(185);
  });

  it('still keeps the shortest route when the detour is too long', () => {
    const far = buildGraph({
      nodes,
      edges: edges.map((e) => (e.from === 's' ? { ...e, distanceM: 400 } : e)),
    });
    expect(findRoute(far, 'a', 'd', { simple: true })?.nodeIds).toEqual([
      'a',
      'z1',
      'z2',
      'z3',
      'd',
    ]);
  });
});
