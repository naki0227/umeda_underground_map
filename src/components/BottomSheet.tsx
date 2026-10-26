import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { nearestSnap, nextSnap, SNAP_RATIO, type SheetSnap } from './sheetSnap';
import { useSheetSwipe } from './useSheetSwipe';

/** これ未満の移動はドラッグではなくタップとみなす */
const DRAG_THRESHOLD_PX = 8;

interface Props {
  label: string;
  initialSnap?: SheetSnap;
  /** Esc キーで閉じる */
  onClose?: () => void;
  children: ReactNode;
}

/**
 * 画面下部のシート。上端のハンドルを上下にドラッグして高さを変えられる。
 * ハンドルはボタンでもあり、タップ・Enter・Space で段階を切り替える。
 */
export function BottomSheet({ label, initialSnap = 'half', onClose, children }: Props) {
  const { t } = useTranslation();
  const [snap, setSnap] = useState<SheetSnap>(initialSnap);
  // 呼び出し側が既定の高さを変えたとき（一人称⇄地図の切り替え）はそれに合わせる
  const [lastInitial, setLastInitial] = useState(initialSnap);
  if (lastInitial !== initialSnap) {
    setLastInitial(initialSnap);
    setSnap(initialSnap);
  }
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const drag = useRef<{ startY: number; startRatio: number; moved: boolean } | null>(null);
  /** ドラッグの直後に来る click を段階切替と取り違えないための印 */
  const suppressClick = useRef(false);

  // 開いたらシートへフォーカスを移し、閉じたら開く前の場所へ戻す（キーボード・読み上げ向け）。
  // 入力欄など、すでにフォーカスがある要素から開いたときはそのままにする
  const sheetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener = document.activeElement;
    const typing =
      opener instanceof HTMLInputElement ||
      opener instanceof HTMLTextAreaElement ||
      opener instanceof HTMLSelectElement;
    if (!typing) sheetRef.current?.focus({ preventScroll: true });
    return () => {
      const lost = document.activeElement === null || document.activeElement === document.body;
      if (lost && opener instanceof HTMLElement && opener.isConnected) {
        opener.focus({ preventScroll: true });
      }
    };
  }, []);

  // つまみ以外をなぞっても高さを変える。中身をスクロールするのはいちばん高いときだけ
  useSheetSwipe(sheetRef, snap, setDragRatio, setSnap);
  // 低くしたら中身は先頭から（低い段階では中身を指でスクロールしないため）
  useEffect(() => {
    if (snap !== 'full' && sheetRef.current) sheetRef.current.scrollTop = 0;
  }, [snap]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && onClose) {
      e.stopPropagation();
      onClose();
    }
  };

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

  // タブバー（74px）の上に出すので、その分を差し引く。横向きの低い画面でも
  // ボタンが見えるよう、160px（画面に収まる範囲で）より低くはしない
  const ratio = Math.round((dragRatio ?? SNAP_RATIO[snap]) * 100);
  const height = `max(min(160px, calc(100dvh - 90px)), calc(${ratio}dvh - 74px))`;

  return (
    <div
      className={`sheet snap-${snap}${dragRatio !== null ? ' dragging' : ''}`}
      role="dialog"
      aria-label={label}
      ref={sheetRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
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
