import { describe, expect, it } from 'vitest';
import { fitGeoTransform, nearestNode } from '../geo';
import type { MapNode } from '../types';

const node = (id: string, x: number, y: number, lat?: number, lng?: number): MapNode => ({
  id,
  kind: lat === undefined ? 'junction' : 'exit',
  name: { ja: id, en: id },
  area: 'whity',
  x,
  y,
  lat,
  lng,
  exitNo: lat === undefined ? undefined : id,
});

// 原点 (34.70, 135.50)。東へ 0.001度 ≒ 91.5m、北へ 0.001度 ≒ 111.3m
const anchors = [
  node('a', 0, 0, 34.7, 135.5),
  node('b', 91.5, 0, 34.7, 135.501),
  node('c', 0, 111.3, 34.701, 135.5),
  node('d', 91.5, 111.3, 34.701, 135.501),
];

describe('fitGeoTransform', () => {
  it('maps lat/lng onto plane coordinates fitted from anchor nodes', () => {
    const transform = fitGeoTransform(anchors);
    expect(transform).not.toBeNull();
    const p = transform?.toMap({ lat: 34.7005, lng: 135.5005 });
    expect(p?.x).toBeCloseTo(45.75, 0);
    expect(p?.y).toBeCloseTo(55.65, 0);
  });

  it('returns null with fewer than three anchors or collinear anchors', () => {
    expect(fitGeoTransform(anchors.slice(0, 2))).toBeNull();
    const collinear = [
      node('a', 0, 0, 34.7, 135.5),
      node('b', 10, 0, 34.7, 135.5001),
      node('c', 20, 0, 34.7, 135.5002),
    ];
    expect(fitGeoTransform(collinear)).toBeNull();
  });

  it('ignores nodes without coordinates', () => {
    const transform = fitGeoTransform([...anchors, node('j', 500, 500)]);
    expect(transform?.toMap({ lat: 34.7, lng: 135.5 }).x).toBeCloseTo(0, 0);
  });

  it('converts plane coordinates back to lat/lng', () => {
    const transform = fitGeoTransform(anchors);
    const geo = transform?.toGeo({ x: 45.75, y: 55.65 });
    expect(geo?.lat).toBeCloseTo(34.7005, 5);
    expect(geo?.lng).toBeCloseTo(135.5005, 5);
  });
});

describe('nearestNode', () => {
  it('finds the closest node in the plane', () => {
    const result = nearestNode(anchors, { x: 80, y: 10 });
    expect(result?.node.id).toBe('b');
    expect(result?.distanceM).toBeCloseTo(Math.hypot(11.5, 10));
  });

  it('returns null for no nodes', () => {
    expect(nearestNode([], { x: 0, y: 0 })).toBeNull();
  });
});
