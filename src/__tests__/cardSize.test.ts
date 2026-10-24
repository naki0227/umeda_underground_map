import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');
const rule = (selector: string) => {
  const start = css.indexOf(`\n${selector} {`);
  expect(start, selector).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf('\n}', start));
};

describe('card sizes', () => {
  it('keeps every destination card the same size, whatever the name', () => {
    expect(rule('.spot-card')).toMatch(/\n {2}width: \d+px;/);
    expect(rule('.spot-card')).toMatch(/\n {2}height: \d+px;/);
    expect(rule('.spot-name')).toMatch(/line-clamp: 2;/);
  });

  it('keeps the next-step card the same height on every step', () => {
    expect(rule('.next-step-card')).toMatch(/\n {2}height: \d+px;/);
    expect(rule('.next-action')).toMatch(/line-clamp: 2;/);
  });
});
