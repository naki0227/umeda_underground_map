import { describe, expect, it } from 'vitest';
import { distancesFrom } from '../distances';
import { buildGraph } from '../graph';
import { findRoute, routeNeedsSteps } from '../route';
import type { MapEdge, MapNode } from '../types';

const node = (id: string, x: number, floor: 'B1' | 'B2'): MapNode => ({
  id,
  kind: 'junction',
  name: { ja: id, en: id },
  area: 'whity',
  x,
  y: 0,
  floor,
});

// a(B1) から d(B2) へ。近いのはエスカレーター（a-b-d）、遠回りにエレベーター（a-c-d）
const nodes = [node('a', 0, 'B1'), node('b', 50, 'B1'), node('c', -100, 'B1'), node('d', 60, 'B2')];
const edges: MapEdge[] = [
  { from: 'a', to: 'b', distanceM: 50 },
  { from: 'b', to: 'd', distanceM: 15, attrs: ['escalator'] },
  { from: 'a', to: 'c', distanceM: 100 },
  { from: 'c', to: 'd', distanceM: 170, attrs: ['elevator'] },
];
const graph = buildGraph({ nodes, edges });

describe('elevators only', () => {
  it('uses the escalator normally and the elevator when step-free', () => {
    expect(findRoute(graph, 'a', 'd', { avoidStairs: true })?.nodeIds).toEqual(['a', 'b', 'd']);
    const stepFree = findRoute(graph, 'a', 'd', { avoidStairs: true, stepFree: true });
    expect(stepFree?.nodeIds).toEqual(['a', 'c', 'd']);
    expect(stepFree && routeNeedsSteps(graph, stepFree)).toBe(false);
  });

  it('measures the walking distance to every point at once', () => {
    const d = distancesFrom(graph, 'a');
    expect(d.get('d')).toBe(65);
    expect(d.get('c')).toBe(100);
  });
});
