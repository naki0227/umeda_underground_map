import type { Graph } from '../../domain/graph';
import { FLOOR_ORDER, nodeFloor, type FloorId, type NodeId } from '../../domain/types';

/**
 * 階ごとの表示の判定。地図は選んだ階だけをはっきり描き、ほかの階は薄く残す。
 * 別の階とつながる点（出口・エスカレーターの端）は両方の階に出す。
 */
export interface FloorView {
  /** 地図に出てくる階（下から） */
  floors: FloorId[];
  floorOf: (id: NodeId) => FloorId;
  /** 点を階 floor に出すか（その階の点か、その階の点と線でつながる点） */
  isNodeOnFloor: (id: NodeId, floor: FloorId) => boolean;
  /** 線を階 floor に出すか（端のどちらかがその階） */
  isEdgeOnFloor: (a: NodeId, b: NodeId, floor: FloorId) => boolean;
}

export function buildFloorView(graph: Graph): FloorView {
  const floorById = new Map<NodeId, FloorId>();
  for (const node of graph.nodes.values()) floorById.set(node.id, nodeFloor(node));
  const floorOf = (id: NodeId): FloorId => floorById.get(id) ?? 'B1';
  const neighborFloors = new Map<NodeId, Set<FloorId>>();
  for (const [id, edges] of graph.adjacency) {
    neighborFloors.set(id, new Set(edges.map((edge) => floorOf(edge.to))));
  }
  const used = new Set(floorById.values());
  return {
    floors: FLOOR_ORDER.filter((floor) => used.has(floor)),
    floorOf,
    isNodeOnFloor: (id, floor) =>
      floorOf(id) === floor || (neighborFloors.get(id)?.has(floor) ?? false),
    isEdgeOnFloor: (a, b, floor) => floorOf(a) === floor || floorOf(b) === floor,
  };
}

/**
 * 案内中のステップ・選んだ場所に合わせて見せる階。出口（1F）は地下の通路から上がる所なので、
 * 地下の点があればその階を選ぶ。点がなければ null
 */
export function floorForNodes(view: FloorView, ids: NodeId[]): FloorId | null {
  const floors = ids.map(view.floorOf);
  return floors.find((floor) => floor !== '1F') ?? floors[0] ?? null;
}

export interface RouteRun {
  ids: NodeId[];
  onFloor: boolean;
}

/** 経路を、階 floor に出る区間と出ない区間に分ける（隣り合う区間は端の点を共有する） */
export function splitRouteByFloor(view: FloorView, ids: NodeId[], floor: FloorId): RouteRun[] {
  const runs: RouteRun[] = [];
  for (let i = 0; i < ids.length - 1; i += 1) {
    const onFloor = view.isEdgeOnFloor(ids[i], ids[i + 1], floor);
    const last = runs.at(-1);
    if (last && last.onFloor === onFloor) last.ids.push(ids[i + 1]);
    else runs.push({ ids: [ids[i], ids[i + 1]], onFloor });
  }
  return runs;
}
