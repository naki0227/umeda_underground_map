import { describe, expect, it } from 'vitest';
import { umedaMap } from '../../../data/map';
import { buildGraph } from '../../../domain/graph';
import { buildBuildings } from '../ground';
import { project, type ScreenPoint } from '../iso';
import { placeLabels, type LabelBox } from '../labelLayout';
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
    const visible = placeLabels(boxes);
    const shown = boxes.filter((b) => visible.has(b.id));
    for (let i = 0; i < shown.length; i += 1) {
      for (let j = i + 1; j < shown.length; j += 1) {
        expect(overlap(shown[i], shown[j]), `${shown[i].id} vs ${shown[j].id}`).toBe(false);
      }
    }
  });

  it('shows every exit number and building name when zoomed in', () => {
    const boxes = boxesAt(0.5);
    const visible = placeLabels(boxes);
    const hidden = boxes
      .filter((b) => b.id.startsWith('exit:') || b.id.startsWith('building:'))
      .filter((b) => !visible.has(b.id))
      .map((b) => b.id);
    expect(hidden).toEqual([]);
  });

  it('keeps exit numbers ahead of other labels when zoomed out', () => {
    const boxes = boxesAt(6);
    const visible = placeLabels(boxes);
    const exitsShown = boxes.filter((b) => b.id.startsWith('exit:') && visible.has(b.id));
    expect(exitsShown.length).toBeGreaterThan(0);
  });
});

describe('buildBuildings', () => {
  it('places building boxes without overlapping each other', () => {
    for (let i = 0; i < buildings.length; i += 1) {
      for (let j = i + 1; j < buildings.length; j += 1) {
        const a = buildings[i].base;
        const b = buildings[j].base;
        const apart = Math.abs(a.px - b.px) >= 68 || Math.abs(a.py - b.py) >= 51;
        expect(apart, `${buildings[i].poi.id} vs ${buildings[j].poi.id}`).toBe(true);
      }
    }
  });
});
