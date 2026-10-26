import { nearestSnap, SNAP_RATIO, type SheetSnap } from './sheetSnap';

/** これ未満の指の移動では、まだ「シートを動かす」か「中身をスクロールする」かを決めない */
export const SWIPE_DECIDE_PX = 8;
/** これ以上すばやく大きく動かしたら、近い段階ではなく動かした向きの次の段階へ */
export const SWIPE_FLICK_PX = 48;

const ORDER: readonly SheetSnap[] = ['peek', 'half', 'full'];

/**
 * シートの上で指を動かしたとき、シートの高さを変えるか、中身をスクロールするか。
 * 地図アプリのシートと同じく、いちばん高くなるまでは上へなぞるとシートが伸び、
 * 中身がいちばん上のときに下へなぞるとシートが縮む。横の動き（カードの横スクロール）は触らない
 */
export function swipeMode(move: {
  dx: number;
  dy: number;
  scrollTop: number;
  snap: SheetSnap;
}): 'resize' | 'scroll' | null {
  const { dx, dy, scrollTop, snap } = move;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_DECIDE_PX) return null;
  if (Math.abs(dx) > Math.abs(dy)) return 'scroll';
  if (dy < 0) return snap === 'full' ? 'scroll' : 'resize';
  return scrollTop <= 0 ? 'resize' : 'scroll';
}

/** 指を離したときの段階。大きく動かしたら少なくともその向きに 1 段進める */
export function releaseSnap(start: SheetSnap, dy: number, ratio: number): SheetSnap {
  const nearest = nearestSnap(ratio);
  const from = ORDER.indexOf(start);
  const to = ORDER.indexOf(nearest);
  if (dy <= -SWIPE_FLICK_PX && to <= from) return ORDER[Math.min(from + 1, ORDER.length - 1)];
  if (dy >= SWIPE_FLICK_PX && to >= from) return ORDER[Math.max(from - 1, 0)];
  return nearest;
}

/** 指で動かしている間のシートの高さ（画面比）。peek より少し下から full まで */
export const clampRatio = (ratio: number) => Math.min(SNAP_RATIO.full, Math.max(0.15, ratio));
