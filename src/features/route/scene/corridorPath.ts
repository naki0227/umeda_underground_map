import type { PlanePoint } from './perspective';

/** 通路の中心線（折れ線）と、起点からの距離 */
export interface Corridor {
  points: PlanePoint[];
  /** 各点までの距離（m） */
  cum: number[];
  length: number;
  /** 各点で、中心線から左へ 1m ずらす向き（角では左右の壁がつながるよう伸ばす） */
  miters: PlanePoint[];
}

/** 角での壁の伸ばし方の上限（鋭い折り返しで壁が飛び出さないように） */
const MITER_LIMIT = 2.5;

/** 折れ線を間引く（Douglas–Peucker）。OSM の細かい折れで壁ががたつかないように */
export function simplifyPath(points: PlanePoint[], toleranceM: number): PlanePoint[] {
  if (points.length <= 2) return points;
  const a = points[0];
  const b = points[points.length - 1];
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  let farthest = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const p = points[i];
    const d =
      length === 0
        ? Math.hypot(p.x - a.x, p.y - a.y)
        : Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / length;
    if (d > farthest) {
      farthest = d;
      index = i;
    }
  }
  if (farthest <= toleranceM) return [a, b];
  return [
    ...simplifyPath(points.slice(0, index + 1), toleranceM).slice(0, -1),
    ...simplifyPath(points.slice(index), toleranceM),
  ];
}

const leftNormal = (a: PlanePoint, b: PlanePoint): PlanePoint => {
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: -(b.y - a.y) / length, y: (b.x - a.x) / length };
};

export function buildCorridor(input: PlanePoint[]): Corridor {
  const points = input.filter(
    (p, i) => i === 0 || Math.hypot(p.x - input[i - 1].x, p.y - input[i - 1].y) > 0.05,
  );
  const cum = [0];
  for (let i = 1; i < points.length; i += 1) {
    cum.push(cum[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  const miters = points.map((p, i) => {
    const before = i > 0 ? leftNormal(points[i - 1], p) : null;
    const after = i < points.length - 1 ? leftNormal(p, points[i + 1]) : null;
    if (before === null) return after ?? { x: 0, y: 0 };
    if (after === null) return before;
    const mx = before.x + after.x;
    const my = before.y + after.y;
    const length = Math.hypot(mx, my);
    if (length < 1e-6) return before;
    const unit = { x: mx / length, y: my / length };
    // 両側の壁から同じ距離になる長さ
    const scale = Math.min(MITER_LIMIT, 1 / Math.max(unit.x * after.x + unit.y * after.y, 1e-6));
    return { x: unit.x * scale, y: unit.y * scale };
  });
  return { points, cum, length: cum[cum.length - 1] ?? 0, miters };
}

/**
 * 起点から s m の位置の、中心線から左へ offsetM ずらした点（右は負）。
 * 折れ目では左右の壁がつながる点（伸ばした角）、区間の途中では中心線から真横の点
 */
export function offsetAt(corridor: Corridor, s: number, offsetM: number): PlanePoint {
  const { points, cum, miters } = corridor;
  if (points.length === 1) return points[0];
  const clamped = Math.min(Math.max(s, 0), corridor.length);
  let i = 0;
  while (i < points.length - 2 && cum[i + 1] < clamped) i += 1;
  const a = { x: points[i].x + miters[i].x * offsetM, y: points[i].y + miters[i].y * offsetM };
  const b = {
    x: points[i + 1].x + miters[i + 1].x * offsetM,
    y: points[i + 1].y + miters[i + 1].y * offsetM,
  };
  const span = cum[i + 1] - cum[i] || 1;
  const ux = (points[i + 1].x - points[i].x) / span;
  const uy = (points[i + 1].y - points[i].y) / span;
  if (clamped >= cum[i + 1]) return b;
  if (clamped <= cum[i]) return a;
  // 中心線の点から真横（左の法線 -uy, ux）にずらし、壁の端（a〜b）の間に収める
  const t = clamped - cum[i];
  const px = points[i].x + ux * t - uy * offsetM;
  const py = points[i].y + uy * t + ux * offsetM;
  const along = Math.min(
    Math.max((px - a.x) * ux + (py - a.y) * uy, 0),
    (b.x - a.x) * ux + (b.y - a.y) * uy,
  );
  return { x: a.x + ux * along, y: a.y + uy * along };
}

/** 区切りの距離（from〜to の間の、step ごとの点と折れ目）を小さい順に返す */
export function breakpoints(
  corridor: Corridor,
  from: number,
  to: number,
  step: number,
  extra: number[] = [],
) {
  const set = new Set<number>([from, to]);
  for (let s = Math.ceil(from / step) * step; s < to; s += step) set.add(s);
  for (const s of [...corridor.cum, ...extra]) if (s > from && s < to) set.add(s);
  return [...set].sort((a, b) => a - b);
}

/** 折れ線を maxM までで切る */
export function truncatePath(points: PlanePoint[], maxM: number): PlanePoint[] {
  const out: PlanePoint[] = points.slice(0, 1);
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    if (total + d >= maxM) {
      const t = d === 0 ? 0 : (maxM - total) / d;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      return out;
    }
    total += d;
    out.push(b);
  }
  return out;
}
