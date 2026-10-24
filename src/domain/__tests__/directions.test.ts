import { describe, expect, it } from 'vitest';
import { buildSteps, classifyTurn, stepNodeIds, turnAngleDeg } from '../directions';
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

describe('stepNodeIds', () => {
  it('returns the nodes from the step start to its action point', () => {
    const route = findRoute(graph, 'exit1', 'j5', { avoidStairs: true });
    expect(route).not.toBeNull();
    if (route === null) return;
    const steps = buildSteps(graph, route);
    // exit1 -> j1 で左折（南へ）、j4 で左折（東へ）、j5 に到着
    expect(steps.map((s) => stepNodeIds(route, s))).toEqual([
      ['exit1', 'j1'],
      ['j1', 'j4'],
      ['j4', 'j5'],
    ]);
  });

  it('falls back to the action node when the step is not on the route', () => {
    const route = { nodeIds: ['j1', 'j2'], totalDistanceM: 100 };
    expect(
      stepNodeIds(route, { fromNodeId: 'x', atNodeId: 'j2', action: 'arrive', distanceM: 0 }),
    ).toEqual(['j2']);
  });
});

describe('buildSteps with small bends in the passage line', () => {
  const node = (id: string, x: number, y: number) => ({
    id,
    kind: 'junction' as const,
    name: { ja: id, en: id },
    area: 'whity' as const,
    x,
    y,
  });
  const line = (points: [string, number, number][]) => {
    const nodes = points.map(([id, x, y]) => node(id, x, y));
    const edges = nodes.slice(1).map((n, i) => ({
      from: nodes[i].id,
      to: n.id,
      distanceM: Math.hypot(n.x - nodes[i].x, n.y - nodes[i].y),
    }));
    const g = buildGraph({ nodes, edges });
    const route = findRoute(g, nodes[0].id, nodes[nodes.length - 1].id);
    return buildSteps(g, route as NonNullable<typeof route>);
  };

  it('ignores a small jog that goes back to the same direction', () => {
    // 北へ 30m、右へ 2m ずれて、また北へ 30m：曲がりの案内は出さない
    const steps = line([
      ['a', 0, 0],
      ['b', 0, 30],
      ['c', 2, 30],
      ['d', 2, 60],
    ]);
    expect(steps.map((s) => s.action)).toEqual(['arrive']);
    expect(steps[0].distanceM).toBe(62);
  });

  it('joins two quick turns the same way into one turn', () => {
    // 北へ 30m、右へ 45° を2回（3m おき）で東へ：「30m 先で右」1つにまとめる
    const steps = line([
      ['a', 0, 0],
      ['b', 0, 30],
      ['c', 2.1, 32.1],
      ['d', 5.1, 32.1],
      ['e', 35, 32.1],
    ]);
    expect(steps.map((s) => s.action)).toEqual(['right', 'arrive']);
    expect(steps[0].atNodeId).toBe('c');
  });

  it('does not tell a turn right at the start, before the walker has a direction', () => {
    const steps = line([
      ['a', 0, 0],
      ['b', 1, 0],
      ['c', 1, 40],
    ]);
    expect(steps.map((s) => s.action)).toEqual(['arrive']);
  });
});
