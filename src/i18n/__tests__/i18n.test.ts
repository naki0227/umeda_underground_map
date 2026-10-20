import { describe, expect, it } from 'vitest';
import { detectLanguage, initI18n, loadStoredLanguage, localized } from '../index';
import { en } from '../locales/en';
import { ko } from '../locales/ko';
import { zh } from '../locales/zh';
import { ja } from '../locales/ja';

describe('detectLanguage', () => {
  it('detects Japanese', () => {
    expect(detectLanguage('ja')).toBe('ja');
    expect(detectLanguage('ja-JP')).toBe('ja');
  });

  it('detects Simplified Chinese and Korean', () => {
    expect(detectLanguage('zh-CN')).toBe('zh');
    expect(detectLanguage('zh')).toBe('zh');
    expect(detectLanguage('ko-KR')).toBe('ko');
  });

  it('falls back to English for other languages, including Traditional Chinese', () => {
    expect(detectLanguage('en-US')).toBe('en');
    expect(detectLanguage('zh-TW')).toBe('en');
    expect(detectLanguage('zh-Hant-HK')).toBe('en');
    expect(detectLanguage('fr')).toBe('en');
    expect(detectLanguage('')).toBe('en');
  });
});

describe('localized', () => {
  it('returns the requested language', () => {
    const text = { ja: '泉の広場', en: 'Izumi Plaza' };
    expect(localized(text, 'ja')).toBe('泉の広場');
    expect(localized(text, 'en')).toBe('Izumi Plaza');
  });
});

describe('translation resources', () => {
  it('ja and en have the same keys', () => {
    const jaKeys = Object.entries(ja).flatMap(([section, values]) =>
      Object.keys(values).map((k) => `${section}.${k}`),
    );
    const enKeys = Object.entries(en).flatMap(([section, values]) =>
      Object.keys(values).map((k) => `${section}.${k}`),
    );
    expect(enKeys.sort()).toEqual(jaKeys.sort());
  });
});

describe('initI18n', () => {
  it('initializes with the given language and translates', () => {
    const instance = initI18n('en');
    expect(instance.t('lost.button')).toBe("I'm lost");
    void instance.changeLanguage('ja');
    expect(instance.t('lost.button')).toBe('迷った');
  });

  it('interpolates variables', () => {
    const instance = initI18n('en');
    void instance.changeLanguage('ja');
    expect(instance.t('route.stepGo', { distance: 120 })).toBe('約120m進む');
  });
});

describe('language persistence', () => {
  it('updates <html lang> and remembers the chosen language', async () => {
    const instance = initI18n('ja');
    await instance.changeLanguage('en');
    expect(document.documentElement.lang).toBe('en');
    expect(loadStoredLanguage()).toBe('en');
    await instance.changeLanguage('ja');
    expect(document.documentElement.lang).toBe('ja');
    expect(loadStoredLanguage()).toBe('ja');
  });

  it('returns null when storage is unavailable', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked');
      },
    });
    try {
      expect(loadStoredLanguage()).toBeNull();
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
    }
  });
});

describe('zh / ko resources', () => {
  const keysOf = (resource: Record<string, Record<string, string>>) =>
    Object.entries(resource)
      .flatMap(([section, values]) => Object.keys(values).map((k) => `${section}.${k}`))
      .sort();
  const placeholders = (text: string) => (text.match(/{{\w+}}/g) ?? []).sort();

  it.each([
    ['zh', zh],
    ['ko', ko],
  ])('%s has every key of ja with the same placeholders and no empty strings', (_, resource) => {
    expect(keysOf(resource)).toEqual(keysOf(ja));
    for (const [section, values] of Object.entries(ja)) {
      for (const [key, text] of Object.entries(values)) {
        const translated = (resource as Record<string, Record<string, string>>)[section][key];
        expect(translated.length, `${section}.${key}`).toBeGreaterThan(0);
        expect(placeholders(translated), `${section}.${key}`).toEqual(placeholders(text));
      }
    }
  });

  it('uses English map names for Chinese and Korean', () => {
    const text = { ja: '泉の広場', en: 'Izumi Plaza' };
    expect(localized(text, 'zh')).toBe('Izumi Plaza');
    expect(localized(text, 'ko')).toBe('Izumi Plaza');
  });

  it('translates through i18next', async () => {
    const instance = initI18n('ja');
    await instance.changeLanguage('zh');
    expect(instance.t('lost.button')).toBe('迷路了');
    await instance.changeLanguage('ko');
    expect(instance.t('lost.button')).toBe('길을 잃었어요');
    expect(document.documentElement.lang).toBe('ko');
    await instance.changeLanguage('ja');
  });
});
