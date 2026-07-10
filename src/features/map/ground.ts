import type { Graph } from '../../domain/graph';
import type { NodeId, Poi } from '../../domain/types';
import { GROUND_ELEVATION, project, type ScreenPoint } from './iso';

export const BUILDING_HALF_WIDTH = 34;
export const BUILDING_HEIGHT = 40;

export interface Building {
  poi: Poi;
  base: ScreenPoint;
  anchor: ScreenPoint;
}

/** 地上の建物: POIをノードごとにまとめて横に並べる */
export function buildBuildings(graph: Graph, pois: Poi[]): Building[] {
  const byNode = new Map<NodeId, Poi[]>();
  for (const poi of pois) {
    const list = byNode.get(poi.nodeId);
    if (list) list.push(poi);
    else byNode.set(poi.nodeId, [poi]);
  }
  const result: Building[] = [];
  for (const [nodeId, group] of byNode) {
    const node = graph.nodes.get(nodeId);
    if (!node) continue;
    const anchor = project(node.x, node.y);
    group.forEach((poi, index) => {
      const spread = (index - (group.length - 1) / 2) * (BUILDING_HALF_WIDTH * 2.4);
      const base = project(node.x, node.y, GROUND_ELEVATION);
      result.push({ poi, base: { px: base.px + spread, py: base.py }, anchor });
    });
  }
  return result.sort((a, b) => a.base.py - b.base.py);
}
