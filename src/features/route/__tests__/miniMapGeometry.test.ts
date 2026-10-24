import { describe, expect, it } from 'vitest';
import { headingUpProjector, headingUpTransform } from '../miniMapGeometry';

const near = (a: { px: number; py: number }, b: { px: number; py: number }) => {
  expect(a.px).toBeCloseTo(b.px);
  expect(a.py).toBeCloseTo(b.py);
};

describe('headingUpProjector', () => {
  const center = { x: 100, y: 200 };

  it('puts the center in the middle and keeps north up when heading north', () => {
    const p = headingUpProjector(center, { x: 0, y: 1 }, 1, 100);
    near(p(center), { px: 50, py: 50 });
    near(p({ x: 100, y: 210 }), { px: 50, py: 40 }); // 北 10m は上
    near(p({ x: 110, y: 200 }), { px: 60, py: 50 }); // 東 10m は右
  });

  it('turns the heading to the top when heading east', () => {
    const p = headingUpProjector(center, { x: 1, y: 0 }, 2, 100);
    near(p({ x: 110, y: 200 }), { px: 50, py: 30 }); // 進む向き（東）は上
    near(p({ x: 100, y: 190 }), { px: 70, py: 50 }); // 右手（南）は右
  });

  it('turns the heading to the top when heading south-west', () => {
    const p = headingUpProjector(center, { x: -1, y: -1 }, 1, 100);
    const ahead = p({ x: 100 - 10 / Math.SQRT2, y: 200 - 10 / Math.SQRT2 });
    near(ahead, { px: 50, py: 40 });
  });
});

describe('headingUpTransform', () => {
  it('matches the projector for points drawn in map screen coordinates (x, -y)', () => {
    const center = { x: 100, y: 200 };
    const heading = { x: 0.6, y: -0.8 };
    const [a, b, c, d, e, f] = headingUpTransform(center, heading, 1.5, 132)
      .slice(7, -1)
      .split(' ')
      .map(Number);
    const project = headingUpProjector(center, heading, 1.5, 132);
    for (const p of [center, { x: 130, y: 180 }, { x: 40, y: 260 }]) {
      const u = p.x;
      const v = -p.y;
      near({ px: a * u + c * v + e, py: b * u + d * v + f }, project(p));
    }
  });
});
