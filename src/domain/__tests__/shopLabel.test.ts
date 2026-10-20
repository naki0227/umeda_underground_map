import { describe, expect, it } from 'vitest';
import { isUndergroundShop, shopPlaceName } from '../shopLabel';
import type { Shop } from '../types';

const base: Shop = { id: 's', name: { ja: '店', en: 'Shop' }, category: 'cafe', nodeId: 'n' };
const building = { ja: 'ビル', en: 'Bldg.' };

describe('shopLabel', () => {
  it('keeps underground mall shops as they are', () => {
    expect(isUndergroundShop(base)).toBe(true);
    expect(shopPlaceName(base)).toEqual(base.name);
  });

  it('adds the building and floor for shops in a building', () => {
    const shop = { ...base, building, floor: '7F' };
    expect(isUndergroundShop(shop)).toBe(false);
    expect(shopPlaceName(shop)).toEqual({ ja: '店（ビル 7F）', en: 'Shop (Bldg. 7F)' });
  });

  it('treats basement floors of a building as underground and omits an unknown floor', () => {
    expect(isUndergroundShop({ ...base, building, floor: 'B1' })).toBe(true);
    const unknown = { ...base, building };
    expect(isUndergroundShop(unknown)).toBe(false);
    expect(shopPlaceName(unknown).ja).toBe('店（ビル）');
  });
});
