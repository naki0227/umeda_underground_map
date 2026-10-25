import { describe, expect, it } from 'vitest';
import { nextInDirection } from '../rovingFocus';

//   0 は真ん中、1 は右、2 は右下の少し遠く、3 は上
const points = [
  { x: 100, y: 100 },
  { x: 160, y: 100 },
  { x: 150, y: 140 },
  { x: 100, y: 20 },
];

describe('nextInDirection', () => {
  it('moves to the nearest place in the arrow direction, preferring ones straight ahead', () => {
    expect(nextInDirection(points, 0, 'right')).toBe(1);
    expect(nextInDirection(points, 0, 'up')).toBe(3);
    expect(nextInDirection(points, 0, 'down')).toBe(2);
  });

  it('stays put when nothing lies that way', () => {
    expect(nextInDirection(points, 0, 'left')).toBeNull();
  });
});
