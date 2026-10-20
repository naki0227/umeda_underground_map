import { describe, expect, it } from 'vitest';
import { routeArrows } from '../routeArrows';

describe('routeArrows', () => {
  it('places arrows at a fixed spacing along the route, pointing forward', () => {
    const arrows = routeArrows(
      [
        { px: 0, py: 0 },
        { px: 100, py: 0 },
        { px: 100, py: 100 },
      ],
      40,
    );
    // 最初は間隔の半分（20）から、以後 40 ごと: 20, 60, 100(=曲がり角の後 0), 140...
    expect(arrows.map((a) => [Math.round(a.at.px), Math.round(a.at.py)])).toEqual([
      [20, 0],
      [60, 0],
      [100, 0],
      [100, 40],
      [100, 80],
    ]);
    expect(arrows[0].angleDeg).toBe(0);
    expect(arrows[3].angleDeg).toBe(90);
  });

  it('returns nothing for a route without length', () => {
    expect(routeArrows([{ px: 5, py: 5 }], 40)).toEqual([]);
    expect(
      routeArrows(
        [
          { px: 5, py: 5 },
          { px: 5, py: 5 },
        ],
        40,
      ),
    ).toEqual([]);
  });
});
