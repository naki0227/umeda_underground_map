import { describe, expect, it } from 'vitest';
import { breakpoints, buildCorridor, offsetAt, simplifyPath, truncatePath } from '../corridorPath';

describe('corridorPath', () => {
  it('drops small wiggles but keeps real corners', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 0.5, y: 10 },
      { x: 0, y: 20 },
      { x: 20, y: 20 },
    ];
    expect(simplifyPath(points, 1.5)).toEqual([points[0], points[2], points[3]]);
  });

  it('joins the walls at a corner (each wall stays 4m from both segments)', () => {
    // 北へ 20m、東へ 20m（右折）
    const corridor = buildCorridor([
      { x: 0, y: 0 },
      { x: 0, y: 20 },
      { x: 20, y: 20 },
    ]);
    expect(corridor.length).toBeCloseTo(40);
    const outer = offsetAt(corridor, 20, 4); // 左の壁（外側の角）
    expect(outer.x).toBeCloseTo(-4);
    expect(outer.y).toBeCloseTo(24);
    const inner = offsetAt(corridor, 20, -4); // 右の壁（内側の角）
    expect(inner.x).toBeCloseTo(4);
    expect(inner.y).toBeCloseTo(16);
    const mid = offsetAt(corridor, 10, -4);
    expect(mid.x).toBeCloseTo(4);
    expect(mid.y).toBeCloseTo(10);
  });

  it('cuts at the step, the corners and extra points', () => {
    const corridor = buildCorridor([
      { x: 0, y: 0 },
      { x: 0, y: 6 },
      { x: 5, y: 6 },
    ]);
    expect(breakpoints(corridor, 0, 11, 4, [7.5])).toEqual([0, 4, 6, 7.5, 8, 11]);
  });

  it('truncates a path at a distance', () => {
    const cut = truncatePath(
      [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
        { x: 10, y: 10 },
      ],
      15,
    );
    expect(cut).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 10 },
      { x: 5, y: 10 },
    ]);
  });
});
