import type { Graph } from '../../domain/graph';
import type { Poi } from '../../domain/types';
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
    items.push({
      poi,
      anchor: project(node.x, node.y),
      ground: project(node.x, node.y, GROUND_ELEVATION),
    });
  }

  // 地上位置が建物1つ分より近いものを同じ列にまとめる（union-find）
  const parent = items.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const dx = Math.abs(items[i].ground.px - items[j].ground.px);
      const dy = Math.abs(items[i].ground.py - items[j].ground.py);
      if (dx < BUILDING_SPACING && dy < BUILDING_HALF_WIDTH * 1.5) parent[find(i)] = find(j);
    }
  }
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
  return result.sort((a, b) => a.base.py - b.base.py);
}
