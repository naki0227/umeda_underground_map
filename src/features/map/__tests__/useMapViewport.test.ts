import { describe, expect, it } from 'vitest';
import { fitRectViewBox } from '../useMapViewport';

const pixel = { width: 400, height: 800 };
const limits = { minWidth: 120, maxWidth: 5000 };

describe('fitRectViewBox', () => {
  it('keeps the rect inside the part of the screen not covered by the bars and sheet', () => {
    const rect = { minX: 0, minY: 0, maxX: 300, maxY: 300 };
    const insets = { top: 0.15, bottom: 0.5 };
    const vb = fitRectViewBox(rect, pixel, insets, limits);
    // 見える範囲（上 15%〜下 50% を除く）に矩形が収まる
    const visibleTop = vb.y + vb.h * insets.top;
    const visibleBottom = vb.y + vb.h * (1 - insets.bottom);
    expect(visibleTop).toBeLessThanOrEqual(rect.minY);
    expect(visibleBottom).toBeGreaterThanOrEqual(rect.maxY);
    expect(vb.x).toBeLessThanOrEqual(rect.minX);
    expect(vb.x + vb.w).toBeGreaterThanOrEqual(rect.maxX);
    // 縦横比は画面と同じ
    expect(vb.h / vb.w).toBeCloseTo(2);
  });

  it('does not zoom in beyond the minimum width for a tiny rect', () => {
    const vb = fitRectViewBox(
      { minX: 10, minY: 10, maxX: 12, maxY: 12 },
      pixel,
      { top: 0, bottom: 0 },
      limits,
    );
    expect(vb.w).toBe(120);
    expect(vb.x + vb.w / 2).toBeCloseTo(11);
  });

  it('caps the width for a huge rect', () => {
    const vb = fitRectViewBox(
      { minX: 0, minY: 0, maxX: 99999, maxY: 10 },
      pixel,
      { top: 0, bottom: 0 },
      limits,
    );
    expect(vb.w).toBe(5000);
  });
});
