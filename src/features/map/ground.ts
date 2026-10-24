import { projectToPlane } from '../../domain/geo';
import type { Graph } from '../../domain/graph';
import type { Poi } from '../../domain/types';
import { project, type ScreenPoint } from './projection';

/*
 * 地上スポット（建物）は、拡大しても大きくならない丸いアイコンで描く（画面 px）。
 * 地図上の位置は地上スポット自身の位置。目印は基準点の少し上に描く。
 */
export const BUILDING_ICON_SIZE_PX = 20;
/** 目印の上端（基準点からの画面 px。上が負） */
export const BUILDING_ICON_TOP_PX = -(BUILDING_ICON_SIZE_PX + 2);

export interface Building {
  poi: Poi;
  /** 建物の位置（地面） */
  base: ScreenPoint;
  /** 最寄り出口の位置。選んだ建物だけ、出口までを点線で結ぶ */
  anchor: ScreenPoint;
}

export function buildBuildings(graph: Graph, pois: Poi[]): Building[] {
  const result: Building[] = [];
  for (const poi of pois) {
    const node = graph.nodes.get(poi.nodeId);
    if (!node) continue;
    const at =
      poi.lat !== undefined && poi.lng !== undefined
        ? projectToPlane({ lat: poi.lat, lng: poi.lng })
        : { x: node.x, y: node.y };
    result.push({ poi, base: project(at.x, at.y), anchor: project(node.x, node.y) });
  }
  // 奥（画面の上）から手前へ描く
  return result.sort((a, b) => a.base.py - b.base.py);
}
