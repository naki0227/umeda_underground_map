import { describe, expect, it } from 'vitest';
import { applyGesture, IDLE_GESTURE, panGesture, scaleGesture } from '../gesture';

const vb = { x: 100, y: 200, w: 400, h: 800 };
const range = { minS: 0.25, maxS: 4 };

describe('gesture', () => {
  it('moves the map the same way the finger moved', () => {
    // 1px = 1m。右下へ 30px・40px 動かすと、表示範囲は左上へ 30m・40m
    const after = applyGesture(vb, panGesture(IDLE_GESTURE, 30, 40), 1);
    expect(after).toEqual({ x: 70, y: 160, w: 400, h: 800 });
  });

  it('keeps the point between the fingers fixed while zooming', () => {
    const m = { x: 100, y: 300 };
    const g = scaleGesture(IDLE_GESTURE, 2, m, range);
    const after = applyGesture(vb, g, 1);
    expect(after.w).toBe(200);
    // 指の間の地図の位置（画面 100,300 → 地図 200,500）は拡大の前後で同じ
    expect(after.x + m.x * (after.w / 400)).toBeCloseTo(200);
    expect(after.y + m.y * (after.h / 800)).toBeCloseTo(500);
  });

  it('stops at the zoom limits', () => {
    const g = scaleGesture(IDLE_GESTURE, 100, { x: 0, y: 0 }, range);
    expect(g.s).toBe(4);
  });
});
