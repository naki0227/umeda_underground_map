import { describe, expect, it } from 'vitest';
import { buildGraph } from '../graph';
import { approxDistanceM, graphDistancesFrom, locate } from '../locate';
import { testEdges, testNodes, testShops } from './fixtures';

const graph = buildGraph({ nodes: testNodes, edges: testEdges });

describe('graphDistancesFrom', () => {
  it('computes distances within the range', () => {
    const distances = graphDistancesFrom(graph, 'j1', 100);
    expect(distances.get('j1')).toBe(0);
    expect(distances.get('j2')).toBe(100);
    expect(distances.get('j3')).toBeUndefined();
  });

  it('returns empty map for unknown source', () => {
    expect(graphDistancesFrom(graph, 'nope', 100).size).toBe(0);
  });
});

describe('approxDistanceM', () => {
  it('is roughly correct for small offsets', () => {
    const a = { lat: 34.7025, lng: 135.4995 };
    const b = { lat: 34.7034, lng: 135.4995 }; // 約100m北
    expect(approxDistanceM(a, b)).toBeGreaterThan(90);
    expect(approxDistanceM(a, b)).toBeLessThan(110);
  });
});

describe('locate', () => {
  it('returns empty for no hints', () => {
    expect(locate(graph, testShops, { nearbyShopIds: [] })).toEqual([]);
  });

  it('pinpoints the node between two shops', () => {
    // 店A(j2) と 店B(j3) が両方見える → j2 か j3 周辺
    const candidates = locate(graph, testShops, { nearbyShopIds: ['shop-a', 'shop-b'] });
    expect(candidates.length).toBeGreaterThan(0);
    const top = candidates[0];
    expect(['j2', 'j3']).toContain(top.nodeId);
    expect(top.confidence).toBe(1);
  });

  it('ignores unknown shop ids', () => {
    const candidates = locate(graph, testShops, { nearbyShopIds: ['ghost'] });
    expect(candidates).toEqual([]);
  });

  it('boosts nodes near the chosen entrance', () => {
    const candidates = locate(graph, testShops, {
      entranceNodeId: 'exit1',
      nearbyShopIds: [],
    });
    expect(candidates[0].nodeId).toBe('exit1');
  });

  it('uses GPS as a weak hint on exits', () => {
    const candidates = locate(graph, testShops, {
      gps: { lat: 34.7025, lng: 135.4995 },
      nearbyShopIds: [],
    });
    expect(candidates.map((c) => c.nodeId)).toContain('exit1');
  });

  it('shop hints outweigh GPS hints', () => {
    const candidates = locate(graph, testShops, {
      gps: { lat: 34.7025, lng: 135.4995 }, // exit1 付近
      nearbyShopIds: ['shop-b'], // だが店B( j3 )が見えている
    });
    expect(candidates[0].nodeId).toBe('j3');
  });
});
