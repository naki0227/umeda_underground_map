import type { RouteStep } from '../../../domain/directions';
import { projectToPlane } from '../../../domain/geo';
import type { Graph } from '../../../domain/graph';
import type { Route } from '../../../domain/route';
import { buildSideView, type SideItem, type SideView } from '../../../domain/sideView';
import {
  FLOOR_ORDER,
  nodeFloor,
  type EdgeAttr,
  type FloorId,
  type LocalizedText,
  type Shop,
} from '../../../domain/types';
import type { SceneInput, SceneItem } from './corridorScene';
import { DEFAULT_SHOP_STYLE, EXIT_STYLE, SHOP_STYLE } from './shopStyle';

/** 一人称の絵に入れる先の長さ（m） */
export const SCENE_AHEAD_M = 100;

/** 1階ぶんの高さ（m）。一人称の絵で階段・エスカレーターの上り下りを描く */
const FLOOR_HEIGHT_M = 4.5;
/** 店の位置がこれより経路から離れていたら、店の前の点の位置を使う（m） */
const SHOP_NEAR_PATH_M = 25;

/** 点 p を折れ線に落としたときの、起点からの距離・左（正）右（負）のずれ・離れ具合 */
export function projectOntoPath(
  path: { x: number; y: number }[],
  p: { x: number; y: number },
): { s: number; offset: number; distance: number } {
  let best = { s: 0, offset: 0, distance: Infinity };
  let walked = 0;
  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1];
    const b = path[i];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length > 0) {
      const ux = (b.x - a.x) / length;
      const uy = (b.y - a.y) / length;
      const t = Math.min(Math.max((p.x - a.x) * ux + (p.y - a.y) * uy, 0), length);
      const qx = a.x + ux * t;
      const qy = a.y + uy * t;
      const distance = Math.hypot(p.x - qx, p.y - qy);
      if (distance < best.distance) {
        best = { s: walked + t, offset: ux * (p.y - a.y) - uy * (p.x - a.x), distance };
      }
    }
    walked += length;
  }
  return best;
}

const pickVia = (attrs: EdgeAttr[] | undefined): EdgeAttr =>
  attrs?.find((a) => a === 'escalator' || a === 'elevator' || a === 'stairs') ?? 'stairs';

export const TURN_ICON: Partial<Record<RouteStep['action'], string>> = {
  left: '↰',
  right: '↱',
  'u-turn': '↩',
};

/**
 * いまの区間の起点から経路に沿って SCENE_AHEAD_M 先までを、一人称の絵の材料にする。
 * 区間の先の曲がり角も入れるので、曲がった先の通路と店も見える。
 * sideView は読み上げ・支援技術向けの、いまの区間の左右の一覧。
 */
export function buildSceneInput(
  graph: Graph,
  shops: Shop[],
  route: Route,
  step: RouteStep,
  name: (text: LocalizedText) => string,
  goalText: string,
  floorText: (via: EdgeAttr, floor: FloorId) => string = (via, floor) => `${via} ${floor}`,
): { scene: SceneInput; sideView: SideView } {
  const start = Math.max(0, route.nodeIds.indexOf(step.fromNodeId));
  const nodeIds = [route.nodeIds[start]];
  const cum = [0];
  for (let i = start + 1; i < route.nodeIds.length && cum[cum.length - 1] < SCENE_AHEAD_M; i += 1) {
    const a = graph.nodes.get(route.nodeIds[i - 1]);
    const b = graph.nodes.get(route.nodeIds[i]);
    if (!a || !b) break;
    nodeIds.push(route.nodeIds[i]);
    cum.push(cum[cum.length - 1] + Math.hypot(b.x - a.x, b.y - a.y));
  }
  // 床の高さは階で決める（B2 → B1 → 1F の順に高い）
  const path = nodeIds.flatMap((id) => {
    const node = graph.nodes.get(id);
    return node
      ? [{ x: node.x, y: node.y, z: FLOOR_ORDER.indexOf(nodeFloor(node)) * FLOOR_HEIGHT_M }]
      : [];
  });
  const after = route.nodeIds[start + nodeIds.length];
  const view = buildSideView(graph, shops, nodeIds, after === undefined ? [] : [after]);

  const stepEnd = nodeIds.indexOf(step.atNodeId);
  const sideView: SideView = {
    left: view.left.filter((item) => stepEnd < 0 || item.index <= stepEnd),
    right: view.right.filter((item) => stepEnd < 0 || item.index <= stepEnd),
    along: view.along.filter((item) => stepEnd < 0 || item.index <= stepEnd),
  };

  // 店は、位置が分かれば経路に落とした位置と左右で置く（分からなければ店の前の点の位置）
  const shopById = new Map(shops.map((shop) => [`shop:${shop.id}`, shop]));
  const toItem = (item: SideItem, side: 'left' | 'right'): SceneItem => {
    const style =
      item.kind === 'exit'
        ? EXIT_STYLE
        : item.category !== undefined
          ? SHOP_STYLE[item.category]
          : DEFAULT_SHOP_STYLE;
    let distanceM = cum[item.index] ?? 0;
    let placedSide = side;
    const shop = shopById.get(item.key);
    if (shop?.lat !== undefined && shop.lng !== undefined) {
      const at = projectOntoPath(path, projectToPlane({ lat: shop.lat, lng: shop.lng }));
      if (at.distance <= SHOP_NEAR_PATH_M) {
        distanceM = at.s;
        if (Math.abs(at.offset) > 1) placedSide = at.offset > 0 ? 'left' : 'right';
      }
    }
    return {
      key: item.key,
      kind: item.kind,
      side: placedSide,
      distanceM,
      name: name(item.name),
      icon: style.icon,
      color: style.color,
    };
  };
  const items = [
    ...view.left.map((item) => toItem(item, 'left')),
    ...view.right.map((item) => toItem(item, 'right')),
    ...view.along.map((item, i) => toItem(item, i % 2 === 0 ? 'left' : 'right')),
  ];

  // 見えている範囲で最初に階を移る所
  const floorIndex = path.findIndex((p, i) => i > 0 && p.z !== path[i - 1].z);
  const floorChange = (() => {
    if (floorIndex < 0) return undefined;
    const from = graph.nodes.get(nodeIds[floorIndex - 1]);
    const to = graph.nodes.get(nodeIds[floorIndex]);
    if (!from || !to) return undefined;
    const edge = graph.adjacency.get(from.id)?.find((e) => e.to === to.id);
    const up = path[floorIndex].z > path[floorIndex - 1].z;
    return {
      distanceM: cum[floorIndex - 1],
      icon: up ? '⬆' : '⬇',
      text: floorText(pickVia(edge?.attrs), nodeFloor(to)),
    };
  })();

  const turnIcon = TURN_ICON[step.action];
  const lastId = nodeIds[nodeIds.length - 1];
  return {
    scene: {
      path,
      items,
      turn:
        turnIcon !== undefined && stepEnd >= 0
          ? { distanceM: cum[stepEnd], icon: turnIcon }
          : undefined,
      floorChange,
      goal:
        lastId === route.nodeIds[route.nodeIds.length - 1]
          ? { icon: '🏁', text: goalText }
          : undefined,
    },
    sideView,
  };
}
