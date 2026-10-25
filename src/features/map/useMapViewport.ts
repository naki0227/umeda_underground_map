import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

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
/** ホイール 1px あたりの拡大率（指数）。マウスの1目盛り（約100px）で約1.2倍 */
const WHEEL_ZOOM_RATE = 0.002;
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

/** 画面のうち地図が隠れずに見える縦の範囲（上下から隠れる割合） */
export interface ViewInsets {
  top: number;
  bottom: number;
}

export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** 矩形のまわりに取る余白（矩形の大きさに対する割合） */
const FIT_PADDING_RATIO = 0.15;

/**
 * 矩形（経路や区間）が、上下の UI に隠れない範囲にちょうど収まる表示範囲。
 * 小さすぎる矩形は最大拡大（minWidth）で止め、大きすぎる場合は maxWidth まで。
 */
export function fitRectViewBox(
  rect: Rect,
  pixel: { width: number; height: number },
  insets: ViewInsets,
  limits: { minWidth: number; maxWidth: number },
): ViewBox {
  const aspect = pixel.height / pixel.width;
  const band = Math.max(0.2, 1 - insets.top - insets.bottom);
  const rw = (rect.maxX - rect.minX) * (1 + FIT_PADDING_RATIO * 2);
  const rh = (rect.maxY - rect.minY) * (1 + FIT_PADDING_RATIO * 2);
  const w = Math.min(limits.maxWidth, Math.max(limits.minWidth, rw, rh / band / aspect));
  const h = w * aspect;
  const cx = (rect.minX + rect.maxX) / 2;
  const cy = (rect.minY + rect.maxY) / 2;
  return { x: cx - w / 2, y: cy - h * (insets.top + band / 2), w, h };
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
  const pinch = useRef<{ distance: number; mid: { x: number; y: number } } | null>(null);
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
        return;
      }
      // 画面の向きや大きさが変わったら、幅はそのまま中心を保って縦横比を合わせる
      setViewBox((vb) => {
        const h = vb.w * (height / width);
        return Math.abs(h - vb.h) < 1e-6 ? vb : { ...vb, y: vb.y + (vb.h - h) / 2, h };
      });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [bounds]);

  const unitsPerPixel = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return 1;
    // 既定の xMidYMid meet では縦横で大きい方の倍率になる
    return Math.max(viewBox.w / rect.width, viewBox.h / rect.height);
  }, [viewBox.w, viewBox.h]);

  /**
   * 拡大・縮小。anchor（画面座標）を渡すと、その点の下の地図が動かないように拡大する
   * （ホイールはカーソル、ピンチは2本の指の間）。省略時は画面の中心。
   */
  const zoomBy = useCallback(
    (factor: number, anchor?: { x: number; y: number }) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const fx = anchor && rect && rect.width > 0 ? (anchor.x - rect.left) / rect.width : 0.5;
      const fy = anchor && rect && rect.height > 0 ? (anchor.y - rect.top) / rect.height : 0.5;
      setViewBox((vb) => {
        const maxW = bounds.width * MAX_SCALE_FACTOR;
        const w = Math.min(Math.max(vb.w * factor, MIN_WIDTH_M), maxW);
        const h = vb.h * (w / vb.w);
        return { x: vb.x + (vb.w - w) * fx, y: vb.y + (vb.h - h) * fy, w, h };
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
    pinch.current = null;
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
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const last = pinch.current;
        if (last !== null && distance > 0) {
          // 2本指の移動ぶん地図を動かしてから、指の間を中心に拡大する
          const upp = unitsPerPixel();
          const mx = (mid.x - last.mid.x) * upp;
          const my = (mid.y - last.mid.y) * upp;
          setViewBox((vb) => ({ ...vb, x: vb.x - mx, y: vb.y - my }));
          zoomBy(last.distance / distance, mid);
        }
        pinch.current = { distance, mid };
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
    pinch.current = null;
  }, []);

  // ホイール・トラックパッドのピンチ。ページごと拡大されないよう passive: false で受ける
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      // 行単位のホイールは1行≒16pxとして扱う。1回あたりの倍率は 0.5〜2 に抑える
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const factor = Math.min(2, Math.max(0.5, Math.exp(delta * WHEEL_ZOOM_RATE)));
      zoomBy(factor, { x: e.clientX, y: e.clientY });
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [zoomBy]);

  const isDragging = useCallback(() => dragged.current, []);
  const zoomIn = useCallback(() => zoomBy(0.75), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(1.33), [zoomBy]);
  /** 矩形が上下の UI に隠れずに収まるよう、拡大率と位置を合わせる */
  const fitRect = useCallback(
    (rect: Rect, insets: ViewInsets) =>
      setViewBox(
        fitRectViewBox(rect, pixelSize, insets, {
          minWidth: MIN_WIDTH_M,
          maxWidth: bounds.width * MAX_SCALE_FACTOR,
        }),
      ),
    [pixelSize, bounds.width],
  );

  /**
   * 表示倍率はそのままで、指定したスクリーン座標が見えるように寄せる。
   * anchorY は表示領域の上から何割の高さに置くか（下にシートがあるときは小さくする）。
   */
  const centerOn = useCallback((point: { px: number; py: number }, anchorY = 0.5) => {
    setViewBox((vb) => ({ ...vb, x: point.px - vb.w / 2, y: point.py - vb.h * anchorY }));
  }, []);
  const reset = useCallback(() => setViewBox(fitViewBox(bounds, pixelSize)), [bounds, pixelSize]);

  return {
    containerRef,
    /** 画面 1px あたりのマップ単位。ラベル類はこの倍率で拡縮して一定サイズに見せる */
    // viewBox は既定の xMidYMid meet で収まるため、縦横で大きい方の倍率になる
    unitsPerPixel: Math.max(viewBox.w / pixelSize.width, viewBox.h / pixelSize.height),
    viewBox: `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
    isDragging,
    zoomIn,
    zoomOut,
    reset,
    centerOn,
    fitRect,
  };
}
