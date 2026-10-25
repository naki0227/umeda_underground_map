import { describe, expect, it } from 'vitest';
import { StepDetector } from '../stepDetector';

/** 歩いているときの縦の加速度（1 秒に 2 歩、振れ幅 ±3 m/s²）と、静かに持っているとき */
function simulate(detector: StepDetector, seconds: number, walking: boolean): number {
  let steps = 0;
  for (let t = 0; t < seconds * 1000; t += 20) {
    const bounce = walking ? 3 * Math.sin((2 * Math.PI * 2 * t) / 1000) : 0.1 * Math.sin(t);
    if (detector.push(0, 0, 9.81 + bounce, t)) steps += 1;
  }
  return steps;
}

describe('StepDetector', () => {
  it('counts about two steps a second while walking', () => {
    const steps = simulate(new StepDetector(), 10, true);
    expect(steps).toBeGreaterThanOrEqual(18);
    expect(steps).toBeLessThanOrEqual(21);
  });

  it('counts nothing while standing still', () => {
    expect(simulate(new StepDetector(), 10, false)).toBe(0);
  });
});
