import { describe, expect, it } from 'vitest';
import { buildSteps, classifyTurn, turnAngleDeg } from '../directions';
import { buildGraph } from '../graph';
import { findRoute } from '../route';
import { testEdges, testNodes } from './fixtures';

const graph = buildGraph({ nodes: testNodes, edges: testEdges });

describe('turnAngleDeg / classifyTurn', () => {
  it('classifies straight, left, right and u-turn', () => {
    expect(classifyTurn(turnAngleDeg(0, 10))).toBe('straight');
    expect(classifyTurn(turnAngleDeg(0, 90))).toBe('right');
    expect(classifyTurn(turnAngleDeg(0, -90))).toBe('left');
    expect(classifyTurn(turnAngleDeg(0, 180))).toBe('u-turn');
    expect(classifyTurn(turnAngleDeg(350, 10))).toBe('straight');
  });
});

describe('buildSteps', () => {
  it('merges straight segments into one step', () => {
    const route = findRoute(graph, 'j1', 'j3');
    expect(route).not.toBeNull();
    const steps = buildSteps(graph, route as NonNullable<typeof route>);
    // j1 -> j2 -> j3 は一直線なので1ステップ
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({ action: 'arrive', atNodeId: 'j3', distanceM: 200 });
  });

  it('emits a turn step at corners', () => {
    // exit1 -> j1 -> j2 : 南下してから東へ = 左折
    const route = findRoute(graph, 'exit1', 'j2');
    const steps = buildSteps(graph, route as NonNullable<typeof route>);
    expect(steps).toHaveLength(2);
    expect(steps[0]).toMatchObject({ action: 'left', atNodeId: 'j1', distanceM: 100 });
    expect(steps[1]).toMatchObject({ action: 'arrive', atNodeId: 'j2', distanceM: 100 });
  });

  it('returns empty steps for a single-node route', () => {
    const route = findRoute(graph, 'j1', 'j1');
    expect(buildSteps(graph, route as NonNullable<typeof route>)).toEqual([]);
  });
});
