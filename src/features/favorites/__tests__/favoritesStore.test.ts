import { afterEach, describe, expect, it } from 'vitest';
import type { Place } from '../../map/InteractiveMap';
import {
  favoriteKey,
  loadFavorites,
  MAX_FAVORITES,
  saveFavorites,
  toggleFavorite,
} from '../favoritesStore';

const izumi: Place = {
  nodeId: 'wt-izumi',
  name: { ja: '泉の広場', en: 'Izumi' },
  aboveGround: false,
};
const shop: Place = { nodeId: 'wt-izumi', name: { ja: '店A', en: 'Shop A' }, aboveGround: false };
const hep: Place = { nodeId: 'wt-exit-h8', name: { ja: 'HEP', en: 'HEP' }, aboveGround: true };

afterEach(() => localStorage.clear());

describe('favoritesStore', () => {
  it('distinguishes different places on the same node', () => {
    expect(favoriteKey(izumi)).not.toBe(favoriteKey(shop));
  });

  it('adds to the front and removes on a second toggle', () => {
    const added = toggleFavorite(toggleFavorite([], izumi), hep);
    expect(added.map((p) => p.name.en)).toEqual(['HEP', 'Izumi']);
    expect(toggleFavorite(added, izumi).map((p) => p.name.en)).toEqual(['HEP']);
  });

  it('caps the number of favorites', () => {
    let list: Place[] = [];
    for (let i = 0; i < MAX_FAVORITES + 5; i += 1) {
      list = toggleFavorite(list, { ...izumi, name: { ja: `p${i}`, en: `p${i}` } });
    }
    expect(list).toHaveLength(MAX_FAVORITES);
  });

  it('round-trips through localStorage', () => {
    saveFavorites([hep, izumi]);
    expect(loadFavorites()).toEqual([hep, izumi]);
  });

  it('ignores broken or foreign data', () => {
    localStorage.setItem('umeda-navi.favorites', '{not json');
    expect(loadFavorites()).toEqual([]);
    localStorage.setItem(
      'umeda-navi.favorites',
      JSON.stringify([hep, { nodeId: 1 }, 'x', { ...izumi, extra: '<script>' }]),
    );
    expect(loadFavorites()).toEqual([hep, izumi]);
  });
});
