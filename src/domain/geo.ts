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
 * マップ平面座標の原点（JR大阪駅 御堂筋口付近）。x=東, y=北 のメートル。
 * scripts/osm/overlay.mjs の ORIGIN と同じ値にすること。
 */
export const PLANE_ORIGIN: LatLng = { lat: 34.7025, lng: 135.4959 };

/**
 * 緯度経度 → マップ平面座標（正距円筒図法の近似。梅田の範囲なら誤差は数cm）。
 * マップデータの x, y はすべてこれで計算する。
 */
export function projectToPlane(p: LatLng): MapPoint {
  const cos0 = Math.cos((PLANE_ORIGIN.lat * Math.PI) / 180);
  return {
    x: (p.lng - PLANE_ORIGIN.lng) * METERS_PER_DEG_LAT * cos0,
    y: (p.lat - PLANE_ORIGIN.lat) * METERS_PER_DEG_LAT,
  };
}

export interface GeoTransform {
  toMap: (p: LatLng) => MapPoint;
  toGeo: (p: MapPoint) => LatLng;
}

/**
 * 緯度経度 ⇔ マップ平面座標（x=東 / y=北、メートル相当）の変換。
 * 緯度経度と平面座標の両方を持つノード（出口・改札）から最小二乗で
 * アフィン変換を求める。対応点が3つ未満、または一直線上なら null。
 */
export function fitGeoTransform(nodes: MapNode[]): GeoTransform | null {
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

  // 逆変換: [x - cx, y - cy] = M [e, n] を解く
  const det = wx[0] * wy[1] - wx[1] * wy[0];
  if (Math.abs(det) < 1e-12) return null;

  return {
    toMap: (p: LatLng) => {
      const { e, n } = local(p);
      return { x: wx[0] * e + wx[1] * n + wx[2], y: wy[0] * e + wy[1] * n + wy[2] };
    },
    toGeo: (p: MapPoint) => {
      const dx = p.x - wx[2];
      const dy = p.y - wy[2];
      const e = (wy[1] * dx - wx[1] * dy) / det;
      const n = (-wy[0] * dx + wx[0] * dy) / det;
      return { lat: lat0 + n / METERS_PER_DEG_LAT, lng: lng0 + e / (METERS_PER_DEG_LAT * cosLat) };
    },
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
