import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');
const token = (name: string) => {
  const hit = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!hit) throw new Error(`token --${name} not found`);
  return hit[1];
};

/** WCAG のコントラスト比 */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('text colours', () => {
  const grounds = ['bg', 'paper', 'bg-soft'];

  it.each(['text-strong', 'text', 'text-sub', 'accent-ink', 'warn-ink'])(
    '--%s is readable (4.5:1) on every card and sheet colour',
    (fg) => {
      for (const bg of grounds) expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(['accent-ink', 'warn-ink', 'action'])('white text is readable on --%s', (bg) => {
    expect(contrast('#ffffff', token(bg))).toBeGreaterThanOrEqual(4.5);
  });
});
