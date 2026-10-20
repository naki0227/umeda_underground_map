import type { AdjacentEdge, Graph } from './graph';
import type { AreaId, EdgeAttr, NodeId } from './types';

/** 1日の中の時刻（0:00 からの分） */
export type MinuteOfDay = number;

/** 時間帯。close が open より前なら日をまたぐ（例: 23:00〜6:00） */
export interface TimeRange {
  open: string;
  close: string;
}

/**
 * 時間帯で通れなくなる通路・設備の決まり。area の中（端の片方でも area にある線）で、
 * attr を持つ線（省略時はすべての線）が hours の外では通れない。
 */
export interface TimedPassageRule {
  area: AreaId;
  attr?: EdgeAttr;
  hours: TimeRange;
  /** 出典（公式サイトの URL など） */
  source: string;
}

const toMinutes = (hhmm: string): MinuteOfDay => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** 日本時間（Asia/Tokyo）での時刻。端末のタイムゾーンによらない */
export function minuteOfDayInTokyo(date: Date): MinuteOfDay {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return value('hour') * 60 + value('minute');
}

/** minute が時間帯の中にあるか（日をまたぐ時間帯にも対応） */
export function isWithin(minute: MinuteOfDay, range: TimeRange): boolean {
  const open = toMinutes(range.open);
  const close = toMinutes(range.close);
  if (open === close) return true;
  return open < close ? minute >= open && minute < close : minute >= open || minute < close;
}

/** いま閉まっている線を判定する関数。経路探索の isClosed に渡す */
export function closedEdgePredicate(
  graph: Graph,
  rules: TimedPassageRule[],
  minute: MinuteOfDay,
): (from: NodeId, edge: AdjacentEdge) => boolean {
  const closedRules = rules.filter((rule) => !isWithin(minute, rule.hours));
  return (from, edge) =>
    closedRules.some((rule) => {
      if (rule.attr !== undefined && !edge.attrs.includes(rule.attr)) return false;
      const areas = [graph.nodes.get(from)?.area, graph.nodes.get(edge.to)?.area];
      return areas.includes(rule.area);
    });
}
