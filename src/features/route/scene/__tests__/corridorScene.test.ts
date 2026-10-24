import { describe, expect, it } from 'vitest';
import { buildScene } from '../corridorScene';
import type { SceneItem } from '../sceneTypes';
import { mixColor } from '../shopStyle';

// 北へ 20m 進んで東へ曲がる通路
const path = [
  { x: 0, y: 0 },
  { x: 0, y: 20 },
  { x: 30, y: 20 },
];
const shop = (
  key: string,
  side: 'left' | 'right',
  distanceM: number,
  color = '#f97316',
): SceneItem => ({
  key,
  kind: 'shop',
  side,
  distanceM,
  name: key,
  icon: '🍜',
  color,
});

describe('buildScene', () => {
  it('draws the floor, walls, ceiling and the corridor after the turn', () => {
    const scene = buildScene({ path, items: [], turn: { distanceM: 20, icon: '↱' } });
    expect(scene.polygons.length).toBeGreaterThan(40);
    expect(scene.labels.map((l) => l.key)).toEqual(['turn']);
    // 経路の帯は曲がった先にも続く
    expect(scene.polygons.filter((p) => p.key.startsWith('route-')).length).toBeGreaterThan(8);
  });

  it('gives each shop its own storefront in its color', () => {
    const scene = buildScene({
      path,
      items: [shop('a', 'left', 5), shop('b', 'right', 8, '#16a34a')],
    });
    const signs = scene.polygons.filter((p) => p.key.endsWith('-sign'));
    expect(signs.length).toBeGreaterThanOrEqual(2);
    // 店先の下側は種類の色を薄めたガラス
    const glassA = mixColor('#f97316', '#ffffff', 0.62);
    expect(
      scene.polygons.some(
        (p) => p.key.endsWith('-lower') && p.fill.startsWith('#') && p.fill !== glassA,
      ),
    ).toBe(true);
    expect(scene.labels.map((l) => l.key).sort()).toEqual(['a', 'b']);
  });

  it('moves shops at the same spot apart so their fronts do not overlap', () => {
    const scene = buildScene({ path, items: [shop('a', 'left', 8), shop('b', 'left', 8)] });
    const [a, b] = ['a', 'b'].map((key) => scene.labels.find((l) => l.key === key));
    expect(a && b).toBeTruthy();
    // 奥にずらした店は小さく、地平線に近く見える
    expect(b!.depthM).toBeGreaterThan(a!.depthM + 4);
  });

  it('hides the name of a shop behind the corner', () => {
    // 曲がった先の右の壁は、手前の右の壁に隠れて見えない
    const scene = buildScene({
      path,
      items: [shop('hidden', 'right', 35), shop('seen', 'left', 6)],
    });
    expect(scene.labels.map((l) => l.key)).toEqual(['seen']);
  });

  it('shows only the icon of a far shop and marks the destination', () => {
    const long = [
      { x: 0, y: 0 },
      { x: 0, y: 90 },
    ];
    const scene = buildScene({
      path: long,
      items: [shop('far', 'left', 70)],
      goal: { icon: '🏁', text: 'HEP FIVE' },
    });
    expect(scene.labels.find((l) => l.key === 'far')?.text).toBe('');
    expect(scene.labels.find((l) => l.key === 'goal')?.text).toBe('HEP FIVE');
  });

  it('returns an empty scene for a path without length', () => {
    expect(buildScene({ path: [{ x: 1, y: 1 }], items: [] }).polygons).toEqual([]);
  });
});

describe('mixColor', () => {
  it('mixes two colors', () => {
    expect(mixColor('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixColor('#ff0000', '#0000ff', 0)).toBe('#ff0000');
  });
});
