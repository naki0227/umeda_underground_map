import type { Graph } from './graph';
import type { NodeId } from './types';
import type { Route } from './route';

export type TurnDirection = 'straight' | 'left' | 'right' | 'u-turn';

/** 1ステップ = 次の曲がり角（または目的地）までの直進区間 */
export interface RouteStep {
  /** この区間の起点ノード */
  fromNodeId: NodeId;
  /** 曲がる（または到着する）ノード */
  atNodeId: NodeId;
  /** atNodeId での動作。最終ステップは 'arrive' */
  action: TurnDirection | 'arrive';
  distanceM: number;
}

const STRAIGHT_THRESHOLD_DEG = 30;
const U_TURN_THRESHOLD_DEG = 150;

function bearingDeg(from: { x: number; y: number }, to: { x: number; y: number }): number {
  return (Math.atan2(to.x - from.x, to.y - from.y) * 180) / Math.PI;
}

/** -180..180 に正規化した旋回角。正=右、負=左。 */
export function turnAngleDeg(prevBearing: number, nextBearing: number): number {
  let diff = nextBearing - prevBearing;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return diff;
}

export function classifyTurn(angleDeg: number): TurnDirection {
  const abs = Math.abs(angleDeg);
  if (abs <= STRAIGHT_THRESHOLD_DEG) return 'straight';
  if (abs >= U_TURN_THRESHOLD_DEG) return 'u-turn';
  return angleDeg > 0 ? 'right' : 'left';
}

/**
 * 経路を「◯m進んで右」形式のステップ列に変換する。
 * 直進が続く区間は1ステップにまとめる。
 */
export function buildSteps(graph: Graph, route: Route): RouteStep[] {
  const { nodeIds } = route;
  if (nodeIds.length < 2) return [];

  const nodeAt = (id: NodeId) => {
    const node = graph.nodes.get(id);
    if (!node) throw new Error(`route references unknown node: ${id}`);
    return node;
  };

  const edgeDistance = (from: NodeId, to: NodeId): number => {
    const edge = (graph.adjacency.get(from) ?? []).find((e) => e.to === to);
    return edge?.distanceM ?? 0;
  };

  const steps: RouteStep[] = [];
  let segmentStart = nodeIds[0];
  let segmentDistance = edgeDistance(nodeIds[0], nodeIds[1]);

  for (let i = 1; i < nodeIds.length - 1; i += 1) {
    const prevBearing = bearingDeg(nodeAt(nodeIds[i - 1]), nodeAt(nodeIds[i]));
    const nextBearing = bearingDeg(nodeAt(nodeIds[i]), nodeAt(nodeIds[i + 1]));
    const turn = classifyTurn(turnAngleDeg(prevBearing, nextBearing));

    if (turn === 'straight') {
      segmentDistance += edgeDistance(nodeIds[i], nodeIds[i + 1]);
      continue;
    }

    steps.push({
      fromNodeId: segmentStart,
      atNodeId: nodeIds[i],
      action: turn,
      distanceM: Math.round(segmentDistance),
    });
    segmentStart = nodeIds[i];
    segmentDistance = edgeDistance(nodeIds[i], nodeIds[i + 1]);
  }

  steps.push({
    fromNodeId: segmentStart,
    atNodeId: nodeIds[nodeIds.length - 1],
    action: 'arrive',
    distanceM: Math.round(segmentDistance),
  });

  return steps;
}
