import { describe, expect, it } from 'vitest';
import { umedaMap } from '../../../../data/map';
import { buildSteps } from '../../../../domain/directions';
import { buildGraph } from '../../../../domain/graph';
import { findRoute } from '../../../../domain/route';
import { buildSceneInput, projectOntoPath, SCENE_AHEAD_M } from '../sceneInput';

const graph = buildGraph(umedaMap);

describe('buildSceneInput', () => {
  it('takes the route ahead of each step, with its turn and the shops beside it', () => {
    const ids = [...graph.nodes.values()].filter((n) => n.kind === 'landmark').map((n) => n.id);
    const route = findRoute(graph, ids[0], ids[ids.length - 1]);
    expect(route).not.toBeNull();
    if (route === null) return;
    const steps = buildSteps(graph, route);
    let shops = 0;
    for (const step of steps) {
      const { scene, sideView } = buildSceneInput(
        graph,
        umedaMap.shops,
        route,
        step,
        (t) => t.ja,
        '目的地',
      );
      const start = graph.nodes.get(step.fromNodeId);
      expect(scene.path[0]).toMatchObject({ x: start?.x, y: start?.y });
      for (const item of scene.items) {
        expect(item.distanceM).toBeGreaterThanOrEqual(0);
        expect(item.distanceM).toBeLessThan(SCENE_AHEAD_M + 200);
        expect(['left', 'right']).toContain(item.side);
      }
      shops += scene.items.filter((item) => item.kind === 'shop').length;
      if (
        (step.action === 'left' || step.action === 'right') &&
        step.distanceM < SCENE_AHEAD_M - 10
      ) {
        expect(scene.turn?.distanceM ?? 0).toBeGreaterThan(0);
      }
      // 読み上げ用の一覧は、いまの区間（曲がり角まで）のもの
      for (const item of [...sideView.left, ...sideView.right]) {
        expect(item.distanceM).toBeLessThanOrEqual(step.distanceM + 1);
      }
    }
    expect(shops).toBeGreaterThan(0);
  });

  it('marks the destination when it is within the scene', () => {
    const from = [...graph.nodes.keys()][0];
    const to = graph.adjacency.get(from)?.[0]?.to ?? from;
    const route = findRoute(graph, from, to);
    if (route === null) throw new Error('no route');
    const [step] = buildSteps(graph, route);
    const { scene } = buildSceneInput(graph, umedaMap.shops, route, step, (t) => t.ja, '目的地');
    expect(scene.goal?.text).toBe('目的地');
  });
});

describe('projectOntoPath', () => {
  it('finds how far along the path a shop is and on which side', () => {
    const path = [
      { x: 0, y: 0 },
      { x: 0, y: 20 },
      { x: 20, y: 20 },
    ];
    expect(projectOntoPath(path, { x: -3, y: 8 })).toEqual({ s: 8, offset: 3, distance: 3 });
    const right = projectOntoPath(path, { x: 10, y: 17 });
    expect(right.s).toBeCloseTo(30);
    expect(right.offset).toBeCloseTo(-3);
  });
});
