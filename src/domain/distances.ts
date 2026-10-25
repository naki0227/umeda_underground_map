import type { Graph } from './graph';
import { MinHeap } from './minHeap';
import type { NodeId } from './types';

/**
 * 1 つの点から、ほかのすべての点までの通路の距離（m）。設備の一覧を近い順に並べるのに使う。
 * 経路探索と同じく、出口は途中では通らない
 */
export function distancesFrom(graph: Graph, from: NodeId): Map<NodeId, number> {
  const dist = new Map<NodeId, number>();
  if (!graph.nodes.has(from)) return dist;
  const done = new Set<NodeId>();
  const heap = new MinHeap();
  dist.set(from, 0);
  heap.push({ nodeId: from, cost: 0 });
  while (heap.size > 0) {
    const current = heap.pop();
    if (current === undefined) break;
    if (done.has(current.nodeId)) continue;
    done.add(current.nodeId);
    if (current.nodeId !== from && graph.nodes.get(current.nodeId)?.kind === 'exit') continue;
    for (const edge of graph.adjacency.get(current.nodeId) ?? []) {
      const next = current.cost + edge.distanceM;
      const known = dist.get(edge.to);
      if (known === undefined || next < known) {
        dist.set(edge.to, next);
        heap.push({ nodeId: edge.to, cost: next });
      }
    }
  }
  return dist;
}
