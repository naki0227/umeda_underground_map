import { describe, expect, it } from 'vitest';
import { placeLabels, textWidthPx, type LabelBox } from '../labelLayout';

const box = (id: string, x: number, y: number, priority = 0): LabelBox => ({
  id,
  x,
  y,
  width: 40,
  height: 16,
  priority,
});

describe('textWidthPx', () => {
  it('counts full-width characters as 1em and half-width as 0.6em', () => {
    expect(textWidthPx('梅田', 10)).toBe(20);
    expect(textWidthPx('H-8', 10)).toBeCloseTo(18);
  });
});

describe('placeLabels', () => {
  it('shows every label when none overlap', () => {
    const visible = placeLabels([box('a', 0, 0), box('b', 100, 0), box('c', 0, 100)]);
    expect([...visible].sort()).toEqual(['a', 'b', 'c']);
  });

  it('hides the lower-priority label of an overlapping pair', () => {
    const visible = placeLabels([box('low', 0, 0, 1), box('high', 10, 5, 2)]);
    expect([...visible]).toEqual(['high']);
  });

  it('keeps the first label when priorities tie', () => {
    const visible = placeLabels([box('first', 0, 0), box('second', 10, 5)]);
    expect([...visible]).toEqual(['first']);
  });

  it('treats touching edges as not overlapping', () => {
    const visible = placeLabels([box('a', 0, 0), box('b', 40, 0)]);
    expect(visible.size).toBe(2);
  });
});
