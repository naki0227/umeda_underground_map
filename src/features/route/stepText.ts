import type { RouteStep } from '../../domain/directions';
import { STRIDE_M } from './stepDetector';

/** 歩数のめやす（歩幅 0.7m）。案内の研究では、距離より歩数のほうが分かりやすいという声が多い */
export const walkingSteps = (meters: number) => {
  const steps = Math.max(1, Math.round(meters / STRIDE_M));
  return steps >= 50 ? Math.round(steps / 10) * 10 : steps;
};

/** ステップの種類をアイコン1文字で表す */
export function stepIcon(step: RouteStep): string {
  switch (step.action) {
    case 'left':
      return '←';
    case 'right':
      return '→';
    case 'u-turn':
      return '↩';
    case 'floor-change':
      return step.floorChange?.up ? '⤴' : '⤵';
    default:
      return '◎';
  }
}
