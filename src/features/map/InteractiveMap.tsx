import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Graph } from '../../domain/graph';
import type { LocalizedText, NodeId, Poi, Shop } from '../../domain/types';
import { localized } from '../../i18n';
import { project, SLAB_DEPTH, type ScreenPoint } from './iso';
import { BUILDING_HALF_WIDTH, BUILDING_HEIGHT, buildBuildings } from './ground';
import { MapGroundLayer } from './MapGroundLayer';
import { MapMarkers } from './MapMarkers';
import { buildAreaZones } from './zones';
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

/** 同一ノードに複数の店ピンが重ならないよう円周上にずらす */
function shopOffset(index: number, count: number): { dx: number; dy: number } {
  if (count === 1) return { dx: 0, dy: 18 };
  const angle = (index / count) * Math.PI * 2;
  return { dx: Math.cos(angle) * 24, dy: Math.sin(angle) * 14 + 6 };
}

/** バッジ・チップの幅をテキストから概算する（全角=21px / 半角=12px 相当） */
function chipWidth(text: string): number {
  let width = 0;
  for (const ch of text) width += ch.charCodeAt(0) > 0xff ? 21 : 12;
  return width + 18;
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
    const map = new Map<NodeId, ScreenPoint>();
    for (const node of nodes) map.set(node.id, project(node.x, node.y));
    return map;
  }, [nodes]);

  const at = (id: NodeId) => screenOf.get(id) as ScreenPoint;

  const buildings = useMemo(() => buildBuildings(graph, pois), [graph, pois]);

  const zones = useMemo(() => {
    const list = buildAreaZones(nodes);
    // 駅構内ゾーンは広く重なるので最背面に敷く
    return list.sort((a, b) => (a.area === 'station' ? -1 : b.area === 'station' ? 1 : 0));
  }, [nodes]);

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
    const result: { key: string; a: ScreenPoint; b: ScreenPoint }[] = [];
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

  /** エスカレーター・エレベーター・階段のあるエッジの中点チップ */
  const facilities = useMemo(() => {
    const result: { key: string; label: string; mid: ScreenPoint }[] = [];
    for (const [fromId, edges] of graph.adjacency) {
      for (const edge of edges) {
        if (fromId >= edge.to) continue;
        const attr = (['escalator', 'elevator', 'stairs'] as const).find((a) =>
          edge.attrs.includes(a),
        );
        if (attr === undefined) continue;
        const a = screenOf.get(fromId);
        const b = screenOf.get(edge.to);
        if (!a || !b) continue;
        result.push({
          key: `${fromId}--${edge.to}`,
          label: t(`facilityShort.${attr}`),
          mid: { px: (a.px + b.px) / 2, py: (a.py + b.py) / 2 },
        });
      }
    }
    return result;
  }, [graph, screenOf, t]);

  const routePoints = useMemo(() => {
    if (!routeNodeIds || routeNodeIds.length < 2) return null;
    return routeNodeIds
      .map((id) => screenOf.get(id))
      .filter((p): p is ScreenPoint => p !== undefined)
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

  const exits = nodes.filter((n) => n.kind === 'exit');
  const pins = nodes.filter((n) => n.kind === 'gate' || n.kind === 'landmark');

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
        {/* エリアの地下ゾーン */}
        {zones.map((zone) => (
          <polygon
            key={zone.area}
            className={`map-zone zone-${zone.area}`}
            data-area={zone.area}
            points={zone.points}
          />
        ))}
        {zones
          .filter((zone) => zone.area !== 'station')
          .map((zone) => (
            <text
              key={`label-${zone.area}`}
              className="map-zone-label"
              x={zone.center.px}
              y={zone.center.py}
              textAnchor="middle"
            >
              {t(`area.${zone.area}`)}
            </text>
          ))}

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
        {facilities.map(({ key, label, mid }) => {
          const width = chipWidth(label);
          return (
            <g key={key} className="map-facility">
              <rect x={mid.px - width / 2} y={mid.py - 14} width={width} height={28} rx={14} />
              <text x={mid.px} y={mid.py + 7}>
                {label}
              </text>
            </g>
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
        {pins.map((node) => {
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
                {localized(node.name, i18n.language)}
              </text>
            </g>
          );
        })}
        {exits.map((node) => {
          const p = at(node.id);
          const label = node.exitNo ?? localized(node.name, i18n.language);
          const width = chipWidth(label);
          return (
            <g
              key={node.id}
              className="map-exit-badge"
              data-node-id={node.id}
              onClick={() => pick({ nodeId: node.id, name: node.name, aboveGround: false })}
            >
              <rect x={p.px - width / 2} y={p.py - 16} width={width} height={32} rx={9} />
              <text x={p.px} y={p.py + 7} textAnchor="middle">
                {label}
              </text>
              <title>{localized(node.name, i18n.language)}</title>
            </g>
          );
        })}

        <MapGroundLayer buildings={buildings} onPick={pick} />
        <MapMarkers
          current={currentNodeId ? at(currentNodeId) : undefined}
          destination={destinationNodeId ? at(destinationNodeId) : undefined}
        />
      </svg>
      <div className="map-legend" data-testid="map-legend">
        <span>
          <i className="swatch underground" />
          {t('map.legendUnderground')}
        </span>
        <span>
          <i className="swatch ground" />
          {t('map.legendGround')}
        </span>
      </div>
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
