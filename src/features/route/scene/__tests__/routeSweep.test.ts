import { describe, expect, it } from 'vitest';
import { umedaMap } from '../../../../data/map';
import { buildSteps } from '../../../../domain/directions';
import { buildGraph } from '../../../../domain/graph';
import { isUndergroundShop } from '../../../../domain/shopLabel';
import { planRoute } from '../../planRoute';
import { buildScene } from '../corridorScene';
import { placeItems } from '../placeItems';
import { buildSceneInput } from '../sceneInput';

/*
 * いろいろな経路で、一人称の絵を全部の区間について作って確かめる（実データ）。
 * 駅の改札・広場・出口・店の前の点から決まった乱数で組を選び、昼と深夜で経路を作る。
 */
const graph = buildGraph(umedaMap);
const shops = umedaMap.shops.filter(isUndergroundShop);
const nodes = [...graph.nodes.values()];
const places = [
  ...nodes.filter((n) => n.kind !== 'junction'),
  ...shops.map((s) => graph.nodes.get(s.nodeId)).filter((n) => n !== undefined),
];

let seed = 20261024;
const random = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const pairs = Array.from({ length: 160 }, () => {
  const a = places[Math.floor(random() * places.length)];
  const b = places[Math.floor(random() * places.length)];
  return [a.id, b.id] as const;
}).filter(([a, b]) => a !== b);

const finite = (points: string) =>
  points.split(/[ ,]/).every((v) => v !== '' && Number.isFinite(Number(v)));

describe('first-person scenes on many real routes', { timeout: 60_000 }, () => {
  it.each([
    ['noon', 12 * 60],
    ['late night', 23 * 60 + 45],
  ])('builds a sound scene for every step (%s)', (_, minute) => {
    let routes = 0;
    let steps = 0;
    const missingTurn: string[] = [];
    const missingFloor: string[] = [];
    for (const [from, to] of pairs) {
      const planned = planRoute(graph, from, to, { avoidStairs: false, minute });
      if (planned === null) continue;
      routes += 1;
      for (const step of buildSteps(graph, planned.route)) {
        steps += 1;
        const { scene: input, sideView } = buildSceneInput(
          graph,
          shops,
          planned.route,
          step,
          (t) => t.ja,
          '目的地',
          (via, floor) => `${via}で${floor}へ`,
        );
        const scene = buildScene(input);
        const where = `${from}→${to} ${step.fromNodeId}→${step.atNodeId}`;
        // 座標はすべて数
        for (const polygon of scene.polygons) expect(finite(polygon.points), where).toBe(true);
        for (const label of scene.labels) {
          expect(Number.isFinite(label.x) && Number.isFinite(label.y), where).toBe(true);
        }
        // 区間に長さがあれば、通路が描かれる
        if (step.distanceM > 2) expect(scene.polygons.length, where).toBeGreaterThan(10);
        // 店先は左右それぞれ重ならない
        const placed = placeItems(input.items, 500);
        for (const side of ['left', 'right'] as const) {
          const mine = placed.filter((p) => p.side === side).sort((a, b) => a.start - b.start);
          for (let i = 1; i < mine.length; i += 1) {
            expect(mine[i].start, where).toBeGreaterThanOrEqual(mine[i - 1].end);
          }
        }
        // 読み上げ用の左右の一覧は、いまの区間の中だけ
        for (const item of [...sideView.left, ...sideView.right, ...sideView.along]) {
          expect(item.distanceM, where).toBeLessThanOrEqual(step.distanceM + 1);
        }
        // 近い曲がり角には矢印、近い階の移動には札が出る
        const keys = new Set(scene.labels.map((l) => l.key));
        if ((step.action === 'left' || step.action === 'right') && step.distanceM <= 40) {
          if (!keys.has('turn')) missingTurn.push(where);
        }
        if (step.action === 'floor-change' && step.distanceM <= 60 && !keys.has('floor')) {
          missingFloor.push(where);
        }
      }
    }
    expect(routes).toBeGreaterThan(120);
    expect(steps).toBeGreaterThan(500);
    expect(missingTurn, missingTurn.slice(0, 5).join('\n')).toEqual([]);
    expect(missingFloor, missingFloor.slice(0, 5).join('\n')).toEqual([]);
  });
});
