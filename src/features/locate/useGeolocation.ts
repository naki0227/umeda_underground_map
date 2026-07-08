import { useCallback, useState } from 'react';

export type GeolocationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface GeolocationState {
  status: GeolocationStatus;
  position: { lat: number; lng: number } | null;
  /** 位置情報を1回だけ取得する（常時追跡はしない） */
  acquire: () => void;
}

/**
 * 単発のGPS取得。地下では失敗・大誤差が普通なので、
 * 呼び出し側はあくまで補助ヒントとして扱うこと。
 */
export function useGeolocation(): GeolocationState {
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  const acquire = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition({ lat: result.coords.latitude, lng: result.coords.longitude });
        setStatus('success');
      },
      () => {
        setStatus('error');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  }, []);

  return { status, position, acquire };
}
