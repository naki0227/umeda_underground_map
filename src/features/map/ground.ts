import { projectToPlane } from '../../domain/geo';
import type { Graph } from '../../domain/graph';
import type { Poi } from '../../domain/types';
import { project, type ScreenPoint } from './iso';

/*
 * 地上の建物は、拡大しても大きくならない小さな立体アイコンで描く（画面 px）。
 * 地図上の位置は地上スポット自身の位置。
 */
export const BUILDING_ICON_HALF_WIDTH_PX = 11;
export const BUILDING_ICON_HEIGHT_PX = 14;
/** 地面から浮かせる高さ（地上にあることを示す） */
export const BUILDING_ICON_LIFT_PX = 8;
/** アイコンの屋根の頂点（基準点からの画面 px。上が負） */
export const BUILDING_ICON_TOP_PX = -(
  BUILDING_ICON_LIFT_PX +
  BUILDING_ICON_HEIGHT_PX +
  BUILDING_ICON_HALF_WIDTH_PX * 0.5
);

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
