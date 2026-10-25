import type { LocalizedText, Shop } from './types';

/** 地下の店か（駅ビル・商業ビルの地上階の店や、階が分からないビルの店は false） */
export function isUndergroundShop(shop: Shop): boolean {
  if (shop.building === undefined) return true;
  return shop.floor?.startsWith('B') ?? false;
}

/** 検索結果・目的地に出す名前。ビルの中の店は「店名（ビル名 7F）」 */
export function shopPlaceName(shop: Shop): LocalizedText {
  const { building, floor } = shop;
  if (building === undefined) return shop.name;
  const where = (name: string) => (floor === undefined ? name : `${name} ${floor}`);
  const both = (lang: 'zh' | 'zh-Hant' | 'ko') => {
    const name = shop.name[lang];
    const place = building[lang];
    return name !== undefined && place !== undefined
      ? { [lang]: `${name}（${where(place)}）` }
      : {};
  };
  return {
    ja: `${shop.name.ja}（${where(building.ja)}）`,
    en: `${shop.name.en} (${where(building.en)})`,
    ...both('zh'),
    ...both('zh-Hant'),
    ...both('ko'),
  };
}
