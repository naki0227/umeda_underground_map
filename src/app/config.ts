import type { AppLanguage } from '../i18n';

/**
 * 誤り報告用Googleフォーム。
 * TODO: 実際のフォームを作成してURLを差し替える（日本語版・英語版）。
 */
export const REPORT_FORM_URLS: Record<AppLanguage, string> = {
  ja: 'https://forms.gle/REPLACE_WITH_JA_FORM',
  en: 'https://forms.gle/REPLACE_WITH_EN_FORM',
};

/** 徒歩速度（分速メートル）。所要時間の概算に使う。 */
export const WALK_SPEED_M_PER_MIN = 70;
