/**
 * 等角投影（アイソメトリック）のヘルパー。
 * マップ座標は x=東 / y=北（メートル相当）。スクリーンでは
 * 東が右下がり・北が右上がりになる立体俯瞰で描く。
 */

const ISO_COS = Math.cos(Math.PI / 6); // ≒0.866
const ISO_SIN = 0.5;

/** 地上レイヤーの持ち上げ量（スクリーン単位） */
export const GROUND_ELEVATION = 200;
/** 通路スラブの厚み（スクリーン単位） */
export const SLAB_DEPTH = 12;

export interface ScreenPoint {
  px: number;
  py: number;
}

/** マップ座標(x,y) と高さ z をスクリーン座標へ投影する */
export function project(x: number, y: number, z = 0): ScreenPoint {
  return {
    px: (x + y) * ISO_COS,
    py: (x - y) * ISO_SIN - z,
  };
}

/** 建物ボックスの各面のポリゴン点列を作る */
export function buildingFaces(center: ScreenPoint, halfWidth: number, height: number) {
  const { px, py } = center;
  const w = halfWidth;
  const h = height;
  const top = [
    `${px},${py - h - w * 0.5}`,
    `${px + w},${py - h}`,
    `${px},${py - h + w * 0.5}`,
    `${px - w},${py - h}`,
  ].join(' ');
  const right = [
    `${px},${py - h + w * 0.5}`,
    `${px + w},${py - h}`,
    `${px + w},${py}`,
    `${px},${py + w * 0.5}`,
  ].join(' ');
  const left = [
    `${px},${py - h + w * 0.5}`,
    `${px - w},${py - h}`,
    `${px - w},${py}`,
    `${px},${py + w * 0.5}`,
  ].join(' ');
  return { top, right, left };
}
