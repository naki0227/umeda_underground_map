import type { AreaId, MapNode } from '../../domain/types';
import { project, type ScreenPoint } from './iso';

/** エリアの地下ゾーン。スクリーン座標のポリゴンとラベル位置を持つ */
export interface AreaZone {
  area: AreaId;
  /** SVGのpoints属性形式 */
  points: string;
  center: ScreenPoint;
}

/** Monotone chain法の凸包。点が3未満ならそのまま返す */
export function convexHull(points: ScreenPoint[]): ScreenPoint[] {
  const sorted = [...points].sort((a, b) => a.px - b.px || a.py - b.py);
  if (sorted.length < 3) return sorted;
  const cross = (o: ScreenPoint, a: ScreenPoint, b: ScreenPoint) =>
    (a.px - o.px) * (b.py - o.py) - (a.py - o.py) * (b.px - o.px);

  const lower: ScreenPoint[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: ScreenPoint[] = [];
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** 各点の周囲に余白分の点を足してから凸包を取ることで、膨らんだゾーンを得る */
function paddedHull(points: ScreenPoint[], padding: number): ScreenPoint[] {
  const expanded: ScreenPoint[] = [];
  for (const { px, py } of points) {
    expanded.push(
      { px: px + padding, py },
      { px: px - padding, py },
      { px, py: py + padding * 0.6 },
      { px, py: py - padding * 0.6 },
      { px: px + padding * 0.7, py: py + padding * 0.45 },
      { px: px - padding * 0.7, py: py + padding * 0.45 },
      { px: px + padding * 0.7, py: py - padding * 0.45 },
      { px: px - padding * 0.7, py: py - padding * 0.45 },
    );
  }
  return convexHull(expanded);
}

/**
 * エリアごとの地下ゾーンポリゴンを作る。
 * 地上出口ノードはゾーンの形に含めない（地下街の範囲を示すため）。
 */
export function buildAreaZones(nodes: MapNode[], padding = 55): AreaZone[] {
  const byArea = new Map<AreaId, ScreenPoint[]>();
  for (const node of nodes) {
    if (node.kind === 'exit') continue;
    const list = byArea.get(node.area);
    const point = project(node.x, node.y);
    if (list) list.push(point);
    else byArea.set(node.area, [point]);
  }

  const zones: AreaZone[] = [];
  for (const [area, points] of byArea) {
    const hull = paddedHull(points, padding);
    if (hull.length < 3) continue;
    const center = {
      px: hull.reduce((sum, p) => sum + p.px, 0) / hull.length,
      py: hull.reduce((sum, p) => sum + p.py, 0) / hull.length,
    };
    zones.push({
      area,
      points: hull.map((p) => `${Math.round(p.px)},${Math.round(p.py)}`).join(' '),
      center,
    });
  }
  return zones;
}
