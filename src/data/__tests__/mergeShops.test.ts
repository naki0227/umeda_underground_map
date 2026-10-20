import { describe, expect, it } from 'vitest';
import type { Shop } from '../../domain/types';
import { mergeShops, normalizeShopName } from '../mergeShops';

const shop = (id: string, ja: string, en: string, nodeId: string): Shop => ({
  id,
  name: { ja, en },
  category: 'cafe',
  nodeId,
});

const area = (nodeId: string) => (nodeId.startsWith('wt') ? 'whity' : 'diamor');

describe('mergeShops', () => {
  it('keeps the official name but takes the OSM position for the same shop', () => {
    const official = [shop('o1', 'スターバックスコーヒー ホワイティうめだ店', 'Starbucks', 'wt-a')];
    const osm = [shop('osm-1', 'スターバックスコーヒー', 'Starbucks Coffee', 'wt-b')];
    expect(mergeShops(official, osm, area)).toEqual([{ ...official[0], nodeId: 'wt-b' }]);
  });

  it('does not match shops in a different area or with a too short name', () => {
    const official = [
      shop('o1', 'スターバックスコーヒー ホワイティうめだ店', 'Starbucks', 'wt-a'),
      shop('o2', '活 ホワイティ', 'Katsu', 'wt-a'),
    ];
    const osm = [
      shop('osm-1', 'スターバックスコーヒー', 'Starbucks', 'dm-b'),
      shop('osm-2', '活', 'Katsu', 'wt-c'),
    ];
    const merged = mergeShops(official, osm, area);
    expect(merged.map((s) => s.id)).toEqual(['o1', 'o2', 'osm-1', 'osm-2']);
    expect(merged[0].nodeId).toBe('wt-a');
  });

  it('uses each OSM shop at most once', () => {
    const official = [
      shop('o1', 'ドトール A店', 'Doutor A', 'wt-a'),
      shop('o2', 'ドトール B店', 'Doutor B', 'wt-a'),
    ];
    const osm = [shop('osm-1', 'ドトールコーヒーショップ', 'Doutor', 'wt-b')];
    const merged = mergeShops(official, osm, area);
    expect(merged.map((s) => [s.id, s.nodeId])).toEqual([
      ['o1', 'wt-b'],
      ['o2', 'wt-a'],
    ]);
  });
});

describe('normalizeShopName', () => {
  it('ignores spaces, middle dots and width differences', () => {
    expect(normalizeShopName('ＪＩＮＳ・梅田 店')).toBe(normalizeShopName('jins梅田店'));
  });
});
