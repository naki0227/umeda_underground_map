import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EXIT_FONT_PX,
  FACILITY_FONT_PX,
  LABEL_FONT_PX,
  SHOP_LABEL_FONT_PX,
  ZONE_FONT_PX,
} from '../features/map/mapLabels';

const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

/** :root の文字の大きさの段（px） */
const scale = Object.fromEntries(
  [...css.matchAll(/--fs-([\w-]+):\s*(\d+)px/g)].map(([, name, px]) => [name, Number(px)]),
);

describe('type scale', () => {
  it('has six sizes from 12px up, each clearly bigger than the last', () => {
    const sizes = Object.values(scale).sort((a, b) => a - b);
    expect(sizes).toEqual([12, 14, 16, 20, 24, 32]);
  });

  it('uses only the scale for every font size', () => {
    const sizes = [...css.matchAll(/font-size:\s*([^;]+);/g)].map(([, value]) => value.trim());
    expect(sizes.length).toBeGreaterThan(30);
    for (const value of sizes) expect(value).toMatch(/^var\(--fs-[\w-]+\)$/);
  });

  it('keeps inputs at 16px or more (smaller makes iPhone zoom in while typing)', () => {
    for (const selector of ['.search-bar input', "input[type='search']"]) {
      const rule = css.slice(css.indexOf(`${selector} {`));
      expect(rule.slice(0, rule.indexOf('}'))).toMatch(/font-size: var\(--fs-m\)/);
    }
  });

  it('draws map labels in sizes of the scale', () => {
    const allowed = new Set(Object.values(scale));
    for (const px of [
      EXIT_FONT_PX,
      LABEL_FONT_PX,
      ZONE_FONT_PX,
      FACILITY_FONT_PX,
      SHOP_LABEL_FONT_PX,
    ]) {
      expect(allowed.has(px), String(px)).toBe(true);
    }
  });
});
