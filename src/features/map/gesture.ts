import type { ViewBox } from './viewBoxFit';

/**
 * ドラッグ・ピンチ・ホイールの途中の動き。地図（SVG）を包む要素の CSS transform
 * `translate(tx, ty) scale(s)`（transform-origin は左上）で表し、操作が終わったときに
 * 1回だけ viewBox に反映する。拡大した地図は文字が多く、動かすたびに viewBox を
 * 書き換えると文字の配置を毎回やり直して重くなるため。
 */
export interface Gesture {
  tx: number;
  ty: number;
  s: number;
}

export const IDLE_GESTURE: Gesture = { tx: 0, ty: 0, s: 1 };

export const isIdle = (g: Gesture) => g.tx === 0 && g.ty === 0 && g.s === 1;

export const gestureCss = (g: Gesture) => `translate(${g.tx}px, ${g.ty}px) scale(${g.s})`;

export function panGesture(g: Gesture, dx: number, dy: number): Gesture {
  return { ...g, tx: g.tx + dx, ty: g.ty + dy };
}

/**
 * 点 m（包む要素の左上からの画面座標）を中心に r 倍する。
 * s は [minS, maxS] に収める（地図の拡大の上限・下限）。
 */
export function scaleGesture(
  g: Gesture,
  r: number,
  m: { x: number; y: number },
  range: { minS: number; maxS: number },
): Gesture {
  const s = Math.min(range.maxS, Math.max(range.minS, g.s * r));
  const k = s / g.s;
  return { tx: m.x + k * (g.tx - m.x), ty: m.y + k * (g.ty - m.y), s };
}

/** 途中の動きを viewBox に反映する。upp は動かす前の、画面 1px あたりの地図の長さ */
export function applyGesture(vb: ViewBox, g: Gesture, upp: number): ViewBox {
  return {
    x: vb.x - (g.tx / g.s) * upp,
    y: vb.y - (g.ty / g.s) * upp,
    w: vb.w / g.s,
    h: vb.h / g.s,
  };
}
