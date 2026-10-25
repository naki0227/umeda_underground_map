import { useEffect, useState } from 'react';
import { fetchWeather, type Weather } from './weather';

/** 取り直す間隔（予報は 1 日数回、警報は随時なので 10 分） */
const REFRESH_MS = 10 * 60 * 1000;

/** 大阪の天気と警報。オフラインや取得失敗のときは null（何も出さない） */
export function useWeather(enabled = true): Weather | null {
  const [weather, setWeather] = useState<Weather | null>(null);
  useEffect(() => {
    if (!enabled || typeof fetch === 'undefined') return;
    const controller = new AbortController();
    const load = () =>
      fetchWeather(new Date(), controller.signal)
        .then(setWeather)
        .catch(() => {
          // 取れなくても案内はできる
        });
    void load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [enabled]);
  return weather;
}
