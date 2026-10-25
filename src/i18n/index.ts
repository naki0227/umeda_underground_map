import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './locales/en';
import { ja } from './locales/ja';
import { ko } from './locales/ko';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { id } from './locales/id';
import { th } from './locales/th';
import { vi } from './locales/vi';
import { zh } from './locales/zh';
import { zhHant } from './locales/zhHant';
import type { LocalizedText } from '../domain/types';

export const APP_LANGUAGES = [
  'ja',
  'en',
  'zh',
  'zh-Hant',
  'ko',
  'th',
  'vi',
  'id',
  'fr',
  'es',
] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];

const LANGUAGE_STORAGE_KEY = 'umeda-navi.language';

function isAppLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string' && (APP_LANGUAGES as readonly string[]).includes(value);
}

/**
 * URL で指定された言語（?hl=ko）。出口の紹介ページなどから、その言語のまま開くため。
 * 選んだ言語として覚える（languageChanged で保存）
 */
export function languageFromUrl(search = globalThis.location?.search ?? ''): AppLanguage | null {
  const value = new URLSearchParams(search).get('hl');
  return isAppLanguage(value) ? value : null;
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
  // 台湾・香港・マカオと zh-Hant は繁体字、それ以外の中国語は簡体字
  if (lang.startsWith('zh')) return /^zh-(tw|hk|mo|hant)/.test(lang) ? 'zh-Hant' : 'zh';
  // 「in」はインドネシア語の古い言語コード
  if (lang.startsWith('in')) return 'id';
  const base = lang.split('-')[0];
  return APP_LANGUAGES.find((code) => code === base) ?? 'en';
}

/**
 * マップデータの多言語名を現在の言語で取り出す。
 * 中国語（簡体・繁体）・韓国語は、その言語の名前があればそれを、なければ英語名を使う。
 * ほかの言語（タイ語・ベトナム語など）は英語名。
 */
export function localized(text: LocalizedText, language: string): string {
  if (language === 'ja') return text.ja;
  if (language === 'zh' || language === 'zh-Hant' || language === 'ko') {
    return text[language] ?? text.en;
  }
  return text.en;
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
        'zh-Hant': { translation: zhHant },
        ko: { translation: ko },
        th: { translation: th },
        vi: { translation: vi },
        id: { translation: id },
        fr: { translation: fr },
        es: { translation: es },
      },
      lng:
        initialLanguage ??
        languageFromUrl() ??
        loadStoredLanguage() ??
        detectLanguage(globalThis.navigator?.language ?? 'ja'),
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
    });
  }
  return i18n;
}
