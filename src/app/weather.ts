/**
 * 大阪の天気と警報（気象庁の公開 JSON。ブラウザから直接読める）。
 * 雨の予報なら地上の近道を勧めず地下で案内し、大雨・洪水の警報なら知らせる。
 * 取れないとき（オフライン・形式の変更）は何も出さない。
 */
export const FORECAST_URL = 'https://www.jma.go.jp/bosai/forecast/data/forecast/270000.json';
export const WARNING_URL = 'https://www.jma.go.jp/bosai/warning/data/warning/270000.json';
/** 大阪市（警報の区域コード） */
const OSAKA_CITY = '2710000';
/** 降水確率がこれ以上なら「雨」とみなす（%） */
export const RAIN_POP = 50;

/** 大雨・洪水に関わる警報（コードは気象庁の警報・注意報コード） */
const FLOOD_WARNINGS: Record<string, 'warning' | 'emergency'> = {
  '03': 'warning', // 大雨警報
  '04': 'warning', // 洪水警報
  '33': 'emergency', // 大雨特別警報
};

export interface Weather {
  /** いまの時間帯が雨の予報か */
  rain: boolean;
  /** 大阪市に大雨・洪水の警報が出ているか（特別警報は emergency） */
  floodWarning: 'warning' | 'emergency' | null;
}

type Json = unknown;
const asArray = (v: Json): Json[] => (Array.isArray(v) ? v : []);
const field = (v: Json, k: string): Json =>
  typeof v === 'object' && v !== null ? (v as Record<string, Json>)[k] : undefined;

/** 予報 JSON の、いちばん近い時間帯の降水確率（%）。読めなければ null */
export function currentPop(forecast: Json, now: Date): number | null {
  for (const series of asArray(field(asArray(forecast)[0], 'timeSeries'))) {
    const times = asArray(field(series, 'timeDefines')).map((t) => new Date(String(t)).getTime());
    const pops = asArray(field(asArray(field(series, 'areas'))[0], 'pops'));
    if (pops.length === 0) continue;
    // 時間帯の始まりがいまより前のうち最後のもの（なければ最初）
    let index = 0;
    times.forEach((t, i) => {
      if (t <= now.getTime()) index = i;
    });
    const pop = Number(pops[index]);
    return Number.isFinite(pop) ? pop : null;
  }
  return null;
}

/** 警報 JSON から、大阪市に出ている大雨・洪水の警報（いちばん重いもの） */
export function floodWarningIn(warning: Json): Weather['floodWarning'] {
  let level: Weather['floodWarning'] = null;
  for (const type of asArray(field(warning, 'areaTypes'))) {
    for (const area of asArray(field(type, 'areas'))) {
      if (field(area, 'code') !== OSAKA_CITY) continue;
      for (const w of asArray(field(area, 'warnings'))) {
        const kind = FLOOD_WARNINGS[String(field(w, 'code'))];
        const status = String(field(w, 'status'));
        if (kind === undefined || status === '解除' || status.includes('なし')) continue;
        if (kind === 'emergency' || level === null) level = kind;
      }
    }
  }
  return level;
}

async function getJson(url: string, signal?: AbortSignal): Promise<Json> {
  const response = await fetch(url, { signal, cache: 'no-cache' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** 天気と警報を取りに行く。片方だけ取れたときも、取れた方は使う */
export async function fetchWeather(now = new Date(), signal?: AbortSignal): Promise<Weather> {
  const [forecast, warning] = await Promise.allSettled([
    getJson(FORECAST_URL, signal),
    getJson(WARNING_URL, signal),
  ]);
  const pop = forecast.status === 'fulfilled' ? currentPop(forecast.value, now) : null;
  return {
    rain: pop !== null && pop >= RAIN_POP,
    floodWarning: warning.status === 'fulfilled' ? floodWarningIn(warning.value) : null,
  };
}
