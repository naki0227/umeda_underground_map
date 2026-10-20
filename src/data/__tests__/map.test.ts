import { describe, expect, it } from 'vitest';
import { buildGraph } from '../../domain/graph';
import { findRoute } from '../../domain/route';
import { projectToPlane } from '../../domain/geo';
import { nodeFloor } from '../../domain/types';
import { nearestExitId, umedaMap } from '../map';

describe('umedaMap data integrity', () => {
  it('builds a valid graph (no duplicate ids, no dangling edges)', () => {
    expect(() => buildGraph(umedaMap)).not.toThrow();
  });

  it('every shop references an existing node', () => {
    const nodeIds = new Set(umedaMap.nodes.map((n) => n.id));
    for (const shop of umedaMap.shops) {
      expect(nodeIds.has(shop.nodeId), `shop ${shop.id} -> ${shop.nodeId}`).toBe(true);
    }
  });

  it('every exit and gate has GPS coordinates and every exit has an exit number', () => {
    for (const node of umedaMap.nodes) {
      if (node.kind === 'exit' || node.kind === 'gate') {
        expect(node.lat, `${node.id} lat`).toBeTypeOf('number');
        expect(node.lng, `${node.id} lng`).toBeTypeOf('number');
      }
      if (node.kind === 'exit') {
        expect(node.exitNo, `${node.id} exitNo`).toBeTruthy();
      }
    }
  });

  it('the whole network is connected (every node reachable from JR Osaka)', () => {
    const graph = buildGraph(umedaMap);
    for (const node of umedaMap.nodes) {
      const route = findRoute(graph, 'st-jr-midosuji', node.id);
      expect(route, `unreachable node: ${node.id}`).not.toBeNull();
    }
  });

  it('never links one exit directly to another (that would be a walk on the street)', () => {
    const kindOf = new Map(umedaMap.nodes.map((n) => [n.id, n.kind]));
    for (const edge of umedaMap.edges) {
      const bothExits = kindOf.get(edge.from) === 'exit' && kindOf.get(edge.to) === 'exit';
      expect(bothExits, `${edge.from} - ${edge.to}`).toBe(false);
    }
  });

  it('has localized names (ja and en) for all nodes and shops', () => {
    for (const node of umedaMap.nodes) {
      expect(node.name.ja.length, `${node.id} ja`).toBeGreaterThan(0);
      expect(node.name.en.length, `${node.id} en`).toBeGreaterThan(0);
    }
    for (const shop of umedaMap.shops) {
      expect(shop.name.ja.length, `${shop.id} ja`).toBeGreaterThan(0);
      expect(shop.name.en.length, `${shop.id} en`).toBeGreaterThan(0);
    }
  });

  it('every POI references an existing node and has localized names', () => {
    const nodeIds = new Set(umedaMap.nodes.map((n) => n.id));
    for (const poi of umedaMap.pois) {
      expect(nodeIds.has(poi.nodeId), `poi ${poi.id} -> ${poi.nodeId}`).toBe(true);
      expect(poi.name.ja.length, `${poi.id} ja`).toBeGreaterThan(0);
      expect(poi.name.en.length, `${poi.id} en`).toBeGreaterThan(0);
    }
  });

  it('every POI points at an exit or a gate (a place where you can reach street level)', () => {
    const nodes = new Map(umedaMap.nodes.map((n) => [n.id, n]));
    for (const poi of umedaMap.pois) {
      const kind = nodes.get(poi.nodeId)?.kind;
      expect(['exit', 'gate'], `poi ${poi.id} -> ${poi.nodeId} (${kind})`).toContain(kind);
    }
  });

  it('can route across areas: Izumi Plaza -> Dotica South', () => {
    const graph = buildGraph(umedaMap);
    const route = findRoute(graph, 'wt-izumi', 'dj-3');
    expect(route).not.toBeNull();
    expect(route?.totalDistanceM).toBeGreaterThan(500);
  });

  it('every node has lat/lng and its plane coordinates come from them', () => {
    for (const node of umedaMap.nodes) {
      expect(node.lat, `${node.id} lat`).toBeTypeOf('number');
      expect(node.lng, `${node.id} lng`).toBeTypeOf('number');
      const p = projectToPlane({ lat: node.lat as number, lng: node.lng as number });
      expect(Math.abs(p.x - node.x), `${node.id} x`).toBeLessThan(0.01);
      expect(Math.abs(p.y - node.y), `${node.id} y`).toBeLessThan(0.01);
    }
  });

  it('every passage is at least as long as the straight line and not wildly longer', () => {
    const nodes = new Map(umedaMap.nodes.map((n) => [n.id, n]));
    for (const edge of umedaMap.edges) {
      const a = nodes.get(edge.from);
      const b = nodes.get(edge.to);
      if (!a || !b) throw new Error(`unknown node in ${edge.from}-${edge.to}`);
      const straight = Math.hypot(a.x - b.x, a.y - b.y);
      const label = `${edge.from}-${edge.to}: ${edge.distanceM}m vs ${straight.toFixed(1)}m`;
      expect(edge.distanceM, label).toBeGreaterThanOrEqual(Math.floor(straight) - 1);
      // 階段は高さの分だけ長いので、短い区間は +25m まで許す
      expect(edge.distanceM, label).toBeLessThanOrEqual(Math.max(straight * 3, straight + 25));
    }
  });

  it('covers the numbered exits from OpenStreetMap', () => {
    const exits = umedaMap.nodes.filter((n) => n.kind === 'exit');
    // 2026-10-20 の抽出で 102 か所。データ更新で大きく減ったら取り込みの不具合を疑う
    expect(exits.length).toBeGreaterThanOrEqual(100);
    for (const prefix of ['H-', 'M-', 'D-', 'C-', 'E-', 'F-']) {
      expect(
        exits.some((n) => n.exitNo?.startsWith(prefix)),
        `exits starting with ${prefix}`,
      ).toBe(true);
    }
  });

  it('has the B2 floors of Hankyu Sanbangai reachable by escalator, with shops on them', () => {
    const b2 = umedaMap.nodes.filter((n) => n.area === 'sanbangai' && nodeFloor(n) === 'B2');
    expect(b2.map((n) => n.id).sort()).toEqual(['sb-n-b2', 'sb-s-b2']);
    for (const node of b2) {
      const edges = umedaMap.edges.filter((e) => e.from === node.id || e.to === node.id);
      expect(
        edges.some((e) => e.attrs?.includes('escalator')),
        node.id,
      ).toBe(true);
      expect(
        umedaMap.shops.some((s) => s.nodeId === node.id),
        `${node.id} shops`,
      ).toBe(true);
    }
  });

  it('has hundreds of shops and every area has some', () => {
    expect(umedaMap.shops.length).toBeGreaterThanOrEqual(250);
    const areaOf = new Map(umedaMap.nodes.map((n) => [n.id, n.area]));
    for (const area of ['whity', 'diamor', 'sanbangai', 'ekimo', 'dojima'] as const) {
      expect(
        umedaMap.shops.some((s) => areaOf.get(s.nodeId) === area),
        `shops in ${area}`,
      ).toBe(true);
    }
  });

  it('has at least 30 above-ground spots, each pointing at its nearest exit', () => {
    expect(umedaMap.pois.length).toBeGreaterThanOrEqual(30);
    for (const poi of umedaMap.pois) {
      expect(poi.lat, poi.id).toBeTypeOf('number');
      expect(poi.nodeId, poi.id).toBe(
        nearestExitId(umedaMap.nodes, { lat: poi.lat as number, lng: poi.lng as number }),
      );
    }
  });

  it('places Izumi Plaza where OpenStreetMap has it', () => {
    const izumi = umedaMap.nodes.find((n) => n.id === 'wt-izumi');
    const osm = projectToPlane({ lat: 34.7020766, lng: 135.5019143 });
    expect(izumi).toBeDefined();
    expect(Math.hypot((izumi?.x ?? 0) - osm.x, (izumi?.y ?? 0) - osm.y)).toBeLessThan(30);
  });
});
