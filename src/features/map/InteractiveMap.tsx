import { useEffect, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Graph } from '../../domain/graph';
import type { LocalizedText, MapNode, NodeId, Poi, Shop } from '../../domain/types';
import { localized } from '../../i18n';
import { project, SLAB_DEPTH, type ScreenPoint } from './iso';
import { BUILDING_HALF_WIDTH, BUILDING_HEIGHT, buildBuildings } from './ground';
import { MapGroundLayer } from './MapGroundLayer';
import { placeLabels } from './labelLayout';
import {
  buildMapLabelBoxes,
  chipWidthPx,
  EXIT_BADGE_HEIGHT_PX,
  EXIT_FONT_PX,
  FACILITY_FONT_PX,
  SHOP_LABEL_FONT_PX,
  SHOP_LABEL_OFFSET_PX,
} from './mapLabels';
import { MapMarkers } from './MapMarkers';
import { pressable } from './pressable';
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
  /** 案内中のいまのステップが通るノード。強調表示し、地図をそこへ寄せ、沿道の店名を出す */
  focusNodeIds?: NodeId[];
  currentNodeId?: NodeId | null;
  destinationNodeId?: NodeId | null;
  /** GPS による大まかな現在地（マップ平面座標と誤差半径）。表示しないなら null */
  gpsHint?: { x: number; y: number; accuracyM: number } | null;
  /** GPS の大まかな現在地をタップしたとき */
  onSelectGpsHint?: () => void;
  /** ◎ ボタン: 位置情報をもう一度取得する。未指定ならボタンを出さない */
  onLocateGps?: () => void;
  gpsBusy?: boolean;
  onSelectPlace: (place: Place) => void;
}

/** 案内中の区間を表示領域の上から何割の高さに置くか */
const FOCUS_ANCHOR_Y = 0.3;
/** GPS 誤差円の表示上の最小・最大半径（m） */
const GPS_RADIUS_MIN_M = 20;
const GPS_RADIUS_MAX_M = 300;
/** 地面の円を等角投影したときの楕円の半径係数 */
const ISO_CIRCLE_RX = Math.SQRT2 * Math.cos(Math.PI / 6);
const ISO_CIRCLE_RY = Math.SQRT2 * 0.5;

const PADDING = 90;

/*
 * ラベル・バッジ・ピンは画面上で一定サイズ（px）で描く。
 * 以下の寸法はすべて画面 px。<Fixed> の中で unitsPerPixel 倍してマップ座標に置く。
 */

/** 同一ノードに複数の店ピンが重ならないよう円周上にずらす（px） */
function shopOffset(index: number, count: number): { dx: number; dy: number } {
  if (count === 1) return { dx: 0, dy: 10 };
  const angle = (index / count) * Math.PI * 2;
  return { dx: Math.cos(angle) * 14, dy: Math.sin(angle) * 8 + 4 };
}

/** 子要素を画面 px 単位で描くグループ（ズームしても見た目の大きさが変わらない） */
function Fixed({ at, k, children }: { at: ScreenPoint; k: number; children: ReactNode }) {
  return <g transform={`translate(${at.px} ${at.py}) scale(${k})`}>{children}</g>;
}

export function InteractiveMap({
  graph,
  shops,
  pois,
  routeNodeIds,
  focusNodeIds,
  currentNodeId,
  destinationNodeId,
  gpsHint = null,
  onSelectGpsHint,
  onLocateGps,
  gpsBusy = false,
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
  const { centerOn } = viewport;

  // 案内のステップが変わったら、その区間の中央へ寄せる（三人称の追従表示）
  const focusKey = focusNodeIds?.join('>') ?? '';
  useEffect(() => {
    if (focusKey === '') return;
    const points = focusKey
      .split('>')
      .map((id) => screenOf.get(id))
      .filter((p): p is ScreenPoint => p !== undefined);
    if (points.length === 0) return;
    const px = points.reduce((sum, p) => sum + p.px, 0) / points.length;
    const py = points.reduce((sum, p) => sum + p.py, 0) / points.length;
    // 経路シートが画面の下半分を覆うので、上寄り（上から3割）に置く
    centerOn({ px, py }, FOCUS_ANCHOR_Y);
  }, [focusKey, screenOf, centerOn]);

  // GPS の大まかな位置が取れたら、そこが見えるように寄せる
  const gpsX = gpsHint?.x;
  const gpsY = gpsHint?.y;
  useEffect(() => {
    if (gpsX === undefined || gpsY === undefined) return;
    centerOn(project(gpsX, gpsY));
  }, [gpsX, gpsY, centerOn]);

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

  const focusPoints = useMemo(() => {
    if (!focusNodeIds || focusNodeIds.length < 2) return null;
    return focusNodeIds
      .map((id) => screenOf.get(id))
      .filter((p): p is ScreenPoint => p !== undefined)
      .map((p) => `${p.px},${p.py}`)
      .join(' ');
  }, [focusNodeIds, screenOf]);

  /** いまのステップ沿いの店。案内中に目印として店名を出す */
  const focusShops = useMemo(() => {
    if (!focusNodeIds) return [];
    const onSegment = new Set(focusNodeIds);
    return shops.filter((shop) => onSegment.has(shop.nodeId));
  }, [focusNodeIds, shops]);

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

  const exits = useMemo(() => nodes.filter((n) => n.kind === 'exit'), [nodes]);
  const pins = useMemo(
    () => nodes.filter((n) => n.kind === 'gate' || n.kind === 'landmark'),
    [nodes],
  );
  const k = viewport.unitsPerPixel;
  const language = i18n.language;
  const nameOf = (text: LocalizedText) => localized(text, language);
  const exitLabel = (node: MapNode) => node.exitNo ?? localized(node.name, language);

  /**
   * 重なるラベルを間引く。優先度: 出口番号 > 建物名 > 改札・広場名 > エリア名。
   * 画面 px での判定なので、ズーム倍率（k）が変わったときだけ計算し直す。
   */
  const visibleLabels = useMemo(() => {
    const boxes = buildMapLabelBoxes({
      k,
      language,
      exits,
      pins,
      screenOf,
      buildings,
      facilities,
      zones,
      areaName: (area) => t(`area.${area}`),
      focusShops: focusShops.map((shop) => ({
        id: shop.id,
        name: shop.name,
        at: screenOf.get(shop.nodeId) as ScreenPoint,
      })),
    });
    return placeLabels(boxes);
  }, [k, exits, pins, screenOf, buildings, facilities, zones, focusShops, language, t]);

  return (
    <div className="interactive-map">
      <svg
        ref={viewport.containerRef}
        viewBox={viewport.viewBox}
        role="group"
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
          .filter((zone) => zone.area !== 'station' && visibleLabels.has(`zone:${zone.area}`))
          .map((zone) => (
            <Fixed key={`label-${zone.area}`} at={zone.center} k={k}>
              <text className="map-zone-label" textAnchor="middle">
                {t(`area.${zone.area}`)}
              </text>
            </Fixed>
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
        {focusPoints !== null && (
          <polyline
            className="map-route-focus"
            points={focusPoints}
            data-testid="map-route-focus"
          />
        )}
        {nodes
          .filter((n) => n.kind === 'junction')
          .map((node) => (
            <Fixed key={node.id} at={at(node.id)} k={k}>
              <ellipse className="map-node" rx={4} ry={2.5} />
            </Fixed>
          ))}
        {facilities
          .filter(({ key }) => visibleLabels.has(`facility:${key}`))
          .map(({ key, label, mid }) => {
            const width = chipWidthPx(label, FACILITY_FONT_PX);
            return (
              <Fixed key={key} at={mid} k={k}>
                <g className="map-facility">
                  <rect x={-width / 2} y={-8} width={width} height={16} rx={8} />
                  <text y={4}>{label}</text>
                </g>
              </Fixed>
            );
          })}
        {[...shopsByNode.entries()].flatMap(([nodeId, group]) => {
          const p = screenOf.get(nodeId);
          if (!p) return [];
          return group.map((shop, index) => {
            const { dx, dy } = shopOffset(index, group.length);
            return (
              <Fixed key={shop.id} at={p} k={k}>
                <ellipse
                  className="map-shop-pin"
                  data-shop-id={shop.id}
                  cx={dx}
                  cy={dy}
                  rx={6}
                  ry={3.5}
                  {...pressable(nameOf(shop.name), () =>
                    pick({ nodeId, name: shop.name, aboveGround: false }),
                  )}
                >
                  <title>{nameOf(shop.name)}</title>
                </ellipse>
              </Fixed>
            );
          });
        })}
        {focusShops.map((shop) => {
          // 同じノードの店名は縦に並べる（mapLabels の判定と同じ並び）
          const row = focusShops
            .slice(0, focusShops.indexOf(shop))
            .filter((other) => other.nodeId === shop.nodeId).length;
          if (!visibleLabels.has(`shop:${shop.id}`)) return null;
          return (
            <Fixed key={`label-${shop.id}`} at={screenOf.get(shop.nodeId) as ScreenPoint} k={k}>
              <text
                className="map-shop-label"
                data-testid="map-shop-label"
                x={SHOP_LABEL_OFFSET_PX.x}
                y={SHOP_LABEL_OFFSET_PX.y + row * (SHOP_LABEL_FONT_PX + 4)}
                pointerEvents="none"
              >
                {nameOf(shop.name)}
              </text>
            </Fixed>
          );
        })}
        {pins.map((node) => (
          <Fixed key={node.id} at={at(node.id)} k={k}>
            <g
              className="map-pin"
              data-node-id={node.id}
              {...pressable(nameOf(node.name), () =>
                pick({ nodeId: node.id, name: node.name, aboveGround: false }),
              )}
            >
              <ellipse rx={7} ry={4} />
              {visibleLabels.has(`pin:${node.id}`) && (
                <text className="map-label" x={10} y={-6} pointerEvents="none">
                  {nameOf(node.name)}
                </text>
              )}
            </g>
          </Fixed>
        ))}
        {exits.map((node) => {
          const label = exitLabel(node);
          const width = chipWidthPx(label, EXIT_FONT_PX);
          const showBadge = visibleLabels.has(`exit:${node.id}`);
          return (
            <Fixed key={node.id} at={at(node.id)} k={k}>
              <g
                className={showBadge ? 'map-exit-badge' : 'map-exit-badge compact'}
                data-node-id={node.id}
                {...pressable(
                  node.exitNo !== undefined
                    ? `${node.exitNo} ${nameOf(node.name)}`
                    : nameOf(node.name),
                  () => pick({ nodeId: node.id, name: node.name, aboveGround: false }),
                )}
              >
                {showBadge ? (
                  <>
                    <rect
                      x={-width / 2}
                      y={-EXIT_BADGE_HEIGHT_PX / 2}
                      width={width}
                      height={EXIT_BADGE_HEIGHT_PX}
                      rx={6}
                    />
                    <text y={4} textAnchor="middle">
                      {label}
                    </text>
                  </>
                ) : (
                  <circle r={5} />
                )}
                <title>{nameOf(node.name)}</title>
              </g>
            </Fixed>
          );
        })}

        <MapGroundLayer
          buildings={buildings}
          unitsPerPixel={k}
          visibleLabelIds={visibleLabels}
          onPick={pick}
        />
        {gpsHint !== null && (
          <GpsHint hint={gpsHint} k={k} label={t('map.gpsHint')} onSelect={onSelectGpsHint} />
        )}
        <MapMarkers
          unitsPerPixel={k}
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
        {onLocateGps !== undefined && (
          <button
            type="button"
            aria-label={t('map.locateGps')}
            aria-busy={gpsBusy}
            disabled={gpsBusy}
            onClick={onLocateGps}
          >
            ◎
          </button>
        )}
        <button type="button" aria-label={t('map.resetView')} onClick={viewport.reset}>
          ⌂
        </button>
      </div>
    </div>
  );
}

/** GPS による大まかな現在地: 誤差円（地面の円を投影した楕円）と中心点 */
function GpsHint({
  hint,
  k,
  label,
  onSelect,
}: {
  hint: { x: number; y: number; accuracyM: number };
  k: number;
  label: string;
  onSelect?: () => void;
}) {
  const center = project(hint.x, hint.y);
  const r = Math.min(GPS_RADIUS_MAX_M, Math.max(GPS_RADIUS_MIN_M, hint.accuracyM));
  const press = onSelect !== undefined ? pressable(label, onSelect) : {};
  return (
    <g className="gps-hint" data-testid="gps-hint" {...press}>
      <ellipse
        className="gps-hint-area"
        cx={center.px}
        cy={center.py}
        rx={r * ISO_CIRCLE_RX}
        ry={r * ISO_CIRCLE_RY}
      />
      <Fixed at={center} k={k}>
        <circle className="gps-hint-dot" r={6} />
        <text className="map-label gps-hint-label" x={10} y={4} pointerEvents="none">
          {label}
        </text>
      </Fixed>
    </g>
  );
}
