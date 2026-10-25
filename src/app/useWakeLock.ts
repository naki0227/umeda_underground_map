import { useEffect } from 'react';

type WakeLockSentinelLike = { release: () => Promise<void> };
type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
};

/**
 * 案内中は画面を消さない（Screen Wake Lock。iOS 16.4 以降・Android Chrome）。
 * 裏に回ると外れるので、戻ってきたら取り直す。使えない端末では何もしない
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    const wakeLock = (globalThis.navigator as NavigatorWithWakeLock | undefined)?.wakeLock;
    if (!active || wakeLock === undefined) return;
    let sentinel: WakeLockSentinelLike | null = null;
    let stopped = false;
    const acquire = () => {
      if (document.visibilityState !== 'visible') return;
      wakeLock
        .request('screen')
        .then((s) => {
          if (stopped) void s.release();
          else sentinel = s;
        })
        .catch(() => {
          // 省電力モードなどで断られても案内は続けられる
        });
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', acquire);
      void sentinel?.release().catch(() => {});
    };
  }, [active]);
}
