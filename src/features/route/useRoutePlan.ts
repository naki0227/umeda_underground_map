import { useMemo } from 'react';
import { ABOVE_GROUND_MIN_STRAIGHT_M, ABOVE_GROUND_SUGGEST_RATIO } from '../../app/config';
import { googleMapsWalkingUrl, shouldSuggestAboveGround } from '../../domain/aboveGround';
import { buildSteps, type RouteStep } from '../../domain/directions';
import { fitGeoTransform, type LatLng } from '../../domain/geo';
import type { Graph } from '../../domain/graph';
import type { MinuteOfDay } from '../../domain/hours';
import { routeNeedsSteps, routeUsesStairs } from '../../domain/route';
import type { NodeId } from '../../domain/types';
import { planRoute } from './planRoute';

/** 段差の扱い: ふつう / 階段を避ける / エレベーターだけ */
export type Access = 'normal' | 'noStairs' | 'stepFree';

const isTurn = (s: RouteStep) =>
  s.action === 'left' || s.action === 'right' || s.action === 'u-turn';

/**
 * 道案内のシートに出す経路と、そのまわりの判断（階段を通るか・閉まった所を通るか・
 * もう一方の選び方との差・地上の方が近いか）
 */
export function useRoutePlan(
  graph: Graph,
  fromNodeId: NodeId,
  toNodeId: NodeId,
  options: { access: Access; simple: boolean; minute: MinuteOfDay },
) {
  const { access, simple, minute } = options;
  const result = useMemo(() => {
    const avoidStairs = access !== 'normal';
    const stepFree = access === 'stepFree';
    const plan = (s: boolean) =>
      planRoute(graph, fromNodeId, toNodeId, { avoidStairs, stepFree, minute, simple: s });
    const planned = plan(simple);
    if (planned === null) return null;
    const { route, throughClosed } = planned;
    // もう一方の選び方（最短 / わかりやすい道）と違えば、距離と曲がる回数の差を出して切り替えられるようにする
    const other = plan(!simple);
    const steps = buildSteps(graph, route);
    const differs = other !== null && other.route.nodeIds.join() !== route.nodeIds.join();
    const alternative = differs
      ? {
          extraM: Math.round(Math.abs(route.totalDistanceM - other.route.totalDistanceM)),
          turnsDiff: Math.abs(
            steps.filter(isTurn).length - buildSteps(graph, other.route).filter(isTurn).length,
          ),
        }
      : null;
    return {
      route,
      steps,
      usesStairs: avoidStairs && !stepFree && routeUsesStairs(graph, route),
      needsSteps: stepFree && routeNeedsSteps(graph, route),
      throughClosed,
      alternative,
    };
  }, [graph, fromNodeId, toNodeId, access, minute, simple]);

  /** 地上の方が近い可能性があるときの比較値と Google マップのリンク */
  const aboveGroundSuggestion = useMemo(() => {
    if (result === null) return null;
    const from = graph.nodes.get(fromNodeId);
    const to = graph.nodes.get(toNodeId);
    if (!from || !to) return null;
    const straightM = Math.hypot(to.x - from.x, to.y - from.y);
    const undergroundM = result.route.totalDistanceM;
    const suggest = shouldSuggestAboveGround({
      undergroundM,
      straightM,
      ratio: ABOVE_GROUND_SUGGEST_RATIO,
      minStraightM: ABOVE_GROUND_MIN_STRAIGHT_M,
    });
    if (!suggest) return null;
    const transform = fitGeoTransform([...graph.nodes.values()]);
    const geoOf = (node: typeof from): LatLng | null =>
      node.lat !== undefined && node.lng !== undefined
        ? { lat: node.lat, lng: node.lng }
        : (transform?.toGeo(node) ?? null);
    const origin = geoOf(from);
    const destination = geoOf(to);
    if (origin === null || destination === null) return null;
    return {
      straightM: Math.round(straightM),
      undergroundM: Math.round(undergroundM),
      url: googleMapsWalkingUrl(origin, destination),
    };
  }, [graph, fromNodeId, toNodeId, result]);

  return { result, aboveGroundSuggestion };
}

export type RoutePlan = NonNullable<ReturnType<typeof useRoutePlan>['result']>;
export type AboveGroundSuggestion = ReturnType<typeof useRoutePlan>['aboveGroundSuggestion'];
