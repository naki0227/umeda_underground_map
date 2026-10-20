import { describe, expect, it } from 'vitest';
import { buildGraph } from '../graph';
import { closedEdgePredicate, isWithin, minuteOfDayInTokyo } from '../hours';
import { findRoute } from '../route';
import { testEdges, testNodes } from './fixtures';

const at = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

describe('isWithin', () => {
  it('handles a daytime range', () => {
    const range = { open: '06:00', close: '23:30' };
    expect(isWithin(at('06:00'), range)).toBe(true);
    expect(isWithin(at('23:29'), range)).toBe(true);
    expect(isWithin(at('23:30'), range)).toBe(false);
    expect(isWithin(at('03:00'), range)).toBe(false);
  });

  it('handles a range that crosses midnight', () => {
    const range = { open: '23:00', close: '06:00' };
    expect(isWithin(at('23:30'), range)).toBe(true);
    expect(isWithin(at('02:00'), range)).toBe(true);
    expect(isWithin(at('06:00'), range)).toBe(false);
    expect(isWithin(at('12:00'), range)).toBe(false);
  });
});

describe('minuteOfDayInTokyo', () => {
  it('uses Japan time regardless of the device time zone', () => {
    // 2026-10-20 17:30 UTC = 2026-10-21 02:30 JST
    expect(minuteOfDayInTokyo(new Date('2026-10-20T17:30:00Z'))).toBe(at('02:30'));
  });
});

describe('closedEdgePredicate', () => {
  // j2-j5 は階段。階段だけ 06:00〜23:30 に通れることにする
  const graph = buildGraph({ nodes: testNodes, edges: testEdges });
  const rules = [
    {
      area: 'whity' as const,
      attr: 'stairs' as const,
      hours: { open: '06:00', close: '23:30' },
      source: 'test',
    },
  ];

  it('closes matching edges outside their hours and the route goes around', () => {
    const isClosed = closedEdgePredicate(graph, rules, at('02:00'));
    // 昼は j3 -> j2 -> j5（階段 200m）、夜は階段が閉まるので j3 -> j2 -> j1 -> j4 -> j5
    expect(findRoute(graph, 'j3', 'j5', { isClosed })?.nodeIds).toEqual([
      'j3',
      'j2',
      'j1',
      'j4',
      'j5',
    ]);
  });

  it('keeps every edge open during the hours', () => {
    const isClosed = closedEdgePredicate(graph, rules, at('12:00'));
    expect(findRoute(graph, 'j3', 'j5', { isClosed })?.nodeIds).toEqual(['j3', 'j2', 'j5']);
  });

  it('only applies to edges in the rule area', () => {
    const otherArea = [{ ...rules[0], area: 'diamor' as const }];
    const isClosed = closedEdgePredicate(graph, otherArea, at('02:00'));
    expect(findRoute(graph, 'j3', 'j5', { isClosed })?.nodeIds).toEqual(['j3', 'j2', 'j5']);
  });
});
