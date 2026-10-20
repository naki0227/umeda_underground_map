import { describe, expect, it } from 'vitest';
import { buildGraph } from '../../../domain/graph';
import type { MapNode } from '../../../domain/types';
import { buildFloorView, floorForNodes, splitRouteByFloor } from '../floorView';

const node = (id: string, kind: MapNode['kind'], floor?: MapNode['floor']): MapNode => ({
  id,
  kind,
  name: { ja: id, en: id },
  area: 'sanbangai',
  x: 0,
  y: 0,
  ...(floor ? { floor } : {}),
});

// exit(1F) - a(B1) - b(B1) - c(B2) - d(B2)
const graph = buildGraph({
  nodes: [
    node('exit', 'exit'),
    node('a', 'junction'),
    node('b', 'junction'),
    node('c', 'junction', 'B2'),
    node('d', 'junction', 'B2'),
  ],
  edges: [
    { from: 'exit', to: 'a', distanceM: 10, attrs: ['stairs'] },
    { from: 'a', to: 'b', distanceM: 10 },
    { from: 'b', to: 'c', distanceM: 10, attrs: ['escalator'] },
    { from: 'c', to: 'd', distanceM: 10 },
  ],
});
const view = buildFloorView(graph);

describe('buildFloorView', () => {
  it('lists the floors in use from the bottom', () => {
    expect(view.floors).toEqual(['B2', 'B1', '1F']);
  });

  it('shows a node on its floor and on the floors it connects to', () => {
    expect(view.isNodeOnFloor('a', 'B1')).toBe(true);
    expect(view.isNodeOnFloor('d', 'B1')).toBe(false);
    // 出口は地上（1F）の点だが、B1 からも上がれるので B1 にも出す
    expect(view.isNodeOnFloor('exit', 'B1')).toBe(true);
    // エスカレーターの B1 側の端は B2 にも出す
    expect(view.isNodeOnFloor('b', 'B2')).toBe(true);
  });

  it('shows an edge on a floor when either end is there', () => {
    expect(view.isEdgeOnFloor('b', 'c', 'B1')).toBe(true);
    expect(view.isEdgeOnFloor('b', 'c', 'B2')).toBe(true);
    expect(view.isEdgeOnFloor('c', 'd', 'B1')).toBe(false);
  });
});

describe('floorForNodes', () => {
  it('prefers an underground floor over the street level of an exit', () => {
    expect(floorForNodes(view, ['exit', 'a'])).toBe('B1');
    expect(floorForNodes(view, ['c', 'd'])).toBe('B2');
    expect(floorForNodes(view, ['exit'])).toBe('1F');
    expect(floorForNodes(view, [])).toBeNull();
  });
});

describe('splitRouteByFloor', () => {
  it('splits a route into runs on and off the floor, sharing the end points', () => {
    expect(splitRouteByFloor(view, ['exit', 'a', 'b', 'c', 'd'], 'B2')).toEqual([
      { ids: ['exit', 'a', 'b'], onFloor: false },
      { ids: ['b', 'c', 'd'], onFloor: true },
    ]);
  });
});
