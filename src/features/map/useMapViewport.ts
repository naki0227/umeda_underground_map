import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';

export interface Bounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MIN_WIDTH_M = 120;
const MAX_SCALE_FACTOR = 1.6;
const DRAG_THRESHOLD_PX = 6;

/**
 * SVGマップのパン・ズーム（ドラッグ / ホイール / ピンチ / ボタン）を管理する。
 * ドラッグ直後のクリックをピン選択と誤認しないよう isDragging も提供する。
 */
export function useMapViewport(bounds: Bounds) {
  const [viewBox, setViewBox] = useState<ViewBox>({
    x: bounds.minX,
    y: bounds.minY,
    w: bounds.width,
    h: bounds.height,
  });
  const containerRef = useRef<SVGSVGElement | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragged = useRef(false);
  const pinchDistance = useRef<number | null>(null);

  const unitsPerPixel = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 1;
    return viewBox.w / rect.width;
  }, [viewBox.w]);

  const zoomBy = useCallback(
    (factor: number) => {
      setViewBox((vb) => {
        const maxW = bounds.width * MAX_SCALE_FACTOR;
        const w = Math.min(Math.max(vb.w * factor, MIN_WIDTH_M), maxW);
        const h = vb.h * (w / vb.w);
        return { x: vb.x + (vb.w - w) / 2, y: vb.y + (vb.h - h) / 2, w, h };
      });
    },
    [bounds.width],
  );

  const onPointerDown = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    // jsdom等、Pointer Capture未実装の環境では読み飛ばす
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // capture失敗はパン操作に致命的ではないため無視
      }
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) dragged.current = false;
    pinchDistance.current = null;
  }, []);

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      const prev = pointers.current.get(e.pointerId);
      if (!prev) return;
      const current = { x: e.clientX, y: e.clientY };
      pointers.current.set(e.pointerId, current);

      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDistance.current !== null && distance > 0) {
          zoomBy(pinchDistance.current / distance);
        }
        pinchDistance.current = distance;
        dragged.current = true;
        return;
      }

      const dx = current.x - prev.x;
      const dy = current.y - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD_PX) dragged.current = true;
      const upp = unitsPerPixel();
      setViewBox((vb) => ({ ...vb, x: vb.x - dx * upp, y: vb.y - dy * upp }));
    },
    [unitsPerPixel, zoomBy],
  );

  const onPointerUp = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    pinchDistance.current = null;
  }, []);

  const onWheel = useCallback(
    (e: ReactWheelEvent<SVGSVGElement>) => {
      zoomBy(e.deltaY > 0 ? 1.15 : 0.87);
    },
    [zoomBy],
  );

  const isDragging = useCallback(() => dragged.current, []);
  const zoomIn = useCallback(() => zoomBy(0.75), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(1.33), [zoomBy]);
  const reset = useCallback(
    () => setViewBox({ x: bounds.minX, y: bounds.minY, w: bounds.width, h: bounds.height }),
    [bounds],
  );

  return {
    containerRef,
    viewBox: `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onWheel },
    isDragging,
    zoomIn,
    zoomOut,
    reset,
  };
}
