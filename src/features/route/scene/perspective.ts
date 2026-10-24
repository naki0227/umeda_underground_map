/**
 * 一人称の表示の透視投影。平面座標（m、東 = +x / 北 = +y）と高さ z（m）の点を、
 * 目の位置と向きから見た画面（SVG 座標）に写す。
 */

export interface PlanePoint {
  x: number;
  y: number;
}

/** 目から見た座標。forward = 前方、right = 右、up = 上（m） */
export interface CameraPoint {
  forward: number;
  right: number;
  up: number;
}

export interface Camera {
  position: PlanePoint;
  /** 向き（単位ベクトル） */
  heading: PlanePoint;
  /** 目の高さ（m） */
  eyeM: number;
  /** 画面の大きさ（SVG 座標） */
  width: number;
  height: number;
  /** 地平線の高さ（SVG の y） */
  horizonY: number;
  /** 焦点距離（SVG 座標） */
  focal: number;
}

/** これより近いものは描かない（m） */
export const NEAR_M = 0.4;

export function toCamera(camera: Camera, p: PlanePoint, z: number): CameraPoint {
  const dx = p.x - camera.position.x;
  const dy = p.y - camera.position.y;
  const { x: hx, y: hy } = camera.heading;
  return { forward: dx * hx + dy * hy, right: dx * hy - dy * hx, up: z - camera.eyeM };
}

export function projectCamera(camera: Camera, c: CameraPoint): { x: number; y: number } {
  return {
    x: camera.width / 2 + (camera.focal * c.right) / c.forward,
    y: camera.horizonY - (camera.focal * c.up) / c.forward,
  };
}

/** 多角形を「目の前 NEAR_M より手前」で切り取る（Sutherland–Hodgman） */
export function clipNear(points: CameraPoint[]): CameraPoint[] {
  const out: CameraPoint[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const aIn = a.forward >= NEAR_M;
    const bIn = b.forward >= NEAR_M;
    if (aIn) out.push(a);
    if (aIn !== bIn) {
      const t = (NEAR_M - a.forward) / (b.forward - a.forward);
      out.push({
        forward: NEAR_M,
        right: a.right + (b.right - a.right) * t,
        up: a.up + (b.up - a.up) * t,
      });
    }
  }
  return out;
}

/** 平面上の点と高さの組からなる多角形を画面の points 属性にする。見えなければ null */
export function projectPolygon(
  camera: Camera,
  points: { p: PlanePoint; z: number }[],
): { points: string; depth: number } | null {
  const clipped = clipNear(points.map(({ p, z }) => toCamera(camera, p, z)));
  if (clipped.length < 3) return null;
  let depth = 0;
  const screen = clipped.map((c) => {
    depth += Math.hypot(c.forward, c.right);
    const { x, y } = projectCamera(camera, c);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return { points: screen.join(' '), depth: depth / clipped.length };
}

/** 線分 a-b と c-d が交わるか（端点の接触は含めない） */
export function segmentsCross(a: PlanePoint, b: PlanePoint, c: PlanePoint, d: PlanePoint) {
  const cross = (o: PlanePoint, p: PlanePoint, q: PlanePoint) =>
    (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return d1 * d2 < 0 && d3 * d4 < 0;
}
