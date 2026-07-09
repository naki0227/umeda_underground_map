import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Graph } from '../domain/graph';
import type { MapNode, NodeId } from '../domain/types';
import { localized } from '../i18n';

interface Props {
  graph: Graph;
  /** 経路（順序付きノード列）をハイライトする */
  routeNodeIds?: NodeId[];
  /** 現在地マーカー */
  currentNodeId?: NodeId | null;
  /** 目的地マーカー */
  destinationNodeId?: NodeId | null;
  /** 位置推定の候補（薄くハイライト） */
  candidateNodeIds?: NodeId[];
}

interface Line {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const PADDING_M = 60;

/** 北=+y の平面座標をSVG座標系（下向き+y）へ */
const sy = (y: number) => -y;

/**
 * 地下街の通路網を俯瞰表示する静的マップ。
 * 位置の追跡はせず、渡されたマーカーだけを描画する。
 */
export function MapView({
  graph,
  routeNodeIds,
  currentNodeId,
  destinationNodeId,
  candidateNodeIds,
}: Props) {
  const { t, i18n } = useTranslation();

  const nodes = useMemo(() => [...graph.nodes.values()], [graph]);

  const lines = useMemo<Line[]>(() => {
    const result: Line[] = [];
    for (const [fromId, edges] of graph.adjacency) {
      const from = graph.nodes.get(fromId);
      if (!from) continue;
      for (const edge of edges) {
        if (fromId >= edge.to) continue; // 双方向分の重複を除く
        const to = graph.nodes.get(edge.to);
        if (!to) continue;
        result.push({
          key: `${fromId}--${edge.to}`,
          x1: from.x,
          y1: sy(from.y),
          x2: to.x,
          y2: sy(to.y),
        });
      }
    }
    return result;
  }, [graph]);

  const viewBox = useMemo(() => {
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => sy(n.y));
    const minX = Math.min(...xs) - PADDING_M;
    const minY = Math.min(...ys) - PADDING_M;
    const width = Math.max(...xs) - Math.min(...xs) + PADDING_M * 2;
    const height = Math.max(...ys) - Math.min(...ys) + PADDING_M * 2;
    return `${minX} ${minY} ${width} ${height}`;
  }, [nodes]);

  const routePoints = useMemo(() => {
    if (!routeNodeIds || routeNodeIds.length < 2) return null;
    return routeNodeIds
      .map((id) => graph.nodes.get(id))
      .filter((n): n is MapNode => n !== undefined)
      .map((n) => `${n.x},${sy(n.y)}`)
      .join(' ');
  }, [graph, routeNodeIds]);

  const candidateSet = new Set(candidateNodeIds ?? []);
  const labeled = nodes.filter(
    (n) => n.kind === 'gate' || n.kind === 'landmark' || n.kind === 'exit',
  );
  const nodeAt = (id: NodeId | null | undefined) => (id ? graph.nodes.get(id) : undefined);
  const current = nodeAt(currentNodeId);
  const destination = nodeAt(destinationNodeId);

  return (
    <figure className="map-view">
      <svg viewBox={viewBox} role="img" aria-label={t('map.title')} data-testid="map-view">
        {lines.map((line) => (
          <line
            key={line.key}
            className="map-edge"
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
          />
        ))}
        {routePoints !== null && (
          <polyline className="map-route" points={routePoints} data-testid="map-route" />
        )}
        {nodes.map((node) => (
          <circle
            key={node.id}
            className={candidateSet.has(node.id) ? 'map-node candidate' : 'map-node'}
            cx={node.x}
            cy={sy(node.y)}
            r={candidateSet.has(node.id) ? 16 : node.kind === 'junction' ? 5 : 8}
          />
        ))}
        {labeled.map((node) => (
          <text key={`label-${node.id}`} className="map-label" x={node.x + 12} y={sy(node.y) - 10}>
            {node.exitNo !== undefined ? node.exitNo : localized(node.name, i18n.language)}
          </text>
        ))}
        {destination !== undefined && (
          <g data-testid="map-destination">
            <circle
              className="map-marker destination"
              cx={destination.x}
              cy={sy(destination.y)}
              r={18}
            />
            <text
              className="map-marker-label destination"
              x={destination.x + 22}
              y={sy(destination.y) + 8}
            >
              {t('map.destination')}
            </text>
          </g>
        )}
        {current !== undefined && (
          <g data-testid="map-current">
            <circle className="map-marker current" cx={current.x} cy={sy(current.y)} r={18} />
            <text className="map-marker-label current" x={current.x + 22} y={sy(current.y) + 8}>
              {t('map.you')}
            </text>
          </g>
        )}
      </svg>
      <figcaption className="hint">{t('map.caption')}</figcaption>
    </figure>
  );
}
