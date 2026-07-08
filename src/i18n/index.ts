import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './locales/en';
import { ja } from './locales/ja';
import type { LocalizedText } from '../domain/types';

export type AppLanguage = 'ja' | 'en';

export function detectLanguage(navigatorLanguage: string): AppLanguage {
  return navigatorLanguage.toLowerCase().startsWith('ja') ? 'ja' : 'en';
}

/** マップデータの多言語名を現在の言語で取り出す */
export function localized(text: LocalizedText, language: string): string {
  return language === 'ja' ? text.ja : text.en;
}

export function initI18n(initialLanguage?: AppLanguage): typeof i18n {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources: {
        ja: { translation: ja },
        en: { translation: en },
      },
      lng: initialLanguage ?? detectLanguage(globalThis.navigator?.language ?? 'ja'),
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
    });
  }
  return i18n;
}
