import { afterEach, describe, expect, it } from 'vitest';
import type { Place } from '../../map/InteractiveMap';
import { umedaMap } from '../../../data/map';
import { buildGraph } from '../../../domain/graph';
import {
  favoriteKey,
  loadFavorites,
  MAX_FAVORITES,
  reconcileFavorites,
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

  it('keeps favorites that still match the map data and remaps or drops the rest', () => {
    const graph = buildGraph(umedaMap);
    const node = [...graph.nodes.values()].find((n) => n.kind === 'landmark');
    if (!node) throw new Error('no landmark');
    const kept: Place = { nodeId: node.id, name: node.name, aboveGround: false };
    // 地図データを作り直してノードの番号が変わった（同じ名前の場所はある）
    const moved: Place = { ...kept, nodeId: 'old-id-that-is-gone' };
    const gone: Place = {
      nodeId: 'old-id-that-is-gone',
      name: { ja: 'もう無い店', en: 'Gone' },
      aboveGround: false,
    };
    const station: Place = {
      nodeId: 'old-gate',
      nodeIds: ['old-gate'],
      name: { ja: 'JR大阪駅', en: 'JR Osaka Station' },
      aboveGround: false,
    };
    const result = reconcileFavorites([kept, moved, gone, station], graph, umedaMap);
    expect(result.map((p) => p.name.ja)).toEqual([node.name.ja, node.name.ja, 'JR大阪駅']);
    expect(result[1].nodeId).toBe(node.id);
    // 駅は改札の候補をいまのデータから引き直す
    expect(result[2].nodeIds?.length).toBeGreaterThan(1);
    expect(result[2].nodeIds?.every((id) => graph.nodes.has(id))).toBe(true);
  });
});
