import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Graph } from '../../domain/graph';
import type { LocalizedText, MapNode, NodeId, Shop } from '../../domain/types';
import { localized } from '../../i18n';
import { useMapViewport, type Bounds } from './useMapViewport';

/** マップ上で選択できる「場所」。POI・店・出口/駅を統一的に扱う */
export interface Place {
  nodeId: NodeId;
  name: LocalizedText;
  /** 地上スポット（POI）由来なら true。到着時に地上ヒントを出す */
  aboveGround: boolean;
}

interface Props {
  graph: Graph;
  shops: Shop[];
  routeNodeIds?: NodeId[];
  currentNodeId?: NodeId | null;
  destinationNodeId?: NodeId | null;
  onSelectPlace: (place: Place) => void;
}

const PADDING_M = 60;
const sy = (y: number) => -y;

function computeBounds(nodes: MapNode[]): Bounds {
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => sy(n.y));
  const minX = Math.min(...xs) - PADDING_M;
  const minY = Math.min(...ys) - PADDING_M;
  return {
    minX,
    minY,
    width: Math.max(...xs) - Math.min(...xs) + PADDING_M * 2,
    height: Math.max(...ys) - Math.min(...ys) + PADDING_M * 2,
  };
}

/** 同一ノードに複数の店ピンが重ならないよう円周上にずらす */
function shopOffset(index: number, count: number): { dx: number; dy: number } {
  if (count === 1) return { dx: 0, dy: 22 };
  const angle = (index / count) * Math.PI * 2;
  return { dx: Math.cos(angle) * 26, dy: Math.sin(angle) * 26 + 4 };
}

export function InteractiveMap({
  graph,
  shops,
  routeNodeIds,
  currentNodeId,
  destinationNodeId,
  onSelectPlace,
}: Props) {
  const { t, i18n } = useTranslation();
  const nodes = useMemo(() => [...graph.nodes.values()], [graph]);
  const bounds = useMemo(() => computeBounds(nodes), [nodes]);
  const viewport = useMapViewport(bounds);

  const lines = useMemo(() => {
    const result: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];
    for (const [fromId, edges] of graph.adjacency) {
      const from = graph.nodes.get(fromId);
      if (!from) continue;
      for (const edge of edges) {
        if (fromId >= edge.to) continue;
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

  const routePoints = useMemo(() => {
    if (!routeNodeIds || routeNodeIds.length < 2) return null;
    return routeNodeIds
      .map((id) => graph.nodes.get(id))
      .filter((n): n is MapNode => n !== undefined)
      .map((n) => `${n.x},${sy(n.y)}`)
      .join(' ');
  }, [graph, routeNodeIds]);

  const shopsByNode = useMemo(() => {
    const groups = new Map<NodeId, Shop[]>();
    for (const shop of shops) {
      const list = groups.get(shop.nodeId);
      if (list) list.push(shop);
      else groups.set(shop.nodeId, [shop]);
    }
    return groups;
  }, [shops]);

  const pick = (place: Place) => {
    if (viewport.isDragging()) return;
    onSelectPlace(place);
  };

  const nodeAt = (id: NodeId | null | undefined) => (id ? graph.nodes.get(id) : undefined);
  const current = nodeAt(currentNodeId);
  const destination = nodeAt(destinationNodeId);
  const selectable = nodes.filter(
    (n) => n.kind === 'exit' || n.kind === 'gate' || n.kind === 'landmark',
  );

  return (
    <div className="interactive-map">
      <svg
        ref={viewport.containerRef}
        viewBox={viewport.viewBox}
        role="img"
        aria-label={t('map.title')}
        data-testid="map-view"
        {...viewport.handlers}
      >
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
        {nodes
          .filter((n) => n.kind === 'junction')
          .map((node) => (
            <circle key={node.id} className="map-node" cx={node.x} cy={sy(node.y)} r={5} />
          ))}
        {[...shopsByNode.entries()].flatMap(([nodeId, group]) => {
          const node = graph.nodes.get(nodeId);
          if (!node) return [];
          return group.map((shop, index) => {
            const { dx, dy } = shopOffset(index, group.length);
            return (
              <circle
                key={shop.id}
                className="map-shop-pin"
                data-shop-id={shop.id}
                cx={node.x + dx}
                cy={sy(node.y) + dy}
                r={9}
                onClick={() => pick({ nodeId, name: shop.name, aboveGround: false })}
              >
                <title>{localized(shop.name, i18n.language)}</title>
              </circle>
            );
          });
        })}
        {selectable.map((node) => (
          <g
            key={node.id}
            className="map-pin"
            data-node-id={node.id}
            onClick={() => pick({ nodeId: node.id, name: node.name, aboveGround: false })}
          >
            <circle cx={node.x} cy={sy(node.y)} r={12} />
            <text className="map-label" x={node.x + 16} y={sy(node.y) - 10}>
              {node.exitNo !== undefined ? node.exitNo : localized(node.name, i18n.language)}
            </text>
          </g>
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
      <div className="map-zoom-controls">
        <button type="button" aria-label={t('map.zoomIn')} onClick={viewport.zoomIn}>
          ＋
        </button>
        <button type="button" aria-label={t('map.zoomOut')} onClick={viewport.zoomOut}>
          −
        </button>
        <button type="button" aria-label={t('map.resetView')} onClick={viewport.reset}>
          ⌂
        </button>
      </div>
    </div>
  );
}
