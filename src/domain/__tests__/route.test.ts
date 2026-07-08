import { describe, expect, it } from 'vitest';
import { buildGraph } from '../graph';
import { findRoute } from '../route';
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
});
