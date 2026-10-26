import { useEffect, useRef, type RefObject } from 'react';
import type { SheetSnap } from './sheetSnap';
import { clampRatio, releaseSnap, swipeMode } from './sheetSwipe';

/** シートの下端は画面の下から 74px（タブバーの上）。高さの式は BottomSheet と同じ */
const SHEET_BOTTOM_PX = 74;

/**
 * シートのどこをなぞっても高さを変えられるようにする（つまみだけでなく）。
 * 中身のスクロールとぶつからないよう、動かし始めの向きと中身の位置で決める（sheetSwipe.ts）。
 * 高さを変えている間は既定のスクロールを止めるため、passive でない touchmove を付ける
 */
export function useSheetSwipe(
  sheetRef: RefObject<HTMLElement | null>,
  snap: SheetSnap,
  onDrag: (ratio: number | null) => void,
  onRelease: (snap: SheetSnap) => void,
) {
  const latest = useRef({ snap, onDrag, onRelease });
  latest.current = { snap, onDrag, onRelease };

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    let touch: {
      x: number;
      y: number;
      scrollTop: number;
      startRatio: number;
      mode: 'resize' | 'scroll' | null;
      ratio: number;
    } | null = null;

    const viewport = () => globalThis.innerHeight || 800;
    const onStart = (e: TouchEvent) => {
      // つまみは pointer で動かす（BottomSheet）。2 本指はピンチなので触らない
      if (e.touches.length !== 1 || (e.target as Element).closest?.('.sheet-handle')) {
        touch = null;
        return;
      }
      const startRatio = (sheet.offsetHeight + SHEET_BOTTOM_PX) / viewport();
      touch = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        scrollTop: sheet.scrollTop,
        startRatio,
        mode: null,
        ratio: startRatio,
      };
    };
    const onMove = (e: TouchEvent) => {
      if (touch === null) return;
      const dx = e.touches[0].clientX - touch.x;
      const dy = e.touches[0].clientY - touch.y;
      touch.mode ??= swipeMode({ dx, dy, scrollTop: touch.scrollTop, snap: latest.current.snap });
      if (touch.mode !== 'resize') return;
      e.preventDefault();
      touch.ratio = clampRatio(touch.startRatio - dy / viewport());
      latest.current.onDrag(touch.ratio);
    };
    const onEnd = (e: TouchEvent) => {
      if (touch?.mode === 'resize') {
        const dy = (e.changedTouches[0]?.clientY ?? touch.y) - touch.y;
        latest.current.onRelease(releaseSnap(latest.current.snap, dy, touch.ratio));
        latest.current.onDrag(null);
      }
      touch = null;
    };

    sheet.addEventListener('touchstart', onStart, { passive: true });
    sheet.addEventListener('touchmove', onMove, { passive: false });
    sheet.addEventListener('touchend', onEnd);
    sheet.addEventListener('touchcancel', onEnd);
    return () => {
      sheet.removeEventListener('touchstart', onStart);
      sheet.removeEventListener('touchmove', onMove);
      sheet.removeEventListener('touchend', onEnd);
      sheet.removeEventListener('touchcancel', onEnd);
    };
  }, [sheetRef]);
}
