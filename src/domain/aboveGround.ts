import type { LatLng } from './geo';

export interface AboveGroundCheck {
  /** 地下経路の距離（m） */
  undergroundM: number;
  /** 出発地と目的地の直線距離（m） */
  straightM: number;
  /** 地下経路 / 直線 の比がこれを超えたら提案 */
  ratio: number;
  /** 直線距離がこれ未満なら提案しない（近すぎて差が出ない） */
  minStraightM: number;
}

/** 地上を歩いた方が近い可能性があるか */
export function shouldSuggestAboveGround(check: AboveGroundCheck): boolean {
  if (check.straightM < check.minStraightM) return false;
  return check.undergroundM > check.straightM * check.ratio;
}

/**
 * Google マップの徒歩ルートを開く公開 URL（Maps URLs。API キー不要）。
 * https://developers.google.com/maps/documentation/urls/get-started
 */
export function googleMapsWalkingUrl(origin: LatLng, destination: LatLng): string {
  const fmt = (p: LatLng) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
  const params = new URLSearchParams({
    api: '1',
    origin: fmt(origin),
    destination: fmt(destination),
    travelmode: 'walking',
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
