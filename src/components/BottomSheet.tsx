import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { nearestSnap, nextSnap, SNAP_RATIO, type SheetSnap } from './sheetSnap';

/** これ未満の移動はドラッグではなくタップとみなす */
const DRAG_THRESHOLD_PX = 8;

interface Props {
  label: string;
  initialSnap?: SheetSnap;
  children: ReactNode;
}

/**
 * 画面下部のシート。上端のハンドルを上下にドラッグして高さを変えられる。
 * ハンドルはボタンでもあり、タップ・Enter・Space で段階を切り替える。
 */
export function BottomSheet({ label, initialSnap = 'half', children }: Props) {
  const { t } = useTranslation();
  const [snap, setSnap] = useState<SheetSnap>(initialSnap);
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const drag = useRef<{ startY: number; startRatio: number; moved: boolean } | null>(null);
  /** ドラッグの直後に来る click を段階切替と取り違えないための印 */
  const suppressClick = useRef(false);

  const viewportHeight = () => globalThis.innerHeight || 800;

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    drag.current = { startY: e.clientY, startRatio: SNAP_RATIO[snap], moved: false };
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // capture できなくてもドラッグは継続できる
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const state = drag.current;
    if (state === null) return;
    const dy = e.clientY - state.startY;
    if (Math.abs(dy) > DRAG_THRESHOLD_PX) state.moved = true;
    if (!state.moved) return;
    const ratio = state.startRatio - dy / viewportHeight();
    setDragRatio(Math.min(SNAP_RATIO.full, Math.max(0.15, ratio)));
  };

  const onPointerUp = () => {
    const state = drag.current;
    drag.current = null;
    if (state?.moved && dragRatio !== null) {
      setSnap(nearestSnap(dragRatio));
      suppressClick.current = true;
    }
    setDragRatio(null);
  };

  const onClick = () => {
    // ドラッグ直後の click は無視（pointerup で段階を確定済み）
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setSnap(nextSnap);
  };

  // タブバー（74px）の上に出すので、その分を差し引く
  const height = `calc(${Math.round((dragRatio ?? SNAP_RATIO[snap]) * 100)}dvh - 74px)`;

  return (
    <div
      className={`sheet snap-${snap}${dragRatio !== null ? ' dragging' : ''}`}
      role="dialog"
      aria-label={label}
      data-snap={snap}
      style={{ maxHeight: height }}
    >
      <button
        type="button"
        className="sheet-handle"
        aria-label={t('sheet.resize')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onClick}
      >
        <span aria-hidden />
      </button>
      {children}
    </div>
  );
}
