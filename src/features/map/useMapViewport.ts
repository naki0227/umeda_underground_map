import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  applyGesture,
  gestureCss,
  IDLE_GESTURE,
  isIdle,
  panGesture,
  scaleGesture,
  type Gesture,
} from './gesture';

import {
  fitRectViewBox,
  fitViewBox,
  type Bounds,
  type Rect,
  type ViewBox,
  type ViewInsets,
} from './viewBoxFit';

const MIN_WIDTH_M = 120;
const MAX_SCALE_FACTOR = 1.6;
const DRAG_THRESHOLD_PX = 6;
/** ホイール 1px あたりの拡大率（指数）。マウスの1目盛り（約100px）で約1.2倍 */
const WHEEL_ZOOM_RATE = 0.002;
/** ホイールが止まってから地図を描き直すまでの時間 */
const WHEEL_SETTLE_MS = 160;
/** 幅を測れない環境（テスト等）で仮定する表示幅 */
const FALLBACK_PIXEL_SIZE = { width: 375, height: 812 };

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

  /** 地図を包む要素（ドラッグ中はこれを CSS で動かす） */
  const panRef = useRef<HTMLDivElement | null>(null);
  const gesture = useRef<Gesture>(IDLE_GESTURE);
  const frame = useRef<number | null>(null);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** viewBox を書き換えたあと、描き終わる前に CSS の動きを外すための印 */
  const clearOnCommit = useRef(false);
  const viewBoxRef = useRef(viewBox);
  viewBoxRef.current = viewBox;

  /** 地図の枠の位置と大きさ。動かしている途中の CSS の拡大を含まないよう、動かない親で測る */
  const frameRect = useCallback(
    () => (panRef.current?.parentElement ?? containerRef.current)?.getBoundingClientRect(),
    [],
  );

  /** 画面 1px あたりの地図の長さ（既定の xMidYMid meet では縦横で大きい方） */
  const unitsPerPixel = useCallback(() => {
    const rect = frameRect();
    const vb = viewBoxRef.current;
    if (!rect || rect.width === 0 || rect.height === 0) return 1;
    return Math.max(vb.w / rect.width, vb.h / rect.height);
  }, [frameRect]);

  const paint = useCallback(() => {
    frame.current = null;
    const el = panRef.current;
    if (el) el.style.transform = isIdle(gesture.current) ? '' : gestureCss(gesture.current);
  }, []);

  const setGesture = useCallback(
    (next: Gesture) => {
      gesture.current = next;
      // パンを包む要素がない（テスト等）ときはその場で反映する
      if (!panRef.current) return;
      if (frame.current === null) frame.current = requestAnimationFrame(paint);
    },
    [paint],
  );

  /** 途中の動きを viewBox に反映する。CSS の動きは新しい viewBox を描く直前に外す */
  const commit = useCallback(() => {
    if (wheelTimer.current !== null) {
      clearTimeout(wheelTimer.current);
      wheelTimer.current = null;
    }
    const g = gesture.current;
    if (isIdle(g)) return;
    const upp = unitsPerPixel();
    gesture.current = IDLE_GESTURE;
    clearOnCommit.current = true;
    setViewBox((vb) => applyGesture(vb, g, upp));
  }, [unitsPerPixel]);

  useLayoutEffect(() => {
    if (!clearOnCommit.current) return;
    clearOnCommit.current = false;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    paint();
  }, [viewBox, paint]);

  /** 拡大できる範囲（いまの幅に対する倍率） */
  const scaleRange = useCallback(() => {
    const w = viewBoxRef.current.w;
    return { minS: w / (bounds.width * MAX_SCALE_FACTOR), maxS: w / MIN_WIDTH_M };
  }, [bounds.width]);

  /** 画面座標を、地図を包む要素の左上からの座標に */
  const local = useCallback(
    (p: { x: number; y: number }) => {
      const rect = frameRect();
      return rect ? { x: p.x - rect.left, y: p.y - rect.top } : p;
    },
    [frameRect],
  );

  /**
   * 拡大・縮小。anchor（画面座標）を渡すと、その点の下の地図が動かないように拡大する
   * （ボタンは画面の中心）。
   */
  const zoomBy = useCallback(
    (factor: number, anchor?: { x: number; y: number }) => {
      commit();
      const rect = frameRect();
      const fx = anchor && rect && rect.width > 0 ? (anchor.x - rect.left) / rect.width : 0.5;
      const fy = anchor && rect && rect.height > 0 ? (anchor.y - rect.top) / rect.height : 0.5;
      setViewBox((vb) => {
        const maxW = bounds.width * MAX_SCALE_FACTOR;
        const w = Math.min(Math.max(vb.w * factor, MIN_WIDTH_M), maxW);
        const h = vb.h * (w / vb.w);
        return { x: vb.x + (vb.w - w) * fx, y: vb.y + (vb.h - h) * fy, w, h };
      });
    },
    [bounds.width, commit, frameRect],
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
        const mid = local({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        const last = pinch.current;
        if (last !== null && last.distance > 0 && distance > 0) {
          // 2本指の移動ぶん地図を動かしてから、指の間を中心に拡大する
          const moved = panGesture(gesture.current, mid.x - last.mid.x, mid.y - last.mid.y);
          setGesture(scaleGesture(moved, distance / last.distance, mid, scaleRange()));
        }
        pinch.current = { distance, mid };
        dragged.current = true;
        return;
      }

      const dx = current.x - prev.x;
      const dy = current.y - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD_PX) dragged.current = true;
      setGesture(panGesture(gesture.current, dx, dy));
      if (!panRef.current) commit();
    },
    [commit, local, scaleRange, setGesture],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      pointers.current.delete(e.pointerId);
      pinch.current = null;
      if (pointers.current.size === 0) commit();
    },
    [commit],
  );

  // ホイール・トラックパッドのピンチ。ページごと拡大されないよう passive: false で受け、
  // 回している間は CSS で拡大して、止まってから地図を描き直す
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      // 行単位のホイールは1行≒16pxとして扱う。1回あたりの倍率は 0.5〜2 に抑える
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const factor = Math.min(2, Math.max(0.5, Math.exp(delta * WHEEL_ZOOM_RATE)));
      if (!panRef.current) {
        zoomBy(factor, { x: e.clientX, y: e.clientY });
        return;
      }
      const at = local({ x: e.clientX, y: e.clientY });
      setGesture(scaleGesture(gesture.current, 1 / factor, at, scaleRange()));
      if (wheelTimer.current !== null) clearTimeout(wheelTimer.current);
      wheelTimer.current = setTimeout(commit, WHEEL_SETTLE_MS);
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [commit, local, scaleRange, setGesture, zoomBy]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      if (wheelTimer.current !== null) clearTimeout(wheelTimer.current);
    },
    [],
  );

  const isDragging = useCallback(() => dragged.current, []);
  const zoomIn = useCallback(() => zoomBy(0.75), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(1.33), [zoomBy]);
  /** 決まった表示範囲へ移す。途中の動き（CSS）は捨てる */
  const jumpTo = useCallback((next: (vb: ViewBox) => ViewBox) => {
    if (wheelTimer.current !== null) clearTimeout(wheelTimer.current);
    wheelTimer.current = null;
    gesture.current = IDLE_GESTURE;
    clearOnCommit.current = true;
    setViewBox(next);
  }, []);
  /** 矩形が上下の UI に隠れずに収まるよう、拡大率と位置を合わせる */
  const fitRect = useCallback(
    (rect: Rect, insets: ViewInsets) =>
      jumpTo(() =>
        fitRectViewBox(rect, pixelSize, insets, {
          minWidth: MIN_WIDTH_M,
          maxWidth: bounds.width * MAX_SCALE_FACTOR,
        }),
      ),
    [pixelSize, bounds.width, jumpTo],
  );

  /**
   * 表示倍率はそのままで、指定したスクリーン座標が見えるように寄せる。
   * anchorY は表示領域の上から何割の高さに置くか（下にシートがあるときは小さくする）。
   */
  const centerOn = useCallback(
    (point: { px: number; py: number }, anchorY = 0.5) =>
      jumpTo((vb) => ({ ...vb, x: point.px - vb.w / 2, y: point.py - vb.h * anchorY })),
    [jumpTo],
  );
  const reset = useCallback(
    () => jumpTo(() => fitViewBox(bounds, pixelSize)),
    [bounds, pixelSize, jumpTo],
  );

  return {
    containerRef,
    panRef,
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
