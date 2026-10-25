import { describe, expect, it } from 'vitest';
import { attachAmenities, umedaAmenities } from '../amenities';
import { umedaMap } from '../map';

describe('amenities', () => {
  it('puts toilets, lockers, ATMs and elevators on the underground map', () => {
    const kinds = new Set(umedaAmenities.map((a) => a.kind));
    for (const kind of ['toilet', 'locker', 'atm', 'elevator']) expect(kinds).toContain(kind);
    const nodeIds = new Set(umedaMap.nodes.map((n) => n.id));
    expect(umedaAmenities.every((a) => nodeIds.has(a.nodeId))).toBe(true);
  });

  it('drops facilities far from any passage and names them in each language', () => {
    const node = umedaMap.nodes.find((n) => n.kind === 'junction' && n.lat !== undefined)!;
    const near = {
      id: 'n1',
      kind: 'toilet' as const,
      lat: node.lat!,
      lng: node.lng!,
      floor: 'B1',
      wheelchair: true,
    };
    const far = { id: 'n2', kind: 'atm' as const, lat: 34.0, lng: 135.0 };
    const [attached, ...rest] = attachAmenities(umedaMap.nodes, [near, far]);
    expect(rest).toEqual([]);
    expect(attached.label.ja).toBe('多目的トイレ B1');
    expect(attached.label.ko).toBe('다목적 화장실 B1');
  });
});
