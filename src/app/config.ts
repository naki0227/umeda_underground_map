/** 誤り報告用Googleフォーム（2026-07-09作成、日本語版・英語版）。中国語・韓国語は英語版 */
export const REPORT_FORM_URLS: Record<'ja' | 'en', string> = {
  ja: 'https://docs.google.com/forms/d/e/1FAIpQLSdEPsm1gCPNWhKNbl3A5EfGZM0irOg9nzy7Wm3Hwl4NKBg51A/viewform',
  en: 'https://docs.google.com/forms/d/e/1FAIpQLSfQdkhyJl913T427bVISLa0dDnSDL_7NaaCfy0-X4KlMDaq_Q/viewform',
};

/** 徒歩速度（分速メートル）。所要時間の概算に使う。 */
export const WALK_SPEED_M_PER_MIN = 70;

/**
 * 地上ルートを提案する条件: 地下経路の距離が地上の直線距離のこの倍数を超え、
 * かつ直線距離が ABOVE_GROUND_MIN_STRAIGHT_M 以上のとき。
 */
export const ABOVE_GROUND_SUGGEST_RATIO = 1.6;
export const ABOVE_GROUND_MIN_STRAIGHT_M = 150;
