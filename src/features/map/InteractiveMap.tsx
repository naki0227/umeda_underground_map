import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Graph } from '../../domain/graph';
import type { LocalizedText, NodeId, Poi, Shop } from '../../domain/types';
import { localized } from '../../i18n';
import { buildingFaces, GROUND_ELEVATION, project, SLAB_DEPTH } from './iso';
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
  pois: Poi[];
  routeNodeIds?: NodeId[];
  currentNodeId?: NodeId | null;
  destinationNodeId?: NodeId | null;
  onSelectPlace: (place: Place) => void;
}

const PADDING = 90;
const BUILDING_HALF_WIDTH = 34;
const BUILDING_HEIGHT = 40;

/** 同一ノードに複数の店ピンが重ならないよう円周上にずらす */
function shopOffset(index: number, count: number): { dx: number; dy: number } {
  if (count === 1) return { dx: 0, dy: 18 };
  const angle = (index / count) * Math.PI * 2;
  return { dx: Math.cos(angle) * 24, dy: Math.sin(angle) * 14 + 6 };
}

export function InteractiveMap({
  graph,
  shops,
  pois,
  routeNodeIds,
  currentNodeId,
  destinationNodeId,
  onSelectPlace,
}: Props) {
  const { t, i18n } = useTranslation();
  const nodes = useMemo(() => [...graph.nodes.values()], [graph]);

  const screenOf = useMemo(() => {
    const map = new Map<NodeId, { px: number; py: number }>();
    for (const node of nodes) map.set(node.id, project(node.x, node.y));
    return map;
  }, [nodes]);

  const at = (id: NodeId) => screenOf.get(id) as { px: number; py: number };

  /** 地上の建物: POIをノードごとにまとめて横に並べる */
  const buildings = useMemo(() => {
    const byNode = new Map<NodeId, Poi[]>();
    for (const poi of pois) {
      const list = byNode.get(poi.nodeId);
      if (list) list.push(poi);
      else byNode.set(poi.nodeId, [poi]);
    }
    const result: {
      poi: Poi;
      base: { px: number; py: number };
      anchor: { px: number; py: number };
    }[] = [];
    for (const [nodeId, group] of byNode) {
      const node = graph.nodes.get(nodeId);
      if (!node) continue;
      const anchor = project(node.x, node.y);
      group.forEach((poi, index) => {
        const spread = (index - (group.length - 1) / 2) * (BUILDING_HALF_WIDTH * 2.4);
        const base = project(node.x, node.y, GROUND_ELEVATION);
        result.push({ poi, base: { px: base.px + spread, py: base.py }, anchor });
      });
    }
    return result.sort((a, b) => a.base.py - b.base.py);
  }, [pois, graph]);

  const bounds = useMemo<Bounds>(() => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const { px, py } of screenOf.values()) {
      xs.push(px);
      ys.push(py);
    }
    for (const b of buildings) {
      xs.push(b.base.px - BUILDING_HALF_WIDTH, b.base.px + BUILDING_HALF_WIDTH);
      ys.push(b.base.py - BUILDING_HEIGHT - BUILDING_HALF_WIDTH);
    }
    const minX = Math.min(...xs) - PADDING;
    const minY = Math.min(...ys) - PADDING;
    return {
      minX,
      minY,
      width: Math.max(...xs) - Math.min(...xs) + PADDING * 2,
      height: Math.max(...ys) - Math.min(...ys) + PADDING * 2,
    };
  }, [screenOf, buildings]);

  const viewport = useMapViewport(bounds);

  /** 通路スラブ。奥→手前の順に描く */
  const slabs = useMemo(() => {
    const result: { key: string; a: { px: number; py: number }; b: { px: number; py: number } }[] =
      [];
    for (const [fromId, edges] of graph.adjacency) {
      for (const edge of edges) {
        if (fromId >= edge.to) continue;
        const a = screenOf.get(fromId);
        const b = screenOf.get(edge.to);
        if (!a || !b) continue;
        result.push({ key: `${fromId}--${edge.to}`, a, b });
      }
    }
    return result.sort((s, u) => Math.max(s.a.py, s.b.py) - Math.max(u.a.py, u.b.py));
  }, [graph, screenOf]);

  const routePoints = useMemo(() => {
    if (!routeNodeIds || routeNodeIds.length < 2) return null;
    return routeNodeIds
      .map((id) => screenOf.get(id))
      .filter((p): p is { px: number; py: number } => p !== undefined)
      .map((p) => `${p.px},${p.py}`)
      .join(' ');
  }, [routeNodeIds, screenOf]);

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

  const current = currentNodeId ? at(currentNodeId) : undefined;
  const destination = destinationNodeId ? at(destinationNodeId) : undefined;
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
        {/* 地下フロア: 通路スラブ（側面→上面） */}
        {slabs.map(({ key, a, b }) => (
          <polygon
            key={`side-${key}`}
            className="map-edge-side"
            points={`${a.px},${a.py} ${b.px},${b.py} ${b.px},${b.py + SLAB_DEPTH} ${a.px},${a.py + SLAB_DEPTH}`}
          />
        ))}
        {slabs.map(({ key, a, b }) => (
          <line key={`top-${key}`} className="map-edge" x1={a.px} y1={a.py} x2={b.px} y2={b.py} />
        ))}
        {routePoints !== null && (
          <polyline className="map-route" points={routePoints} data-testid="map-route" />
        )}
        {nodes
          .filter((n) => n.kind === 'junction')
          .map((node) => {
            const p = at(node.id);
            return (
              <ellipse key={node.id} className="map-node" cx={p.px} cy={p.py} rx={6} ry={3.5} />
            );
          })}
        {[...shopsByNode.entries()].flatMap(([nodeId, group]) => {
          const p = screenOf.get(nodeId);
          if (!p) return [];
          return group.map((shop, index) => {
            const { dx, dy } = shopOffset(index, group.length);
            return (
              <ellipse
                key={shop.id}
                className="map-shop-pin"
                data-shop-id={shop.id}
                cx={p.px + dx}
                cy={p.py + dy}
                rx={9}
                ry={5.5}
                onClick={() => pick({ nodeId, name: shop.name, aboveGround: false })}
              >
                <title>{localized(shop.name, i18n.language)}</title>
              </ellipse>
            );
          });
        })}
        {selectable.map((node) => {
          const p = at(node.id);
          return (
            <g
              key={node.id}
              className="map-pin"
              data-node-id={node.id}
              onClick={() => pick({ nodeId: node.id, name: node.name, aboveGround: false })}
            >
              <ellipse cx={p.px} cy={p.py} rx={12} ry={7} />
              <text className="map-label" x={p.px + 16} y={p.py - 8}>
                {node.exitNo !== undefined ? node.exitNo : localized(node.name, i18n.language)}
              </text>
            </g>
          );
        })}

        {/* 地上レイヤー: 階段リンクと建物 */}
        {buildings.map(({ poi, base, anchor }) => (
          <line
            key={`link-${poi.id}`}
            className="stair-link"
            x1={anchor.px}
            y1={anchor.py}
            x2={base.px}
            y2={base.py + 2}
          />
        ))}
        {buildings.map(({ poi, base }) => {
          const faces = buildingFaces(base, BUILDING_HALF_WIDTH, BUILDING_HEIGHT);
          return (
            <g
              key={poi.id}
              className="building"
              data-poi-id={poi.id}
              onClick={() => pick({ nodeId: poi.nodeId, name: poi.name, aboveGround: true })}
            >
              <polygon className="building-left" points={faces.left} />
              <polygon className="building-right" points={faces.right} />
              <polygon className="building-top" points={faces.top} />
              <text
                className="map-label building-label"
                x={base.px}
                y={base.py - BUILDING_HEIGHT - BUILDING_HALF_WIDTH * 0.5 - 10}
                textAnchor="middle"
              >
                {localized(poi.name, i18n.language)}
              </text>
            </g>
          );
        })}

        {destination !== undefined && (
          <g data-testid="map-destination">
            <line
              className="marker-stem destination"
              x1={destination.px}
              y1={destination.py}
              x2={destination.px}
              y2={destination.py - 34}
            />
            <circle
              className="map-marker destination"
              cx={destination.px}
              cy={destination.py - 42}
              r={13}
            />
            <text
              className="map-marker-label destination"
              x={destination.px + 18}
              y={destination.py - 38}
            >
              {t('map.destination')}
            </text>
          </g>
        )}
        {current !== undefined && (
          <g data-testid="map-current">
            <line
              className="marker-stem current"
              x1={current.px}
              y1={current.py}
              x2={current.px}
              y2={current.py - 34}
            />
            <circle className="map-marker current" cx={current.px} cy={current.py - 42} r={13} />
            <text className="map-marker-label current" x={current.px + 18} y={current.py - 38}>
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
