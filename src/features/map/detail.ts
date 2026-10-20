/**
 * 拡大率に応じた表示の細かさ。k は画面 1px あたりのマップ単位（大きいほど引いた表示）。
 *
 * - overview: 全体を見渡す。店の点・分岐・設備チップは出さず、出口は点だけ
 * - normal:   出口番号・店の点・設備チップを出す
 * - detail:   さらに店名を出す（目印として探しやすくする）
 */
export type DetailLevel = 'overview' | 'normal' | 'detail';

export const OVERVIEW_MIN_K = 1.6;
export const DETAIL_MAX_K = 0.7;

export function detailLevel(k: number): DetailLevel {
  if (k >= OVERVIEW_MIN_K) return 'overview';
  if (k < DETAIL_MAX_K) return 'detail';
  return 'normal';
}
