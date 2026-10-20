import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';

export interface Bounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MIN_WIDTH_M = 120;
const MAX_SCALE_FACTOR = 1.6;
const DRAG_THRESHOLD_PX = 6;
/** 幅を測れない環境（テスト等）で仮定する表示幅 */
const FALLBACK_PIXEL_SIZE = { width: 375, height: 812 };

/** 初期表示で最低限見せる範囲（全体幅に対する割合） */
const MIN_INITIAL_WIDTH_RATIO = 0.55;

/**
 * 初期表示（と ⌂ ボタン）の表示範囲。縦長の画面で全体を収めると地図が
 * 小さくなりすぎるため、画面の縦を埋める倍率を基本にし、横幅は全体の
 * 55%〜100% の範囲に収める。中心は全体の中心。
 */
export function fitViewBox(bounds: Bounds, pixel: { width: number; height: number }): ViewBox {
  const fillHeightWidth = bounds.height * (pixel.width / pixel.height);
  const w = Math.min(
    bounds.width,
    Math.max(fillHeightWidth, bounds.width * MIN_INITIAL_WIDTH_RATIO),
  );
  const h = w * (pixel.height / pixel.width);
  const cx = bounds.minX + bounds.width / 2;
  const cy = bounds.minY + bounds.height / 2;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/**
 * SVGマップのパン・ズーム（ドラッグ / ホイール / ピンチ / ボタン）を管理する。
 * ドラッグ直後のクリックをピン選択と誤認しないよう isDragging も提供する。
 */
export function useMapViewport(bounds: Bounds) {
  const [viewBox, setViewBox] = useState<ViewBox>(() => fitViewBox(bounds, FALLBACK_PIXEL_SIZE));
  const containerRef = useRef<SVGSVGElement | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragged = useRef(false);
  const pinchDistance = useRef<number | null>(null);
  const [pixelSize, setPixelSize] = useState(FALLBACK_PIXEL_SIZE);
  const fitted = useRef(false);

  // 表示幅を追跡する（ラベルを画面上で一定サイズにするため）
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      setPixelSize({ width, height });
      // 実寸がわかった最初の1回だけ初期表示を合わせ直す（以降はユーザー操作を優先）
      if (!fitted.current) {
        fitted.current = true;
        setViewBox(fitViewBox(bounds, { width, height }));
      }
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [bounds]);

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
  /** 表示倍率はそのままで、指定したスクリーン座標を中心に寄せる */
  const centerOn = useCallback((point: { px: number; py: number }) => {
    setViewBox((vb) => ({ ...vb, x: point.px - vb.w / 2, y: point.py - vb.h / 2 }));
  }, []);
  const reset = useCallback(() => setViewBox(fitViewBox(bounds, pixelSize)), [bounds, pixelSize]);

  return {
    containerRef,
    /** 画面 1px あたりのマップ単位。ラベル類はこの倍率で拡縮して一定サイズに見せる */
    // viewBox は既定の xMidYMid meet で収まるため、縦横で大きい方の倍率になる
    unitsPerPixel: Math.max(viewBox.w / pixelSize.width, viewBox.h / pixelSize.height),
    viewBox: `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onWheel },
    isDragging,
    zoomIn,
    zoomOut,
    reset,
    centerOn,
  };
}
