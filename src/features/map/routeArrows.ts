import type { ScreenPoint } from './iso';

/** 経路に沿って一定間隔（画面 px）で置く進行方向の矢印 */
export function routeArrows(
  points: ScreenPoint[],
  spacing: number,
): { at: ScreenPoint; angleDeg: number }[] {
  const arrows: { at: ScreenPoint; angleDeg: number }[] = [];
  let carry = spacing / 2;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b.px - a.px, b.py - a.py);
    if (len === 0) continue;
    const angleDeg = (Math.atan2(b.py - a.py, b.px - a.px) * 180) / Math.PI;
    let d = carry;
    while (d < len) {
      const t = d / len;
      arrows.push({ at: { px: a.px + (b.px - a.px) * t, py: a.py + (b.py - a.py) * t }, angleDeg });
      d += spacing;
    }
    carry = d - len;
  }
  return arrows;
}
