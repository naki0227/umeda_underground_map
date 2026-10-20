import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './locales/en';
import { ja } from './locales/ja';
import { ko } from './locales/ko';
import { zh } from './locales/zh';
import type { LocalizedText } from '../domain/types';

export const APP_LANGUAGES = ['ja', 'en', 'zh', 'ko'] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];

const LANGUAGE_STORAGE_KEY = 'umeda-navi.language';

function isAppLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string' && (APP_LANGUAGES as readonly string[]).includes(value);
}

/** 前回選んだ言語。保存できない環境（プライベートモード等）では null */
export function loadStoredLanguage(): AppLanguage | null {
  try {
    const value = globalThis.localStorage?.getItem(LANGUAGE_STORAGE_KEY);
    return isAppLanguage(value) ? value : null;
  } catch {
    return null;
  }
}

function storeLanguage(language: string): void {
  try {
    if (isAppLanguage(language)) globalThis.localStorage?.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // 保存できなくても表示言語の切替自体は有効
  }
}

/** <html lang> を表示言語に合わせる（読み上げの発音に影響する） */
function applyDocumentLanguage(language: string): void {
  if (typeof document !== 'undefined') document.documentElement.lang = language;
}

export function detectLanguage(navigatorLanguage: string): AppLanguage {
  const lang = navigatorLanguage.toLowerCase();
  if (lang.startsWith('ja')) return 'ja';
  // 繁体字（zh-TW / zh-HK / zh-Hant）は簡体字 UI ではなく英語にする
  if (lang.startsWith('zh') && !/^zh-(tw|hk|mo|hant)/.test(lang)) return 'zh';
  if (lang.startsWith('ko')) return 'ko';
  return 'en';
}

/**
 * マップデータの多言語名を現在の言語で取り出す。
 * データは日本語・英語のみなので、中国語・韓国語では英語表記を使う。
 */
export function localized(text: LocalizedText, language: string): string {
  return language === 'ja' ? text.ja : text.en;
}

export function initI18n(initialLanguage?: AppLanguage): typeof i18n {
  if (!i18n.isInitialized) {
    i18n.on('languageChanged', (language) => {
      applyDocumentLanguage(language);
      storeLanguage(language);
    });
    void i18n.use(initReactI18next).init({
      resources: {
        ja: { translation: ja },
        en: { translation: en },
        zh: { translation: zh },
        ko: { translation: ko },
      },
      lng:
        initialLanguage ??
        loadStoredLanguage() ??
        detectLanguage(globalThis.navigator?.language ?? 'ja'),
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
    });
  }
  return i18n;
}
