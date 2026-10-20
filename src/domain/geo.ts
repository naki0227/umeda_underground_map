import type { MapNode } from './types';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapPoint {
  x: number;
  y: number;
}

const METERS_PER_DEG_LAT = 111_320;

/**
 * 緯度経度 → マップ平面座標（x=東 / y=北、メートル相当）の変換。
 * 緯度経度と平面座標の両方を持つノード（出口・改札）から最小二乗で
 * アフィン変換を求める。対応点が3つ未満、または一直線上なら null。
 */
export function fitGeoToMap(nodes: MapNode[]): ((p: LatLng) => MapPoint) | null {
  const pairs = nodes.filter(
    (n): n is MapNode & LatLng => n.lat !== undefined && n.lng !== undefined,
  );
  if (pairs.length < 3) return null;

  // 数値を安定させるため、対応点の重心を原点とするローカルメートル座標で解く
  const lat0 = pairs.reduce((s, n) => s + n.lat, 0) / pairs.length;
  const lng0 = pairs.reduce((s, n) => s + n.lng, 0) / pairs.length;
  const cosLat = Math.cos((lat0 * Math.PI) / 180);
  const local = (p: LatLng) => ({
    e: (p.lng - lng0) * METERS_PER_DEG_LAT * cosLat,
    n: (p.lat - lat0) * METERS_PER_DEG_LAT,
  });

  // 正規方程式 (A^T A) w = A^T b を x と y について解く（A の行 = [e, n, 1]）
  const ata = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const atx = [0, 0, 0];
  const aty = [0, 0, 0];
  for (const node of pairs) {
    const { e, n } = local(node);
    const row = [e, n, 1];
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) ata[i][j] += row[i] * row[j];
      atx[i] += row[i] * node.x;
      aty[i] += row[i] * node.y;
    }
  }
  const wx = solve3(ata, atx);
  const wy = solve3(ata, aty);
  if (wx === null || wy === null) return null;

  return (p: LatLng) => {
    const { e, n } = local(p);
    return { x: wx[0] * e + wx[1] * n + wx[2], y: wy[0] * e + wy[1] * n + wy[2] };
  };
}

/** 3x3 連立一次方程式（クラメルの公式）。特異なら null */
function solve3(m: number[][], b: number[]): number[] | null {
  const det = (a: number[][]) =>
    a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) -
    a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) +
    a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
  const d = det(m);
  if (Math.abs(d) < 1e-9) return null;
  return [0, 1, 2].map(
    (col) => det(m.map((row, i) => row.map((v, j) => (j === col ? b[i] : v)))) / d,
  );
}

/** 平面座標で最も近いノードとその距離 */
export function nearestNode(
  nodes: Iterable<MapNode>,
  point: MapPoint,
): { node: MapNode; distanceM: number } | null {
  let best: { node: MapNode; distanceM: number } | null = null;
  for (const node of nodes) {
    const distanceM = Math.hypot(node.x - point.x, node.y - point.y);
    if (best === null || distanceM < best.distanceM) best = { node, distanceM };
  }
  return best;
}
