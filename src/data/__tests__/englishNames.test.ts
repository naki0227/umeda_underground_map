import { describe, expect, it } from 'vitest';
import { hasJapanese, withEnglishName } from '../englishNames';
import { umedaMap } from '../map';

describe('English names', () => {
  it('leaves no Japanese in any English name on the map', () => {
    const names = [
      ...umedaMap.nodes.map((n) => n.name),
      ...umedaMap.shops.flatMap((s) => (s.building ? [s.name, s.building] : [s.name])),
      ...umedaMap.pois.map((p) => p.name),
    ];
    const left = names.filter((name) => hasJapanese(name.en)).map((name) => name.en);
    expect(left).toEqual([]);
  });

  it('uses the official spelling and keeps the landmark wording around the name', () => {
    expect(withEnglishName({ ja: 'ファミリマート', en: 'ファミリマート' }).en).toBe('FamilyMart');
    expect(withEnglishName({ ja: 'つるとんたん前', en: 'In front of つるとんたん' }).en).toBe(
      'In front of Tsurutontan',
    );
    // 英語名がもともとあるものはそのまま
    expect(withEnglishName({ ja: '泉の広場', en: 'Izumi Plaza' }).en).toBe('Izumi Plaza');
  });
});
