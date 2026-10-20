import type { Graph } from '../../domain/graph';
import type { Poi } from '../../domain/types';
import { projectToPlane } from '../../domain/geo';
import { GROUND_ELEVATION, project, type ScreenPoint } from './iso';

export const BUILDING_HALF_WIDTH = 34;
export const BUILDING_HEIGHT = 40;
/** 隣り合う建物の中心間隔（スクリーン単位） */
const BUILDING_SPACING = BUILDING_HALF_WIDTH * 2.4;

export interface Building {
  poi: Poi;
  base: ScreenPoint;
  anchor: ScreenPoint;
  /** ラベルの段（0 = 屋根のすぐ上、1 = その上）。並んだ建物のラベルを互い違いにする */
  labelRow: 0 | 1;
}

/**
 * 地上の建物を置く。最寄りノードが近い建物同士（駅中心部など）は1つの列に
 * まとめて横に並べ、建物ボックスが重ならないようにする。
 */
export function buildBuildings(graph: Graph, pois: Poi[]): Building[] {
  const items: { poi: Poi; anchor: ScreenPoint; ground: ScreenPoint }[] = [];
  for (const poi of pois) {
    const node = graph.nodes.get(poi.nodeId);
    if (!node) continue;
    // 建物は地上スポット自身の位置（なければ最寄り出口の位置）に立てる
    const at =
      poi.lat !== undefined && poi.lng !== undefined
        ? projectToPlane({ lat: poi.lat, lng: poi.lng })
        : { x: node.x, y: node.y };
    items.push({
      poi,
      anchor: project(node.x, node.y),
      ground: project(at.x, at.y, GROUND_ELEVATION),
    });
  }

  // 近い建物を同じ列にまとめて横に並べる。並べた結果ほかの列と重なったら
  // その列どうしもまとめ、重なりがなくなるまで繰り返す（union-find）
  const parent = items.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const overlaps = (a: ScreenPoint, b: ScreenPoint) =>
    Math.abs(a.px - b.px) < BUILDING_SPACING && Math.abs(a.py - b.py) < BUILDING_HALF_WIDTH * 1.5;

  const layout = (): Building[] => {
    const clusters = new Map<number, typeof items>();
    items.forEach((item, i) => {
      const root = find(i);
      const list = clusters.get(root);
      if (list) list.push(item);
      else clusters.set(root, [item]);
    });
    const result: Building[] = [];
    for (const cluster of clusters.values()) {
      // 西→東の順に並べ、列の中心を元の位置の平均に合わせる
      cluster.sort((a, b) => a.ground.px - b.ground.px);
      const cx = cluster.reduce((sum, c) => sum + c.ground.px, 0) / cluster.length;
      const cy = cluster.reduce((sum, c) => sum + c.ground.py, 0) / cluster.length;
      cluster.forEach(({ poi, anchor }, index) => {
        const spread = (index - (cluster.length - 1) / 2) * BUILDING_SPACING;
        result.push({
          poi,
          base: { px: cx + spread, py: cy },
          anchor,
          labelRow: (index % 2) as 0 | 1,
        });
      });
    }
    return result;
  };

  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      if (overlaps(items[i].ground, items[j].ground)) parent[find(i)] = find(j);
    }
  }
  let result = layout();
  for (let round = 0; round < items.length; round += 1) {
    const indexOf = new Map(items.map((item, i) => [item.poi.id, i]));
    let merged = false;
    for (let i = 0; i < result.length; i += 1) {
      for (let j = i + 1; j < result.length; j += 1) {
        const a = indexOf.get(result[i].poi.id) as number;
        const b = indexOf.get(result[j].poi.id) as number;
        if (find(a) !== find(b) && overlaps(result[i].base, result[j].base)) {
          parent[find(a)] = find(b);
          merged = true;
        }
      }
    }
    if (!merged) break;
    result = layout();
  }
  return result.sort((a, b) => a.base.py - b.base.py);
}
