import { TIMED_PASSAGES } from '../../app/config';
import type { Graph } from '../../domain/graph';
import { closedEdgePredicate, type MinuteOfDay } from '../../domain/hours';
import { findRoute, type Route } from '../../domain/route';
import type { NodeId } from '../../domain/types';

/**
 * 道案内の経路。いま閉まっている通路・設備は使わない。それで経路がなければ、閉まっている所も通る
 * 経路を出して throughClosed で知らせる。地図・一人称・道案内のシートが同じ経路を使うよう、ここ1か所で決める
 */
export function planRoute(
  graph: Graph,
  from: NodeId,
  to: NodeId,
  options: { avoidStairs: boolean; minute: MinuteOfDay; simple?: boolean; stepFree?: boolean },
): { route: Route; throughClosed: boolean } | null {
  const isClosed = closedEdgePredicate(graph, TIMED_PASSAGES, options.minute);
  const { avoidStairs, simple, stepFree } = options;
  const open = findRoute(graph, from, to, { avoidStairs, simple, stepFree, isClosed });
  if (open !== null) return { route: open, throughClosed: false };
  const any = findRoute(graph, from, to, { avoidStairs, simple, stepFree });
  return any === null ? null : { route: any, throughClosed: true };
}
