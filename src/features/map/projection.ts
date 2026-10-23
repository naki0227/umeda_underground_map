/**
 * 地図の投影。真上から見た平面の地図（北が上）。
 * マップ座標は x=東 / y=北（メートル）。SVG は下向きが正なので y を反転する。
 */
export interface ScreenPoint {
  px: number;
  py: number;
}

export function project(x: number, y: number): ScreenPoint {
  return { px: x, py: -y };
}
