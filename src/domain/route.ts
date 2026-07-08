import type { Graph } from './graph';
import type { NodeId } from './types';

export interface RouteOptions {
  /** 階段を避ける（エレベーター・スロープ優先）。該当エッジにペナルティを課す。 */
  avoidStairs?: boolean;
}

export interface Route {
  nodeIds: NodeId[];
  totalDistanceM: number;
}

/** 階段回避時に階段エッジへ掛ける距離倍率。完全排除ではなく強い抑制。 */
const STAIRS_PENALTY_FACTOR = 5;

interface QueueEntry {
  nodeId: NodeId;
  cost: number;
}

/** 依存を増やさないための素朴な二分ヒープ */
class MinHeap {
  private items: QueueEntry[] = [];

  get size(): number {
    return this.items.length;
  }

  push(entry: QueueEntry): void {
    this.items.push(entry);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].cost <= this.items[i].cost) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  pop(): QueueEntry | undefined {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0 && last !== undefined) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        const right = left + 1;
        let smallest = i;
        if (left < this.items.length && this.items[left].cost < this.items[smallest].cost) {
          smallest = left;
        }
        if (right < this.items.length && this.items[right].cost < this.items[smallest].cost) {
          smallest = right;
        }
        if (smallest === i) break;
        [this.items[smallest], this.items[i]] = [this.items[i], this.items[smallest]];
        i = smallest;
      }
    }
    return top;
  }
}

/**
 * Dijkstra法で最短経路を求める。
 * 経路が存在しない場合は null を返す（未知ノードも同様）。
 */
export function findRoute(
  graph: Graph,
  from: NodeId,
  to: NodeId,
  options: RouteOptions = {},
): Route | null {
  if (!graph.nodes.has(from) || !graph.nodes.has(to)) return null;

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

    for (const edge of graph.adjacency.get(current.nodeId) ?? []) {
      const penalty =
        options.avoidStairs && edge.attrs.includes('stairs') ? STAIRS_PENALTY_FACTOR : 1;
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
