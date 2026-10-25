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
/**
 * 曲がってすぐ（この距離 m 未満）にまた曲がるときは、2つを1つの案内にまとめる。OSM の通路の線には
 * 数 m の細かい折れがあり、そのままだと「1m 先で右、そのあと左」のような意味のない案内になるため。
 * まとめた向きは、1つめの角の手前と2つめの角の先それぞれ TURN_LOOK_M の進み方で決める
 */
const SHORT_STEP_M = 5;
const TURN_LOOK_M = 6;
/** 出発してすぐ（この距離 m 未満）の曲がりは案内しない（まだ向きが決まっていない） */
const START_TURN_MIN_M = 3;
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

/** フロア移動に使う設備。エスカレーター優先で表現する（案内文と一人称の札で共通） */
export function pickVia(attrs: EdgeAttr[] | undefined): EdgeAttr {
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

  /**
   * 経路の index 番目の点から、経路に沿って distance m 進んだ（負なら戻った）点。
   * 同じ階の中だけをたどり、端や階の変わり目で止まる
   */
  const along = (index: number, distance: number) => {
    const floor = nodeFloor(nodeAt(nodeIds[index]));
    const step = distance < 0 ? -1 : 1;
    let left = Math.abs(distance);
    let here = nodeAt(nodeIds[index]);
    for (let j = index + step; j >= 0 && j < nodeIds.length; j += step) {
      const there = nodeAt(nodeIds[j]);
      if (nodeFloor(there) !== floor) break;
      const d = Math.hypot(there.x - here.x, there.y - here.y);
      if (d >= left && d > 0) {
        const t = left / d;
        return { x: here.x + (there.x - here.x) * t, y: here.y + (there.y - here.y) * t };
      }
      left -= d;
      here = there;
    }
    return here;
  };

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
      if (steps.length === 0 && segmentStart === nodeIds[0] && segmentDistance < START_TURN_MIN_M) {
        continue;
      }
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

  return mergeShortTurns(steps);

  function mergeShortTurns(list: RouteStep[]): RouteStep[] {
    const isTurn = (step: RouteStep) =>
      step.action === 'left' || step.action === 'right' || step.action === 'u-turn';
    const merged = [...list];
    let i = 0;
    while (i < merged.length - 1) {
      const a = merged[i];
      const b = merged[i + 1];
      if (!isTurn(a) || !isTurn(b) || b.distanceM >= SHORT_STEP_M) {
        i += 1;
        continue;
      }
      const before = bearingDeg(
        along(nodeIds.indexOf(a.atNodeId), -TURN_LOOK_M),
        nodeAt(a.atNodeId),
      );
      const after = bearingDeg(nodeAt(b.atNodeId), along(nodeIds.indexOf(b.atNodeId), TURN_LOOK_M));
      const net = classifyTurn(turnAngleDeg(before, after));
      if (net === 'straight') {
        // 行って戻るだけの折れ：両方の曲がりをやめ、次の案内に距離を足す
        const c = merged[i + 2];
        merged.splice(i, 3, {
          ...c,
          fromNodeId: a.fromNodeId,
          distanceM: a.distanceM + b.distanceM + c.distanceM,
        });
      } else {
        merged.splice(i, 2, {
          fromNodeId: a.fromNodeId,
          atNodeId: b.atNodeId,
          action: net,
          distanceM: a.distanceM + b.distanceM,
        });
      }
    }
    return merged;
  }
}

/**
 * ステップが通るノード列（起点〜動作地点）。地図で「いまの区間」を
 * 強調するのに使う。経路上に見つからなければ動作地点だけを返す。
 */
export function stepNodeIds(route: Route, step: RouteStep): NodeId[] {
  const start = route.nodeIds.indexOf(step.fromNodeId);
  if (start === -1) return [step.atNodeId];
  const end = route.nodeIds.indexOf(step.atNodeId, start);
  if (end === -1) return [step.atNodeId];
  return route.nodeIds.slice(start, end + 1);
}
