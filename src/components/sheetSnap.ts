/** シートの高さの段階（画面の高さに対する割合） */
export type SheetSnap = 'peek' | 'half' | 'full';

const SNAP_ORDER: readonly SheetSnap[] = ['peek', 'half', 'full'];
export const SNAP_RATIO: Record<SheetSnap, number> = { peek: 0.3, half: 0.55, full: 0.85 };
/** 高さ（画面比）に最も近い段階 */
export function nearestSnap(ratio: number): SheetSnap {
  let best: SheetSnap = 'half';
  for (const snap of SNAP_ORDER) {
    if (Math.abs(SNAP_RATIO[snap] - ratio) < Math.abs(SNAP_RATIO[best] - ratio)) best = snap;
  }
  return best;
}

/** タップ・キーボードで次の段階へ（最大の次は最小へ戻る） */
export function nextSnap(snap: SheetSnap): SheetSnap {
  return SNAP_ORDER[(SNAP_ORDER.indexOf(snap) + 1) % SNAP_ORDER.length];
}
