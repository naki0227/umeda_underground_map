import { describe, expect, it } from 'vitest';
import { detectLanguage, initI18n, localized } from '../index';
import { en } from '../locales/en';
import { ja } from '../locales/ja';

describe('detectLanguage', () => {
  it('detects Japanese', () => {
    expect(detectLanguage('ja')).toBe('ja');
    expect(detectLanguage('ja-JP')).toBe('ja');
  });

  it('falls back to English for other languages', () => {
    expect(detectLanguage('en-US')).toBe('en');
    expect(detectLanguage('zh-CN')).toBe('en');
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
