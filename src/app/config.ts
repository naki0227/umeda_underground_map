import type { AppLanguage } from '../i18n';

/** 誤り報告用Googleフォーム（2026-07-09作成、日本語版・英語版） */
export const REPORT_FORM_URLS: Record<AppLanguage, string> = {
  ja: 'https://docs.google.com/forms/d/e/1FAIpQLSdEPsm1gCPNWhKNbl3A5EfGZM0irOg9nzy7Wm3Hwl4NKBg51A/viewform',
  en: 'https://docs.google.com/forms/d/e/1FAIpQLSfQdkhyJl913T427bVISLa0dDnSDL_7NaaCfy0-X4KlMDaq_Q/viewform',
};

/** 徒歩速度（分速メートル）。所要時間の概算に使う。 */
export const WALK_SPEED_M_PER_MIN = 70;
