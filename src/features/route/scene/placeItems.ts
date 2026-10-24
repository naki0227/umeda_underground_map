import type { SceneItem } from './sceneTypes';

/** 目は起点より少し後ろ（corridorScene の BACK_M と同じ） */
const BACK_M = 3;
const FACADE_M = 5;
const MIN_FACADE_M = 3;
const FACADE_GAP_M = 0.6;
/** 店がまとまっていて元の位置からこれ以上ずれるものは並べない */
const MAX_SHIFT_M = 18;

export interface Placed extends SceneItem {
  start: number;
  end: number;
}

/**
 * 左右それぞれ、店先が重ならないよう並べる。間口は次の店までの間に合わせて 3〜5m に縮め、
 * それでも入らなければ奥へずらす
 */
export function placeItems(items: SceneItem[], length: number): Placed[] {
  const placed: Placed[] = [];
  for (const side of ['left', 'right'] as const) {
    let end = 0;
    const onSide = items
      .filter((item) => item.side === side)
      .sort((a, b) => a.distanceM - b.distanceM);
    onSide.forEach((item, i) => {
      const s = item.distanceM + BACK_M;
      const next = onSide[i + 1]?.distanceM;
      const room = next === undefined ? FACADE_M : next - item.distanceM - FACADE_GAP_M;
      const size = item.kind === 'shop' ? Math.min(FACADE_M, Math.max(MIN_FACADE_M, room)) : 3.5;
      const start = Math.max(s - size / 2, end + FACADE_GAP_M, BACK_M - 1);
      if (start - (s - size / 2) > MAX_SHIFT_M || start + size > length - 0.5) return;
      placed.push({ ...item, start, end: start + size });
      end = start + size;
    });
  }
  return placed;
}
