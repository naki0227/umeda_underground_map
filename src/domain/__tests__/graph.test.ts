import { describe, expect, it } from 'vitest';
import { buildGraph, MapDataError } from '../graph';
import { testEdges, testNodes } from './fixtures';

describe('buildGraph', () => {
  it('builds bidirectional adjacency from edges', () => {
    const graph = buildGraph({ nodes: testNodes, edges: testEdges });
    expect(graph.nodes.size).toBe(testNodes.length);
    expect(graph.adjacency.get('j1')?.map((e) => e.to)).toEqual(
      expect.arrayContaining(['exit1', 'j2', 'j4']),
    );
    expect(graph.adjacency.get('exit1')?.map((e) => e.to)).toEqual(['j1']);
  });

  it('keeps edge attributes on both directions', () => {
    const graph = buildGraph({ nodes: testNodes, edges: testEdges });
    const j2ToJ5 = graph.adjacency.get('j2')?.find((e) => e.to === 'j5');
    const j5ToJ2 = graph.adjacency.get('j5')?.find((e) => e.to === 'j2');
    expect(j2ToJ5?.attrs).toContain('stairs');
    expect(j5ToJ2?.attrs).toContain('stairs');
  });

  it('rejects duplicate node ids', () => {
    expect(() => buildGraph({ nodes: [...testNodes, testNodes[0]], edges: [] })).toThrow(
      MapDataError,
    );
  });

  it('rejects edges referencing unknown nodes', () => {
    expect(() =>
      buildGraph({ nodes: testNodes, edges: [{ from: 'j1', to: 'nope', distanceM: 10 }] }),
    ).toThrow(MapDataError);
  });

  it('rejects non-positive distances', () => {
    expect(() =>
      buildGraph({ nodes: testNodes, edges: [{ from: 'j1', to: 'j2', distanceM: 0 }] }),
    ).toThrow(MapDataError);
  });
});
