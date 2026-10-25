import { useCallback, useEffect, useRef, useState } from 'react';
import { StepDetector } from './stepDetector';

type MotionPermission = 'granted' | 'denied';
type DeviceMotionEventWithPermission = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<MotionPermission>;
};

/** 端末の動きのセンサーが使えるか */
export const motionSupported = () => typeof globalThis.DeviceMotionEvent !== 'undefined';

/**
 * 動きのセンサーの許可を求める。iOS はボタンを押したときに呼ぶ必要がある。
 * 許可を求めない端末（Android など）は、そのまま使える
 */
export async function requestMotionPermission(): Promise<boolean> {
  if (!motionSupported()) return false;
  const motion = globalThis.DeviceMotionEvent as DeviceMotionEventWithPermission;
  if (typeof motion.requestPermission !== 'function') return true;
  try {
    return (await motion.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

/**
 * 歩数を数える（active の間だけ）。reset で 0 に戻す（案内のステップが変わったとき）。
 * 画面が消えたり裏に回ったりするとセンサーは止まる。自動でステップは進めない
 */
export function useStepCounter(active: boolean): { steps: number; reset: () => void } {
  const [steps, setSteps] = useState(0);
  const detector = useRef(new StepDetector());
  useEffect(() => {
    if (!active || !motionSupported()) return;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (a?.x == null || a.y == null || a.z == null) return;
      if (detector.current.push(a.x, a.y, a.z, e.timeStamp)) setSteps((n) => n + 1);
    };
    globalThis.addEventListener('devicemotion', onMotion);
    return () => globalThis.removeEventListener('devicemotion', onMotion);
  }, [active]);
  const reset = useCallback(() => setSteps(0), []);
  return { steps, reset };
}
