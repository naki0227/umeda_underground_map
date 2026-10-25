import type { AdjacentEdge, Graph } from './graph';
import { MinHeap } from './minHeap';
import { findSimpleRoute } from './simpleRoute';
import { nodeFloor, type EdgeAttr, type NodeId } from './types';

export interface RouteOptions {
  /** 階段を避ける（エレベーター・スロープ優先）。該当エッジにペナルティを課す。 */
  avoidStairs?: boolean;
  /** いま通れない線（夜間に閉まる通路など）。true の線は使わない */
  isClosed?: (from: NodeId, edge: AdjacentEdge) => boolean;
  /**
   * 曲がる回数の少ない「わかりやすい経路」にする（simpleRoute.ts）。
   * 曲がるたびに距離を足して比べる。最短より少し長くても、曲がりと分かれ道の少ない道を選ぶ
   */
  simple?: boolean;
  /**
   * 段差なし（エレベーター・スロープだけ）。スーツケース・ベビーカー・車いす向け。
   * 階段に加えてエスカレーターだけの上り下りも強く避ける
   */
  stepFree?: boolean;
}

export interface Route {
  nodeIds: NodeId[];
  totalDistanceM: number;
}

/** 階段回避時に階段エッジへ掛ける距離倍率。完全排除ではなく強い抑制。 */
export const STAIRS_PENALTY_FACTOR = 5;
/** 段差なしのとき、エレベーター・スロープのない上り下りに掛ける距離倍率 */
export const STEP_FREE_PENALTY_FACTOR = 20;

/** 線を通るときの距離倍率（階段を避ける・段差なし） */
export function edgePenalty(
  graph: Graph,
  from: NodeId,
  edge: AdjacentEdge,
  options: RouteOptions,
): number {
  if (options.stepFree && !stepFreeEdge(graph, from, edge)) return STEP_FREE_PENALTY_FACTOR;
  if (options.avoidStairs && stairsOnly(edge.attrs)) return STAIRS_PENALTY_FACTOR;
  return 1;
}

/** 段差なしで通れる線か（階が変わらない、または変わるならエレベーター・スロープがある） */
export function stepFreeEdge(graph: Graph, from: NodeId, edge: AdjacentEdge): boolean {
  if (edge.attrs.includes('elevator') || edge.attrs.includes('slope')) return true;
  if (edge.attrs.includes('stairs') || edge.attrs.includes('escalator')) return false;
  const a = graph.nodes.get(from);
  const b = graph.nodes.get(edge.to);
  return a === undefined || b === undefined || nodeFloor(a) === nodeFloor(b);
}

/**
 * Dijkstra法で最短経路を求める。出口（地上への出入口）は途中では通らない。
 * 経路が存在しない場合は null を返す（未知ノードも同様）。
 */
export function findRoute(
  graph: Graph,
  from: NodeId,
  to: NodeId,
  options: RouteOptions = {},
): Route | null {
  if (!graph.nodes.has(from) || !graph.nodes.has(to)) return null;
  if (options.simple) return findSimpleRoute(graph, from, to, options);

  const dist = new Map<NodeId, number>();
  const realDist = new Map<NodeId, number>();
  const prev = new Map<NodeId, NodeId>();
  const done = new Set<NodeId>();
  const heap = new MinHeap();

  dist.set(from, 0);
  realDist.set(from, 0);
  heap.push({ nodeId: from, cost: 0 });

  while (heap.size > 0) {
    const current = heap.pop();
    if (current === undefined) break;
    if (done.has(current.nodeId)) continue;
    done.add(current.nodeId);
    if (current.nodeId === to) break;
    // 出口は経路の出発点・到着点にだけ使う。途中で通ると地上へ出て別の出口から下りることになる
    if (current.nodeId !== from && graph.nodes.get(current.nodeId)?.kind === 'exit') continue;

    for (const edge of graph.adjacency.get(current.nodeId) ?? []) {
      if (options.isClosed?.(current.nodeId, edge)) continue;
      const penalty = edgePenalty(graph, current.nodeId, edge, options);
      const nextCost = current.cost + edge.distanceM * penalty;
      const known = dist.get(edge.to);
      if (known === undefined || nextCost < known) {
        dist.set(edge.to, nextCost);
        realDist.set(edge.to, (realDist.get(current.nodeId) ?? 0) + edge.distanceM);
        prev.set(edge.to, current.nodeId);
        heap.push({ nodeId: edge.to, cost: nextCost });
      }
    }
  }

  if (!done.has(to)) return null;

  const nodeIds: NodeId[] = [];
  let cursor: NodeId | undefined = to;
  while (cursor !== undefined) {
    nodeIds.unshift(cursor);
    cursor = prev.get(cursor);
  }

  return { nodeIds, totalDistanceM: realDist.get(to) ?? 0 };
}

/** 階段しかない通路か（エスカレーター等が並んでいる通路は階段を避けて通れる） */
export function stairsOnly(attrs: readonly EdgeAttr[]): boolean {
  return attrs.includes('stairs') && attrs.every((attr) => attr === 'stairs');
}

/**
 * 経路に階段が含まれるか。階段属性のエッジに加え、設備が不明なフロア移動
 * （案内文では階段として表現する）も階段とみなす。
 */
export function routeUsesStairs(graph: Graph, route: Route): boolean {
  for (let i = 0; i < route.nodeIds.length - 1; i += 1) {
    const from = route.nodeIds[i];
    const to = route.nodeIds[i + 1];
    const edge = (graph.adjacency.get(from) ?? []).find((e) => e.to === to);
    if (edge === undefined) continue;
    if (stairsOnly(edge.attrs)) return true;
    const a = graph.nodes.get(from);
    const b = graph.nodes.get(to);
    const changesFloor = a !== undefined && b !== undefined && nodeFloor(a) !== nodeFloor(b);
    if (changesFloor && edge.attrs.length === 0) return true;
  }
  return false;
}

/** 段差なしでは通れない上り下り（階段・エスカレーターだけ）が経路にあるか */
export function routeNeedsSteps(graph: Graph, route: Route): boolean {
  for (let i = 0; i < route.nodeIds.length - 1; i += 1) {
    const from = route.nodeIds[i];
    const edge = (graph.adjacency.get(from) ?? []).find((e) => e.to === route.nodeIds[i + 1]);
    if (edge !== undefined && !stepFreeEdge(graph, from, edge)) return true;
  }
  return false;
}
