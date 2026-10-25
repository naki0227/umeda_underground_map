import { describe, expect, it } from 'vitest';
import { detectLanguage, initI18n, loadStoredLanguage, localized } from '../index';
import { en } from '../locales/en';
import { ko } from '../locales/ko';
import { zh } from '../locales/zh';
import { ja } from '../locales/ja';
import { es } from '../locales/es';
import { fr } from '../locales/fr';
import { id } from '../locales/id';
import { th } from '../locales/th';
import { vi } from '../locales/vi';
import { zhHant } from '../locales/zhHant';

const ALL = { en, zh, 'zh-Hant': zhHant, ko, th, vi, id, fr, es };

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

  it('uses Traditional Chinese for Taiwan, Hong Kong and zh-Hant', () => {
    expect(detectLanguage('zh-TW')).toBe('zh-Hant');
    expect(detectLanguage('zh-Hant-HK')).toBe('zh-Hant');
    expect(detectLanguage('zh-HK')).toBe('zh-Hant');
  });

  it('detects the other supported languages and falls back to English', () => {
    expect(detectLanguage('th-TH')).toBe('th');
    expect(detectLanguage('vi')).toBe('vi');
    expect(detectLanguage('id-ID')).toBe('id');
    expect(detectLanguage('in')).toBe('id');
    expect(detectLanguage('fr-FR')).toBe('fr');
    expect(detectLanguage('es-MX')).toBe('es');
    expect(detectLanguage('en-US')).toBe('en');
    expect(detectLanguage('de')).toBe('en');
    expect(detectLanguage('')).toBe('en');
  });
});

describe('localized', () => {
  it('returns the requested language', () => {
    const text = { ja: '泉の広場', en: 'Izumi Plaza' };
    expect(localized(text, 'ja')).toBe('泉の広場');
    expect(localized(text, 'en')).toBe('Izumi Plaza');
  });

  it('uses the Chinese and Korean names when there are any, otherwise English', () => {
    const text = {
      ja: '円形広場',
      en: 'Circular Plaza',
      zh: '圆形广场',
      'zh-Hant': '圓形廣場',
      ko: '원형 광장',
    };
    expect(localized(text, 'zh')).toBe('圆形广场');
    expect(localized(text, 'zh-Hant')).toBe('圓形廣場');
    expect(localized(text, 'ko')).toBe('원형 광장');
    expect(localized(text, 'th')).toBe('Circular Plaza');
    expect(localized({ ja: '泉の広場', en: 'Izumi Plaza' }, 'ko')).toBe('Izumi Plaza');
  });
});

describe('translation resources', () => {
  it('every language has every key, with the same {{placeholders}}', () => {
    const flat = (resource: Record<string, Record<string, string>>) =>
      Object.fromEntries(
        Object.entries(resource).flatMap(([section, values]) =>
          Object.entries(values).map(([k, v]) => [`${section}.${k}`, v]),
        ),
      );
    const vars = (text: string) => [...text.matchAll(/{{(\w+)}}/g)].map((m) => m[1]).sort();
    const base = flat(ja);
    for (const [lang, resource] of Object.entries(ALL)) {
      const other = flat(resource);
      expect(Object.keys(other).sort(), lang).toEqual(Object.keys(base).sort());
      for (const key of Object.keys(base)) {
        expect(vars(other[key]), `${lang} ${key}`).toEqual(vars(base[key]));
      }
    }
  });

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
