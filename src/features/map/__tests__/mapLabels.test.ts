import { describe, expect, it } from 'vitest';
import { umedaMap } from '../../../data/map';
import { projectToPlane } from '../../../domain/geo';
import { buildGraph } from '../../../domain/graph';
import { buildBuildings } from '../ground';
import { project, type ScreenPoint } from '../projection';
import { placeLabelLayout, placeLabels, type LabelBox } from '../labelLayout';
import { buildMapLabelBoxes } from '../mapLabels';
import { buildAreaZones } from '../zones';

const graph = buildGraph(umedaMap);
const nodes = [...graph.nodes.values()];
const screenOf = new Map<string, ScreenPoint>(nodes.map((n) => [n.id, project(n.x, n.y)]));
const buildings = buildBuildings(graph, umedaMap.pois);

const boxesAt = (k: number) =>
  buildMapLabelBoxes({
    k,
    language: 'ja',
    exits: nodes.filter((n) => n.kind === 'exit'),
    pins: nodes.filter((n) => n.kind === 'gate' || n.kind === 'landmark'),
    screenOf,
    buildings,
    facilities: [],
    zones: buildAreaZones(nodes),
    areaName: (area) => area,
  });

const overlap = (a: LabelBox, b: LabelBox) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

describe('map labels with real data', () => {
  // k = 画面1pxあたりのマップ単位。大きいほど引いた表示
  it.each([0.5, 1, 2, 4, 6])('never shows overlapping labels at zoom k=%s', (k) => {
    const boxes = boxesAt(k);
    const layout = placeLabelLayout(boxes);
    // 代わりの位置に置いたラベルは、その位置で重なりを調べる
    const shown = boxes
      .filter((b) => layout.has(b.id))
      .map((b) => {
        const alt =
          (layout.get(b.id) ?? 0) > 0 ? b.alternatives?.[(layout.get(b.id) ?? 1) - 1] : undefined;
        return alt ? { ...b, x: b.x + alt.dx, y: b.y + alt.dy } : b;
      });
    for (let i = 0; i < shown.length; i += 1) {
      for (let j = i + 1; j < shown.length; j += 1) {
        expect(overlap(shown[i], shown[j]), `${shown[i].id} vs ${shown[j].id}`).toBe(false);
      }
    }
  });

  it('shows every building name and almost every exit number when zoomed in', () => {
    // 最大拡大（幅120mを約375pxで表示 ≒ k=0.32）。数m間隔で並ぶ出口（同じ番号の2か所など）は
    // バッジが重なるため、9割以上を基準にする（隠れた出口も点で表示され、操作できる）
    const boxes = boxesAt(0.32);
    const visible = placeLabels(boxes);
    // 建物名どうしは重ならない（出口番号を優先して隠れることはある）
    const buildings = boxes.filter((b) => b.id.startsWith('building:'));
    // 同じ建物の中のスポット（阪急うめだ本店とツインタワーズ・ノースなど）は上下に分けて置く
    const buildingsOnly = placeLabelLayout(buildings);
    expect(buildings.filter((b) => !buildingsOnly.has(b.id)).map((b) => b.id)).toEqual([]);
    const exits = boxes.filter((b) => b.id.startsWith('exit:'));
    const shown = exits.filter((b) => visible.has(b.id)).length;
    expect(shown / exits.length).toBeGreaterThanOrEqual(0.9);
  });

  it('keeps plazas, gates and mall names ahead of exit numbers and buildings', () => {
    const boxes = boxesAt(2);
    const visible = placeLabels(boxes);
    const shown = boxes.filter((b) => visible.has(b.id));
    // 隠れた広場・改札・地下街の名前は、同じかより優先度の高いラベルに押しのけられたもの
    // （出口番号や建物名に押しのけられていない）
    for (const hidden of boxes.filter((b) => /^(pin|zone):/.test(b.id) && !visible.has(b.id))) {
      const blockers = shown.filter((b) => overlap(b, hidden));
      expect(blockers.length, hidden.id).toBeGreaterThan(0);
      expect(
        blockers.some((b) => b.priority >= hidden.priority),
        `${hidden.id} blocked by ${blockers.map((b) => b.id).join(',')}`,
      ).toBe(true);
    }
  });
});

describe('buildBuildings', () => {
  it('puts each building at the position of its spot, linked to its nearest exit', () => {
    for (const building of buildings) {
      const { poi } = building;
      if (poi.lat === undefined || poi.lng === undefined) continue;
      const p = projectToPlane({ lat: poi.lat, lng: poi.lng });
      const expected = project(p.x, p.y);
      expect(building.base.px, poi.id).toBeCloseTo(expected.px);
      expect(building.base.py, poi.id).toBeCloseTo(expected.py);
      expect(building.anchor, poi.id).toEqual(screenOf.get(poi.nodeId));
    }
  });
});
