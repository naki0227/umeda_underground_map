import { describe, expect, it } from 'vitest';
import { buildGraph } from '../../domain/graph';
import { findRoute } from '../../domain/route';
import { umedaMap } from '../map';

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

  it('can route across areas: Izumi Plaza -> Dotica South', () => {
    const graph = buildGraph(umedaMap);
    const route = findRoute(graph, 'wt-izumi', 'dj-3');
    expect(route).not.toBeNull();
    expect(route?.totalDistanceM).toBeGreaterThan(500);
  });
});
