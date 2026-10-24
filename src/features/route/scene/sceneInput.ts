import type { RouteStep } from '../../../domain/directions';
import type { Graph } from '../../../domain/graph';
import type { Route } from '../../../domain/route';
import { buildSideView, type SideItem, type SideView } from '../../../domain/sideView';
import type { LocalizedText, Shop } from '../../../domain/types';
import type { SceneInput, SceneItem } from './corridorScene';
import { DEFAULT_SHOP_STYLE, EXIT_STYLE, SHOP_STYLE } from './shopStyle';

/** 一人称の絵に入れる先の長さ（m） */
export const SCENE_AHEAD_M = 100;

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
  const path = nodeIds.flatMap((id) => {
    const node = graph.nodes.get(id);
    return node ? [{ x: node.x, y: node.y }] : [];
  });
  const after = route.nodeIds[start + nodeIds.length];
  const view = buildSideView(graph, shops, nodeIds, after === undefined ? [] : [after]);

  const stepEnd = nodeIds.indexOf(step.atNodeId);
  const sideView: SideView = {
    left: view.left.filter((item) => stepEnd < 0 || item.index <= stepEnd),
    right: view.right.filter((item) => stepEnd < 0 || item.index <= stepEnd),
    along: view.along.filter((item) => stepEnd < 0 || item.index <= stepEnd),
  };

  // 左右が分からない店は、左右に交互に置く
  const toItem = (item: SideItem, side: 'left' | 'right'): SceneItem => {
    const style =
      item.kind === 'exit'
        ? EXIT_STYLE
        : item.category !== undefined
          ? SHOP_STYLE[item.category]
          : DEFAULT_SHOP_STYLE;
    return {
      key: item.key,
      kind: item.kind,
      side,
      distanceM: cum[item.index] ?? 0,
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
      goal:
        lastId === route.nodeIds[route.nodeIds.length - 1]
          ? { icon: '🏁', text: goalText }
          : undefined,
    },
    sideView,
  };
}
