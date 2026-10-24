import { describe, expect, it } from 'vitest';
import {
  clipNear,
  NEAR_M,
  projectCamera,
  projectPolygon,
  segmentsCross,
  toCamera,
  type Camera,
} from '../perspective';

const camera: Camera = {
  position: { x: 0, y: 0 },
  heading: { x: 0, y: 1 },
  eyeM: 1.6,
  width: 360,
  height: 640,
  horizonY: 260,
  focal: 200,
};

describe('perspective', () => {
  it('puts what is straight ahead at eye height on the horizon in the middle', () => {
    const c = toCamera(camera, { x: 0, y: 10 }, 1.6);
    expect(c).toEqual({ forward: 10, right: 0, up: 0 });
    expect(projectCamera(camera, c)).toEqual({ x: 180, y: 260 });
  });

  it('shows the right side on the right and the floor below the horizon', () => {
    const p = projectCamera(camera, toCamera(camera, { x: 2, y: 10 }, 0));
    expect(p.x).toBeCloseTo(220);
    expect(p.y).toBeCloseTo(260 + 32);
  });

  it('cuts away what is behind the eye', () => {
    const clipped = clipNear([
      { forward: -2, right: 0, up: 0 },
      { forward: 4, right: 0, up: 0 },
      { forward: 4, right: 1, up: 0 },
    ]);
    expect(clipped.every((c) => c.forward >= NEAR_M - 1e-9)).toBe(true);
    expect(clipped).toHaveLength(4);
    expect(
      projectPolygon(camera, [
        { p: { x: 0, y: -5 }, z: 0 },
        { p: { x: 1, y: -5 }, z: 0 },
        { p: { x: 1, y: -6 }, z: 0 },
      ]),
    ).toBeNull();
  });

  it('tells when two segments cross', () => {
    expect(segmentsCross({ x: 0, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }, { x: 2, y: 0 })).toBe(
      true,
    );
    expect(segmentsCross({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 })).toBe(
      false,
    );
  });
});
