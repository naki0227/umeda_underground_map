/**
 * 拡大率に応じた表示の細かさ。k は画面 1px あたりのマップ単位（大きいほど引いた表示）。
 *
 * - overview: 全体を見渡す。広場・改札・地下街の名前・建物だけ。出口は点だけ
 * - normal:   出口番号は経路沿いと選んだ場所の近くだけ。設備チップは経路上だけ
 * - detail:   すべての出口番号・店の点と名前・設備チップ
 */
export type DetailLevel = 'overview' | 'normal' | 'detail';

export const OVERVIEW_MIN_K = 1.6;
export const DETAIL_MAX_K = 0.7;

export function detailLevel(k: number): DetailLevel {
  if (k >= OVERVIEW_MIN_K) return 'overview';
  if (k < DETAIL_MAX_K) return 'detail';
  return 'normal';
}
