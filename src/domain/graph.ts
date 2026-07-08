import type { EdgeAttr, MapEdge, MapNode, NodeId, UndergroundMap } from './types';

export interface AdjacentEdge {
  to: NodeId;
  distanceM: number;
  attrs: EdgeAttr[];
}

/** 経路探索・距離計算に使う隣接リスト表現 */
export interface Graph {
  nodes: Map<NodeId, MapNode>;
  adjacency: Map<NodeId, AdjacentEdge[]>;
}

export class MapDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MapDataError';
  }
}

function addAdjacency(
  adjacency: Map<NodeId, AdjacentEdge[]>,
  from: NodeId,
  edge: MapEdge,
  to: NodeId,
): void {
  const list = adjacency.get(from);
  const entry: AdjacentEdge = { to, distanceM: edge.distanceM, attrs: edge.attrs ?? [] };
  if (list) {
    list.push(entry);
  } else {
    adjacency.set(from, [entry]);
  }
}

/**
 * マップデータからグラフを構築する。
 * データ不整合（重複ID・未知ノード参照・不正距離）は例外として弾く。
 */
export function buildGraph(map: Pick<UndergroundMap, 'nodes' | 'edges'>): Graph {
  const nodes = new Map<NodeId, MapNode>();
  for (const node of map.nodes) {
    if (nodes.has(node.id)) {
      throw new MapDataError(`duplicate node id: ${node.id}`);
    }
    nodes.set(node.id, node);
  }

  const adjacency = new Map<NodeId, AdjacentEdge[]>();
  for (const edge of map.edges) {
    if (!nodes.has(edge.from)) {
      throw new MapDataError(`edge references unknown node: ${edge.from}`);
    }
    if (!nodes.has(edge.to)) {
      throw new MapDataError(`edge references unknown node: ${edge.to}`);
    }
    if (!(edge.distanceM > 0)) {
      throw new MapDataError(`edge ${edge.from} -> ${edge.to} has non-positive distance`);
    }
    addAdjacency(adjacency, edge.from, edge, edge.to);
    addAdjacency(adjacency, edge.to, edge, edge.from);
  }

  return { nodes, adjacency };
}
