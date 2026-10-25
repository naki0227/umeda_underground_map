import { describe, expect, it } from 'vitest';
import { localized } from '../../i18n';
import { umedaMap } from '../map';
import { withPlaceTranslations } from '../placeNames';

const hasKana = (text: string) => /[぀-ヿ]/.test(text);
const nodeNamed = (ja: string) => umedaMap.nodes.find((n) => n.name.ja === ja);

describe('Chinese and Korean place names', () => {
  it('names the stations, gates and plazas in each language', () => {
    expect(localized(nodeNamed('JR大阪駅 御堂筋口')!.name, 'ko')).toBe('JR 오사카역 미도스지 출구');
    expect(localized(nodeNamed('円形広場')!.name, 'zh')).toBe('圆形广场');
    expect(localized(nodeNamed('円形広場')!.name, 'zh-Hant')).toBe('圓形廣場');
  });

  it('builds the names of exits and landmarks from their shape', () => {
    const exit = withPlaceTranslations({ ja: 'C-7出口付近', en: 'Near Exit C-7' });
    expect(exit.ko).toBe('C-7 출구 부근');
    expect(exit.zh).toBe('C-7出口附近');
    const front = withPlaceTranslations({ ja: 'スターバックス前', en: 'In front of Starbucks' });
    expect(front.zh).toBe('星巴克前');
    expect(front.ko).toBe('스타벅스 앞');
    // チェーンの支店も、チェーン名で
    const branch = withPlaceTranslations({
      ja: 'タリーズコーヒー ディアモール大阪店',
      en: "Tully's Coffee Diamor Osaka",
    });
    expect(branch.ko).toBe('털리스 커피');
  });

  it('keeps kanji-only shop names for Chinese and uses English otherwise', () => {
    expect(withPlaceTranslations({ ja: '北京飯店', en: 'Beijing Hanten' }).zh).toBe('北京飯店');
    expect(withPlaceTranslations({ ja: 'つるとんたん', en: 'Tsurutontan' }).zh).toBe('Tsurutontan');
    // 店名がたまたま「…前」で終わっても、目印の形でなければ組み立てない
    expect(withPlaceTranslations({ ja: '駅前', en: 'Ekimae' }).ko).toBe('Ekimae');
  });

  it('leaves no kana in any Chinese name and gives every name a Korean one', () => {
    const names = [
      ...umedaMap.nodes.map((n) => n.name),
      ...umedaMap.shops.map((s) => s.name),
      ...umedaMap.pois.map((p) => p.name),
    ];
    expect(names.filter((n) => hasKana(n.zh ?? '') || hasKana(n['zh-Hant'] ?? ''))).toEqual([]);
    expect(names.filter((n) => n.ko === undefined)).toEqual([]);
  });
});
