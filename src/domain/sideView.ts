import { projectToPlane } from './geo';
import type { Graph } from './graph';
import type { LocalizedText, NodeId, Shop } from './types';

/** 進む方向から見た位置。along は左右が分からない（通路の真上・位置が不明） */
export type Side = 'left' | 'right' | 'along';

export interface SideItem {
  key: string;
  kind: 'shop' | 'exit' | 'passage';
  name: LocalizedText;
  side: Side;
  /** 区間の起点からの距離（m） */
  distanceM: number;
}

export interface SideView {
  left: SideItem[];
  right: SideItem[];
  along: SideItem[];
}

/** 進む方向からこれより近い（m）ものは左右を決めない */
const SIDE_MIN_OFFSET_M = 1.5;

/**
 * 区間 nodeIds（起点 → 終点）を歩くとき、左右に見える店・出口・脇の通路を、起点からの距離の順に返す。
 * 左右は、進む方向に対して位置がどちら側にあるか（店は店の位置、出口・脇の通路は分かれる先の点）。
 * excludeIds（次の区間で進む点など）は脇の通路に数えない。
 */
export function buildSideView(
  graph: Graph,
  shops: Shop[],
  nodeIds: NodeId[],
  excludeIds: NodeId[] = [],
): SideView {
  const view: SideView = { left: [], right: [], along: [] };
  if (nodeIds.length === 0) return view;
  const onPath = new Set([...nodeIds, ...excludeIds]);
  const shopsByNode = new Map<NodeId, Shop[]>();
  for (const shop of shops) {
    const list = shopsByNode.get(shop.nodeId);
    if (list) list.push(shop);
    else shopsByNode.set(shop.nodeId, [shop]);
  }
  const point = (id: NodeId) => graph.nodes.get(id);
  const seen = new Set<string>();

  let distanceM = 0;
  nodeIds.forEach((id, index) => {
    const here = point(id);
    if (!here) return;
    if (index > 0) {
      const prevId = nodeIds[index - 1];
      const edge = graph.adjacency.get(prevId)?.find((e) => e.to === id);
      const prev = point(prevId);
      distanceM += edge?.distanceM ?? (prev ? Math.hypot(here.x - prev.x, here.y - prev.y) : 0);
    }
    // この点での進む方向（終点では、来た方向）
    const ahead = point(nodeIds[index + 1] ?? '');
    const behind = point(nodeIds[index - 1] ?? '');
    const dir = ahead
      ? { x: ahead.x - here.x, y: ahead.y - here.y }
      : behind
        ? { x: here.x - behind.x, y: here.y - behind.y }
        : null;
    const sideOf = (x: number, y: number): Side => {
      if (dir === null) return 'along';
      const length = Math.hypot(dir.x, dir.y) || 1;
      // 外積が正なら左（x=東・y=北の座標）
      const offset = (dir.x * (y - here.y) - dir.y * (x - here.x)) / length;
      if (Math.abs(offset) < SIDE_MIN_OFFSET_M) return 'along';
      return offset > 0 ? 'left' : 'right';
    };
    const push = (item: SideItem) => view[item.side].push(item);

    for (const shop of shopsByNode.get(id) ?? []) {
      const side =
        shop.lat !== undefined && shop.lng !== undefined
          ? (() => {
              const p = projectToPlane({ lat: shop.lat, lng: shop.lng });
              return sideOf(p.x, p.y);
            })()
          : 'along';
      push({ key: `shop:${shop.id}`, kind: 'shop', name: shop.name, side, distanceM });
    }
    const pushExit = (exitId: NodeId, x: number, y: number) => {
      const exit = point(exitId);
      if (!exit || seen.has(`exit:${exitId}`)) return;
      seen.add(`exit:${exitId}`);
      const no = exit.exitNo ?? exit.name.ja;
      push({
        key: `exit:${exitId}`,
        kind: 'exit',
        name: exit.exitNo !== undefined ? { ja: no, en: no } : exit.name,
        side: sideOf(x, y),
        distanceM,
      });
    };
    for (const edge of graph.adjacency.get(id) ?? []) {
      if (onPath.has(edge.to)) continue;
      const other = point(edge.to);
      if (!other) continue;
      if (other.kind === 'exit') {
        pushExit(other.id, other.x, other.y);
        continue;
      }
      // 出口の階段の下だけの点（ほかに出口しかつながらない）は、その出口として出す
      const beyond = (graph.adjacency.get(other.id) ?? []).filter((e) => e.to !== id);
      const exitsBeyond = beyond.filter((e) => point(e.to)?.kind === 'exit');
      if (beyond.length > 0 && exitsBeyond.length === beyond.length) {
        for (const e of exitsBeyond) pushExit(e.to, other.x, other.y);
        continue;
      }
      const key = `passage:${other.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      push({ key, kind: 'passage', name: other.name, side: sideOf(other.x, other.y), distanceM });
    }
  });
  return view;
}
