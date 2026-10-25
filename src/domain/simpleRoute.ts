import type { Graph } from './graph';
import { MinHeap } from './minHeap';
import { edgePenalty, type Route, type RouteOptions } from './route';
import type { NodeId } from './types';

/** はっきり曲がる（30°より大きい）ときに足す距離。研究では最も簡単な経路は最短より平均 16% 長い程度 */
export const TURN_PENALTY_M = 30;
/** 4 本以上に分かれる所で曲がるときに足す距離（迷いやすい） */
export const BUSY_JUNCTION_PENALTY_M = 10;
const TURN_DEG = 30;

/** a→b→c の曲がる角度（0〜180°） */
function turnAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
): number {
  const h1 = Math.atan2(b.y - a.y, b.x - a.x);
  const h2 = Math.atan2(c.y - b.y, c.x - b.x);
  let d = Math.abs(h2 - h1) * (180 / Math.PI);
  if (d > 180) d = 360 - d;
  return d;
}

const key = (node: NodeId, prev: NodeId | '') => `${prev}>${node}`;

/**
 * 曲がる回数の少ない経路。どこから来たかで曲がりが決まるので、「来た点・いる点」の組で Dijkstra を回す。
 * 曲がるたびに TURN_PENALTY_M、多く分かれる所ではさらに BUSY_JUNCTION_PENALTY_M を足す。
 * 出口は途中で通らない・閉まっている所は使わない・階段の扱いは findRoute と同じ。
 */
export function findSimpleRoute(
  graph: Graph,
  from: NodeId,
  to: NodeId,
  options: RouteOptions = {},
): Route | null {
  const cost = new Map<string, number>();
  const real = new Map<string, number>();
  const back = new Map<string, string>();
  const done = new Set<string>();
  const heap = new MinHeap();
  const start = key(from, '');
  cost.set(start, 0);
  real.set(start, 0);
  heap.push({ nodeId: start, cost: 0 });
  let goal: string | null = null;

  while (heap.size > 0) {
    const current = heap.pop();
    if (current === undefined) break;
    if (done.has(current.nodeId)) continue;
    done.add(current.nodeId);
    const [prev, node] = current.nodeId.split('>');
    if (node === to) {
      goal = current.nodeId;
      break;
    }
    if (node !== from && graph.nodes.get(node)?.kind === 'exit') continue;
    const here = graph.nodes.get(node);
    const before = prev === '' ? undefined : graph.nodes.get(prev);
    const branches = graph.adjacency.get(node)?.length ?? 0;

    for (const edge of graph.adjacency.get(node) ?? []) {
      if (edge.to === prev) continue;
      if (options.isClosed?.(node, edge)) continue;
      const next = graph.nodes.get(edge.to);
      let extra = 0;
      if (here && before && next && turnAngle(before, here, next) > TURN_DEG) {
        extra = TURN_PENALTY_M + (branches >= 4 ? BUSY_JUNCTION_PENALTY_M : 0);
      }
      const stairs = edgePenalty(graph, node, edge, options);
      const nextKey = key(edge.to, node);
      const nextCost = current.cost + edge.distanceM * stairs + extra;
      const known = cost.get(nextKey);
      if (known === undefined || nextCost < known) {
        cost.set(nextKey, nextCost);
        real.set(nextKey, (real.get(current.nodeId) ?? 0) + edge.distanceM);
        back.set(nextKey, current.nodeId);
        heap.push({ nodeId: nextKey, cost: nextCost });
      }
    }
  }

  if (goal === null) return null;
  const nodeIds: NodeId[] = [];
  let cursor: string | undefined = goal;
  while (cursor !== undefined) {
    nodeIds.unshift(cursor.split('>')[1]);
    cursor = back.get(cursor);
  }
  return { nodeIds, totalDistanceM: real.get(goal) ?? 0 };
}
