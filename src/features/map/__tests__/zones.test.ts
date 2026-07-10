import { describe, expect, it } from 'vitest';
import { buildAreaZones, convexHull } from '../zones';
import { umedaMap } from '../../../data/map';

describe('convexHull', () => {
  it('drops interior points and keeps the hull of a square', () => {
    const hull = convexHull([
      { px: 0, py: 0 },
      { px: 100, py: 0 },
      { px: 100, py: 100 },
      { px: 0, py: 100 },
      { px: 50, py: 50 }, // 内部点
    ]);
    expect(hull).toHaveLength(4);
    expect(hull).not.toContainEqual({ px: 50, py: 50 });
  });

  it('returns fewer than 3 points as-is', () => {
    expect(convexHull([{ px: 1, py: 2 }])).toEqual([{ px: 1, py: 2 }]);
  });
});

describe('buildAreaZones', () => {
  it('builds one padded polygon per area', () => {
    const zones = buildAreaZones(umedaMap.nodes);
    const areas = zones.map((z) => z.area).sort();
    expect(areas).toEqual(['diamor', 'dojima', 'ekimo', 'sanbangai', 'station', 'whity'].sort());
    for (const zone of zones) {
      // ポリゴンとして成立する（3頂点以上）
      expect(zone.points.split(' ').length).toBeGreaterThanOrEqual(3);
    }
  });
});
