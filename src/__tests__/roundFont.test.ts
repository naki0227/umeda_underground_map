import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');
const font = resolve(__dirname, '../assets/fonts/round-600.woff2');

describe('round font for numbers', () => {
  it('loads only latin letters and digits, and stays small', () => {
    const face = css.slice(css.indexOf('@font-face'), css.indexOf('}', css.indexOf('@font-face')));
    expect(face).toContain("url('./assets/fonts/round-600.woff2')");
    expect(face).toContain('unicode-range: U+0020-007E');
    expect(face).toContain('font-display: swap');
    expect(statSync(font).size).toBeLessThan(12 * 1024);
  });

  it('comes first in the round font stack, with the license next to it', () => {
    expect(css).toMatch(/--font-round:\s*'Umeda Round'/);
    expect(readFileSync(resolve(__dirname, '../assets/fonts/OFL-Fredoka.txt'), 'utf8')).toContain(
      'SIL Open Font License',
    );
  });
});
