import { useCallback, useEffect, useRef, useState } from 'react';

export type GeolocationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface GeolocationState {
  status: GeolocationStatus;
  /** accuracyM は端末が返す誤差半径（メートル） */
  position: { lat: number; lng: number; accuracyM: number } | null;
  /** 位置情報を1回だけ取得する（常時追跡はしない） */
  acquire: () => void;
}

/**
 * 単発のGPS取得。地下では失敗・大誤差が普通なので、
 * 呼び出し側はあくまで補助ヒントとして扱うこと。
 */
export function useGeolocation(): GeolocationState {
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [position, setPosition] = useState<GeolocationState['position']>(null);
  /** 最後に出した要求の番号。遅れて返ってきた古い結果で上書きしない */
  const latest = useRef(0);

  const acquire = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    const request = ++latest.current;
    navigator.geolocation.getCurrentPosition(
      (result) => {
        if (request !== latest.current) return;
        setPosition({
          lat: result.coords.latitude,
          lng: result.coords.longitude,
          accuracyM: result.coords.accuracy,
        });
        setStatus('success');
      },
      () => {
        if (request !== latest.current) return;
        // 取れなかったときに前の位置を出し続けない
        setPosition(null);
        setStatus('error');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  }, []);

  return { status, position, acquire };
}

/**
 * 起動時に1回だけ位置情報を取りに行く。すでに拒否されている場合は
 * 何もしない（毎回の許可ダイアログやエラー表示を避ける）。追跡はしない。
 */
export function useInitialGeolocation(): GeolocationState {
  const state = useGeolocation();
  const { acquire } = state;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!('geolocation' in navigator)) return;
      try {
        const permission = await navigator.permissions?.query({ name: 'geolocation' });
        if (permission?.state === 'denied') return;
      } catch {
        // Permissions API がない・失敗するブラウザでは、そのまま取得を試みる
      }
      if (!cancelled) acquire();
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [acquire]);

  return state;
}
