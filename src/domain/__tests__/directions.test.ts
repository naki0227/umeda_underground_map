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

  it('emits a floor-change step when leaving through an exit edge', () => {
    // exit1(1F) -> j1(B1) -> j2 : まず地下へ下り、その後直進
    const route = findRoute(graph, 'exit1', 'j2');
    const steps = buildSteps(graph, route as NonNullable<typeof route>);
    expect(steps).toHaveLength(2);
    expect(steps[0]).toMatchObject({
      action: 'floor-change',
      atNodeId: 'j1',
      distanceM: 100,
      floorChange: { from: '1F', to: 'B1', up: false, via: 'stairs' },
    });
    expect(steps[1]).toMatchObject({ action: 'arrive', atNodeId: 'j2', distanceM: 100 });
  });

  it('merges the approach walk into the final floor-change step', () => {
    // j2 -> j1 -> exit1(1F) : 直進100m + 出口の階段100m = 200mの1ステップで終わる
    const route = findRoute(graph, 'j2', 'exit1');
    const steps = buildSteps(graph, route as NonNullable<typeof route>);
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({
      action: 'floor-change',
      atNodeId: 'exit1',
      distanceM: 200,
      floorChange: { from: 'B1', to: '1F', up: true },
    });
  });

  it('emits a turn step at corners', () => {
    // j4 -> j1 -> j2 : 北上してから東へ = 右折
    const route = findRoute(graph, 'j4', 'j2');
    const steps = buildSteps(graph, route as NonNullable<typeof route>);
    expect(steps).toHaveLength(2);
    expect(steps[0]).toMatchObject({ action: 'right', atNodeId: 'j1', distanceM: 100 });
    expect(steps[1]).toMatchObject({ action: 'arrive', atNodeId: 'j2', distanceM: 100 });
  });

  it('returns empty steps for a single-node route', () => {
    const route = findRoute(graph, 'j1', 'j1');
    expect(buildSteps(graph, route as NonNullable<typeof route>)).toEqual([]);
  });
});
