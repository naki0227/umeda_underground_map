import { describe, expect, it } from 'vitest';
import {
  breakpoints,
  buildCorridor,
  heightAt,
  offsetAt,
  simplifyPath,
  truncatePath,
} from '../corridorPath';

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

describe('floor heights along the path', () => {
  it('keeps the points where the floor height changes and interpolates between them', () => {
    const points = [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 10, z: 0 },
      { x: 0.3, y: 15, z: 0 },
      { x: 0, y: 20, z: 4.5 },
      { x: 0, y: 30, z: 4.5 },
    ];
    // 高さが変わる点（y=15 の階段の下、y=20 の上）は残り、直線上の y=10 は間引かれる
    const kept = simplifyPath(points, 1.5).map((p) => p.y);
    expect(kept).toEqual([0, 15, 20, 30]);
    const corridor = buildCorridor(simplifyPath(points, 1.5));
    expect(heightAt(corridor, 5)).toBe(0);
    expect(heightAt(corridor, 17.5)).toBeCloseTo(2.25, 1);
    expect(heightAt(corridor, 25)).toBe(4.5);
  });

  it('keeps an elevator (same place, another floor) as a short rise', () => {
    const corridor = buildCorridor([
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 10, z: 0 },
      { x: 0, y: 10, z: 4.5 },
    ]);
    expect(corridor.points).toHaveLength(3);
    expect(corridor.length).toBeCloseTo(10.5);
    expect(heightAt(corridor, corridor.length)).toBe(4.5);
  });
});
