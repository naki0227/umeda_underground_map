import type { TimeRange, TimedPassageRule } from '../domain/hours';

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

/**
 * 時間帯で通れなくなる通路・設備。出典で確かめられたものだけを入れる。
 * 地下街の通路そのものの開放時間は、各地下街の公式サイトに載っていない（2026-10-20 確認）ため未設定。
 * 分かったら { area, hours, source } を足すと、その時間外は経路に使わなくなる。
 */
export const TIMED_PASSAGES: TimedPassageRule[] = [
  {
    area: 'whity',
    attr: 'escalator',
    hours: { open: '06:00', close: '23:30' },
    source: 'https://whity.osaka-chikagai.jp/faq',
  },
  {
    area: 'whity',
    attr: 'elevator',
    hours: { open: '05:00', close: '23:00' },
    source: 'https://whity.osaka-chikagai.jp/faq',
  },
];

/** この時間帯（日本時間）は、閉まっている通路があるかもしれないと道案内で注意する */
export const LATE_NIGHT: TimeRange = { open: '23:00', close: '06:00' };
