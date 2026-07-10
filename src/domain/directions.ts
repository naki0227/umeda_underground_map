import type { Graph } from './graph';
import { FLOOR_ORDER, nodeFloor, type EdgeAttr, type FloorId, type NodeId } from './types';
import type { Route } from './route';

export type TurnDirection = 'straight' | 'left' | 'right' | 'u-turn';

/** フロア移動の内容。via はエッジ属性から推定（不明時は stairs） */
export interface FloorChange {
  from: FloorId;
  to: FloorId;
  via: EdgeAttr;
  up: boolean;
}

/** 1ステップ = 次の曲がり角・フロア移動（または目的地）までの区間 */
export interface RouteStep {
  /** この区間の起点ノード */
  fromNodeId: NodeId;
  /** 曲がる・フロアを移る（または到着する）ノード */
  atNodeId: NodeId;
  /** atNodeId での動作。最終ステップは 'arrive' か 'floor-change' */
  action: TurnDirection | 'arrive' | 'floor-change';
  distanceM: number;
  /** action === 'floor-change' のときのみ */
  floorChange?: FloorChange;
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

/** フロア移動に使う設備。エスカレーター優先で表現する */
function pickVia(attrs: EdgeAttr[] | undefined): EdgeAttr {
  for (const preferred of ['escalator', 'elevator', 'slope', 'stairs'] as const) {
    if (attrs?.includes(preferred)) return preferred;
  }
  return 'stairs';
}

/**
 * 経路を「◯m進んで右」「◯m先のエスカレーターで1Fへ」形式のステップ列に変換する。
 * 直進が続く区間は1ステップにまとめ、フロアをまたぐエッジは
 * そこまでの直進を含めた1つのフロア移動ステップにする。
 */
export function buildSteps(graph: Graph, route: Route): RouteStep[] {
  const { nodeIds } = route;
  if (nodeIds.length < 2) return [];

  const nodeAt = (id: NodeId) => {
    const node = graph.nodes.get(id);
    if (!node) throw new Error(`route references unknown node: ${id}`);
    return node;
  };

  const edgeOf = (from: NodeId, to: NodeId) =>
    (graph.adjacency.get(from) ?? []).find((e) => e.to === to);

  const steps: RouteStep[] = [];
  let segmentStart = nodeIds[0];
  let segmentDistance = 0;

  for (let i = 0; i < nodeIds.length - 1; i += 1) {
    const from = nodeIds[i];
    const to = nodeIds[i + 1];
    const edge = edgeOf(from, to);
    const distance = edge?.distanceM ?? 0;
    const fromFloor = nodeFloor(nodeAt(from));
    const toFloor = nodeFloor(nodeAt(to));

    if (fromFloor !== toFloor) {
      steps.push({
        fromNodeId: segmentStart,
        atNodeId: to,
        action: 'floor-change',
        distanceM: Math.round(segmentDistance + distance),
        floorChange: {
          from: fromFloor,
          to: toFloor,
          via: pickVia(edge?.attrs),
          up: FLOOR_ORDER.indexOf(toFloor) > FLOOR_ORDER.indexOf(fromFloor),
        },
      });
      segmentStart = to;
      segmentDistance = 0;
      continue;
    }

    segmentDistance += distance;

    if (i + 2 < nodeIds.length) {
      const next = nodeIds[i + 2];
      // 次エッジがフロア移動なら曲がり判定せず、フロア移動ステップに含める
      if (nodeFloor(nodeAt(next)) !== toFloor) continue;
      const prevBearing = bearingDeg(nodeAt(from), nodeAt(to));
      const nextBearing = bearingDeg(nodeAt(to), nodeAt(next));
      const turn = classifyTurn(turnAngleDeg(prevBearing, nextBearing));
      if (turn === 'straight') continue;
      steps.push({
        fromNodeId: segmentStart,
        atNodeId: to,
        action: turn,
        distanceM: Math.round(segmentDistance),
      });
      segmentStart = to;
      segmentDistance = 0;
    }
  }

  // 最終区間。経路がフロア移動で終わる場合はそのステップが到着を兼ねる
  const lastNodeId = nodeIds[nodeIds.length - 1];
  const lastStep = steps[steps.length - 1];
  const endedWithFloorChange =
    lastStep !== undefined &&
    lastStep.action === 'floor-change' &&
    lastStep.atNodeId === lastNodeId;
  if (!endedWithFloorChange) {
    steps.push({
      fromNodeId: segmentStart,
      atNodeId: lastNodeId,
      action: 'arrive',
      distanceM: Math.round(segmentDistance),
    });
  }

  return steps;
}
