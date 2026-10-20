import { describe, expect, it } from 'vitest';
import { buildGraph } from '../graph';
import { findRoute, routeUsesStairs } from '../route';
import { testEdges, testNodes } from './fixtures';

const graph = buildGraph({ nodes: testNodes, edges: testEdges });

describe('findRoute', () => {
  it('finds the shortest path', () => {
    const route = findRoute(graph, 'exit1', 'j3');
    expect(route?.nodeIds).toEqual(['exit1', 'j1', 'j2', 'j3']);
    expect(route?.totalDistanceM).toBe(300);
  });

  it('prefers the stairs shortcut when allowed', () => {
    const route = findRoute(graph, 'j3', 'j5');
    // j3 -> j2 -> j5 (階段, 200m) が最短
    expect(route?.nodeIds).toEqual(['j3', 'j2', 'j5']);
    expect(route?.totalDistanceM).toBe(200);
  });

  it('avoids stairs when avoidStairs is set', () => {
    const route = findRoute(graph, 'j3', 'j5', { avoidStairs: true });
    // 階段を避けて j3 -> j2 -> j1 -> j4 -> j5 (400m)
    expect(route?.nodeIds).toEqual(['j3', 'j2', 'j1', 'j4', 'j5']);
    expect(route?.totalDistanceM).toBe(400);
  });

  it('returns a zero-length route for same start and goal', () => {
    const route = findRoute(graph, 'j1', 'j1');
    expect(route?.nodeIds).toEqual(['j1']);
    expect(route?.totalDistanceM).toBe(0);
  });

  it('returns null for unknown nodes', () => {
    expect(findRoute(graph, 'nope', 'j1')).toBeNull();
    expect(findRoute(graph, 'j1', 'nope')).toBeNull();
  });

  it('returns null when no path exists', () => {
    const isolated = buildGraph({
      nodes: [...testNodes, { ...testNodes[1], id: 'island' }],
      edges: testEdges,
    });
    expect(findRoute(isolated, 'j1', 'island')).toBeNull();
  });

  it('does not pass through an exit (it would mean going up to the street)', () => {
    // exit1 から地上を通って exit2 へ抜けると近いが、地下の経路（j1 -> j2 -> j3 -> j6）を選ぶ
    const exit2 = { ...testNodes[0], id: 'exit2', x: 300, y: 100, exitNo: 'T-2' };
    const j6 = { ...testNodes[1], id: 'j6', x: 300, y: 0 };
    const withShortcut = buildGraph({
      nodes: [...testNodes, exit2, j6],
      edges: [
        ...testEdges,
        { from: 'j3', to: 'j6', distanceM: 100 },
        { from: 'exit2', to: 'j6', distanceM: 100 },
        { from: 'exit1', to: 'exit2', distanceM: 10 },
      ],
    });
    expect(findRoute(withShortcut, 'j1', 'j6')?.nodeIds).toEqual(['j1', 'j2', 'j3', 'j6']);
    // 出口から出発・出口へ到着するのはよい
    expect(findRoute(withShortcut, 'exit1', 'exit2')?.nodeIds).toEqual(['exit1', 'exit2']);
  });
});

describe('routeUsesStairs', () => {
  it('detects a stairs edge on the route', () => {
    const route = findRoute(graph, 'j3', 'j5');
    expect(route && routeUsesStairs(graph, route)).toBe(true);
  });

  it('is false for a step-free route', () => {
    const route = findRoute(graph, 'j3', 'j5', { avoidStairs: true });
    expect(route && routeUsesStairs(graph, route)).toBe(false);
  });

  it('treats a floor change without a step-free facility as stairs', () => {
    // exit1 は 1F、j1 は B1。エッジに設備属性がないので階段扱い
    const route = findRoute(graph, 'j1', 'exit1');
    expect(route && routeUsesStairs(graph, route)).toBe(true);
  });

  it('is false when the floor change uses an elevator', () => {
    const lifted = buildGraph({
      nodes: testNodes,
      edges: testEdges.map((e) =>
        e.from === 'exit1' ? { ...e, attrs: ['elevator' as const] } : e,
      ),
    });
    const route = findRoute(lifted, 'j1', 'exit1');
    expect(route && routeUsesStairs(lifted, route)).toBe(false);
  });
});
