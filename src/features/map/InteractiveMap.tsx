import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Graph } from '../../domain/graph';
import type { FloorId, LocalizedText, MapNode, NodeId, Poi, Shop } from '../../domain/types';
import { localized } from '../../i18n';
import { detailLevel } from './detail';
import { buildFloorView, floorForNodes, splitRouteByFloor } from './floorView';
import { FloorSwitcher } from './FloorSwitcher';
import { buildBuildings } from './ground';
import { MapBasemap } from './MapBasemap';
import { project, type ScreenPoint } from './projection';
import { placeLabelLayout } from './labelLayout';
import { MapGroundLayer } from './MapGroundLayer';
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
import { routeArrows } from './routeArrows';
import { useMapViewport, type Bounds, type Rect, type ViewInsets } from './useMapViewport';
import { buildMapZones } from './zones';
import { basemap } from '../../data/generated/basemap';

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
  /** 案内中のいまのステップが通るノード。強調表示し、地図をそこへ合わせ、沿道の店名を出す */
  focusNodeIds?: NodeId[];
  currentNodeId?: NodeId | null;
  destinationNodeId?: NodeId | null;
  /** 選んでいる場所（場所シートを開いている）。地図をそこへ寄せて目印を出す */
  selectedNodeId?: NodeId | null;
  /** 最寄り出口までの点線を出す地上スポット（選択中・目的地） */
  linkedPoiIds?: string[];
  /** 画面下のシートが地図を隠している割合（0〜1）。地図を寄せるときに避ける */
  bottomInset?: number;
  /** GPS による大まかな現在地（マップ平面座標と誤差半径）。表示しないなら null */
  gpsHint?: { x: number; y: number; accuracyM: number } | null;
  /** GPS の大まかな現在地をタップしたとき */
  onSelectGpsHint?: () => void;
  /** ◎ ボタン: 位置情報をもう一度取得する。未指定ならボタンを出さない */
  onLocateGps?: () => void;
  gpsBusy?: boolean;
  onSelectPlace: (place: Place) => void;
}

/** 画面上部の検索バーが隠す割合 */
const TOP_INSET = 0.16;
/** 場所を選んだとき、これより引いた表示（k が大きい）なら寄せて拡大する */
const SELECT_ZOOM_K = 1.0;
/** 場所を選んで拡大するときに見せる範囲（マップ単位） */
const SELECT_VIEW_RADIUS = 110;
/** 中くらいの拡大で、選んだ場所・現在地・目的地のまわりの出口番号を出す範囲（m） */
const IMPORTANT_EXIT_RADIUS_M = 60;
/** 経路の進行方向の矢印の間隔（画面 px） */
const ARROW_SPACING_PX = 70;
/** GPS 誤差円の表示上の最小・最大半径（m） */
const GPS_RADIUS_MIN_M = 20;
const GPS_RADIUS_MAX_M = 300;

const PADDING = 90;

/*
 * ラベル・バッジ・ピン・建物アイコンは画面上で一定サイズ（px）で描く。
 * <Fixed> の中の寸法はすべて画面 px で、unitsPerPixel 倍してマップ座標に置く。
 */

/** 同一ノードに複数の店ピンが重ならないよう円周上にずらす（px） */
function shopOffset(index: number, count: number): { dx: number; dy: number } {
  if (count === 1) return { dx: 0, dy: 10 };
  const angle = (index / count) * Math.PI * 2;
  return { dx: Math.cos(angle) * 12, dy: Math.sin(angle) * 12 };
}

/** 子要素を画面 px 単位で描くグループ（ズームしても見た目の大きさが変わらない） */
function Fixed({ at, k, children }: { at: ScreenPoint; k: number; children: ReactNode }) {
  return <g transform={`translate(${at.px} ${at.py}) scale(${k})`}>{children}</g>;
}

function rectOf(points: ScreenPoint[]): Rect | null {
  if (points.length === 0) return null;
  return {
    minX: Math.min(...points.map((p) => p.px)),
    maxX: Math.max(...points.map((p) => p.px)),
    minY: Math.min(...points.map((p) => p.py)),
    maxY: Math.max(...points.map((p) => p.py)),
  };
}

function InteractiveMapView({
  graph,
  shops,
  pois,
  routeNodeIds,
  focusNodeIds,
  currentNodeId,
  destinationNodeId,
  selectedNodeId = null,
  linkedPoiIds,
  bottomInset = 0.1,
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
  const pointsOf = (ids: NodeId[]) =>
    ids.map((id) => screenOf.get(id)).filter((p): p is ScreenPoint => p !== undefined);

  const buildings = useMemo(() => buildBuildings(graph, pois), [graph, pois]);

  // 表示する階。案内中はいまのステップの階、場所を選んだらその場所の階に合わせる。
  // ボタンで選んだ階は、ステップや選んだ場所が変わるまで優先する
  const floorView = useMemo(() => buildFloorView(graph), [graph]);
  const floorContext = focusNodeIds?.join('>') || (selectedNodeId ?? '');
  const [chosenFloor, setChosenFloor] = useState<{ floor: FloorId; context: string }>({
    floor: 'B1',
    context: '',
  });
  const floor = useMemo<FloorId>(() => {
    if (chosenFloor.context === floorContext) return chosenFloor.floor;
    if (focusNodeIds && focusNodeIds.length > 0)
      return floorForNodes(floorView, focusNodeIds) ?? chosenFloor.floor;
    if (selectedNodeId !== null && !floorView.isNodeOnFloor(selectedNodeId, chosenFloor.floor))
      return floorView.floorOf(selectedNodeId);
    return chosenFloor.floor;
  }, [chosenFloor, floorContext, focusNodeIds, selectedNodeId, floorView]);
  const chooseFloor = (next: FloorId) => setChosenFloor({ floor: next, context: floorContext });
  const isNodeOnFloor = (id: NodeId) => floorView.isNodeOnFloor(id, floor);

  const zones = useMemo(() => buildMapZones(nodes, basemap), [nodes]);

  const bounds = useMemo<Bounds>(() => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const { px, py } of screenOf.values()) {
      xs.push(px);
      ys.push(py);
    }
    for (const b of buildings) {
      xs.push(b.base.px);
      ys.push(b.base.py);
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
  const { centerOn, fitRect } = viewport;
  const k = viewport.unitsPerPixel;
  const level = detailLevel(k);
  const insets: ViewInsets = { top: TOP_INSET, bottom: bottomInset };

  // 地図を寄せる処理は、最新の表示範囲・余白を参照するため ref 経由で呼ぶ
  const latest = useRef({ k, insets, fitRect, centerOn });
  latest.current = { k, insets, fitRect, centerOn };

  // 経路が新しく出たら経路全体、ステップを送ったらその区間が収まるように合わせる
  const routeKey = routeNodeIds?.join('>') ?? '';
  const focusKey = focusNodeIds?.join('>') ?? '';
  const shownRouteKey = useRef('');
  useEffect(() => {
    const { fitRect: fit, insets: inset } = latest.current;
    const pointsOfKey = (key: string) =>
      key
        .split('>')
        .map((id) => screenOf.get(id))
        .filter((p): p is ScreenPoint => p !== undefined);
    if (routeKey !== '' && routeKey !== shownRouteKey.current) {
      shownRouteKey.current = routeKey;
      const rect = rectOf(pointsOfKey(routeKey));
      if (rect) fit(rect, inset);
      return;
    }
    if (routeKey === '') shownRouteKey.current = '';
    if (focusKey === '') return;
    const rect = rectOf(pointsOfKey(focusKey));
    if (rect) fit(rect, inset);
  }, [routeKey, focusKey, screenOf]);

  // 場所を選んだら、そこが見えるように寄せる（引きすぎていれば拡大も）
  useEffect(() => {
    if (selectedNodeId === null) return;
    const p = screenOf.get(selectedNodeId);
    if (!p) return;
    const { k: currentK, insets: inset, fitRect: fit, centerOn: center } = latest.current;
    if (currentK > SELECT_ZOOM_K) {
      fit(
        {
          minX: p.px - SELECT_VIEW_RADIUS,
          maxX: p.px + SELECT_VIEW_RADIUS,
          minY: p.py - SELECT_VIEW_RADIUS,
          maxY: p.py + SELECT_VIEW_RADIUS,
        },
        inset,
      );
    } else {
      const band = 1 - inset.top - inset.bottom;
      center(p, inset.top + band / 2);
    }
  }, [selectedNodeId, screenOf]);

  // GPS の大まかな位置が取れたら、そこが見えるように寄せる
  const gpsX = gpsHint?.x;
  const gpsY = gpsHint?.y;
  useEffect(() => {
    if (gpsX === undefined || gpsY === undefined) return;
    centerOn(project(gpsX, gpsY));
  }, [gpsX, gpsY, centerOn]);

  const fitWholeRoute = () => {
    const rect = rectOf(pointsOf(routeNodeIds ?? []));
    if (rect) fitRect(rect, insets);
  };

  /** 通路スラブ。奥→手前の順に描く */
  const slabs = useMemo(() => {
    const result: { key: string; from: NodeId; to: NodeId; a: ScreenPoint; b: ScreenPoint }[] = [];
    for (const [fromId, edges] of graph.adjacency) {
      for (const edge of edges) {
        if (fromId >= edge.to) continue;
        const a = screenOf.get(fromId);
        const b = screenOf.get(edge.to);
        if (!a || !b) continue;
        result.push({ key: `${fromId}--${edge.to}`, from: fromId, to: edge.to, a, b });
      }
    }
    return result.sort((s, u) => Math.max(s.a.py, s.b.py) - Math.max(u.a.py, u.b.py));
  }, [graph, screenOf]);

  /** エスカレーター・エレベーター・階段のあるエッジの中点チップ */
  /** 経路が通る線（"a|b" の両向き） */
  const routeEdgeKeys = useMemo(() => {
    const keys = new Set<string>();
    const ids = routeNodeIds ?? [];
    for (let i = 0; i < ids.length - 1; i += 1) {
      keys.add(`${ids[i]}|${ids[i + 1]}`);
      keys.add(`${ids[i + 1]}|${ids[i]}`);
    }
    return keys;
  }, [routeNodeIds]);

  const facilities = useMemo(() => {
    const result: { key: string; label: string; mid: ScreenPoint; onRoute: boolean }[] = [];
    for (const [fromId, edges] of graph.adjacency) {
      for (const edge of edges) {
        if (fromId >= edge.to || !floorView.isEdgeOnFloor(fromId, edge.to, floor)) continue;
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
          onRoute: routeEdgeKeys.has(`${fromId}|${edge.to}`),
        });
      }
    }
    return result;
  }, [graph, screenOf, t, floorView, floor, routeEdgeKeys]);

  /** 経路をいまの階に出る区間と出ない区間に分ける（ほかの階の区間は点線で薄く描く） */
  const routeRuns = useMemo(() => {
    if (!routeNodeIds || routeNodeIds.length < 2) return null;
    return splitRouteByFloor(floorView, routeNodeIds, floor).map((run) => {
      const points = run.ids
        .map((id) => screenOf.get(id))
        .filter((p): p is ScreenPoint => p !== undefined);
      return { onFloor: run.onFloor, points, attr: points.map((p) => `${p.px},${p.py}`).join(' ') };
    });
  }, [routeNodeIds, screenOf, floorView, floor]);
  const routePoints = routeRuns === null ? null : routeRuns.map((run) => run.attr).join(' ');
  const arrows = useMemo(
    () =>
      (routeRuns ?? [])
        .filter((run) => run.onFloor)
        .flatMap((run) => routeArrows(run.points, ARROW_SPACING_PX * k)),
    [routeRuns, k],
  );

  const focusPoints = useMemo(() => {
    if (!focusNodeIds || focusNodeIds.length < 2) return null;
    return focusNodeIds
      .map((id) => screenOf.get(id))
      .filter((p): p is ScreenPoint => p !== undefined)
      .map((p) => `${p.px},${p.py}`)
      .join(' ');
  }, [focusNodeIds, screenOf]);

  /** いまの階の店（店の前の点がその階にある店） */
  const floorShops = useMemo(
    () => shops.filter((shop) => floorView.floorOf(shop.nodeId) === floor),
    [shops, floorView, floor],
  );

  /** 店名を出す店。案内中はいまの区間沿い、詳細表示ではいまの階のすべて */
  const labelShops = useMemo(() => {
    const onSegment = new Set(focusNodeIds ?? []);
    const focus = floorShops.filter((shop) => onSegment.has(shop.nodeId));
    const focusIds = new Set(focus.map((shop) => shop.id));
    const others =
      level === 'detail' ? floorShops.filter((shop) => !focusIds.has(shop.id)) : ([] as Shop[]);
    return { focus, others };
  }, [focusNodeIds, floorShops, level]);
  const orderedLabelShops = useMemo(
    () => [...labelShops.focus, ...labelShops.others],
    [labelShops],
  );

  const shopsByNode = useMemo(() => {
    const groups = new Map<NodeId, Shop[]>();
    for (const shop of floorShops) {
      const list = groups.get(shop.nodeId);
      if (list) list.push(shop);
      else groups.set(shop.nodeId, [shop]);
    }
    return groups;
  }, [floorShops]);

  const pick = (place: Place) => {
    if (viewport.isDragging()) return;
    onSelectPlace(place);
  };

  const exits = useMemo(
    () => nodes.filter((n) => n.kind === 'exit' && floorView.isNodeOnFloor(n.id, floor)),
    [nodes, floorView, floor],
  );
  const pins = useMemo(
    () =>
      nodes.filter(
        (n) => (n.kind === 'gate' || n.kind === 'landmark') && floorView.isNodeOnFloor(n.id, floor),
      ),
    [nodes, floorView, floor],
  );
  const routeSet = useMemo(() => new Set(routeNodeIds ?? []), [routeNodeIds]);
  /** 中くらいの拡大で番号を出す出口: 経路の上と、選んだ場所・現在地・目的地の近く */
  const importantExitIds = useMemo(() => {
    const anchors = [selectedNodeId, currentNodeId, destinationNodeId]
      .map((id) => (id ? graph.nodes.get(id) : undefined))
      .filter((n): n is MapNode => n !== undefined);
    const ids = new Set<NodeId>();
    for (const exit of exits) {
      const near = anchors.some(
        (a) => Math.hypot(a.x - exit.x, a.y - exit.y) <= IMPORTANT_EXIT_RADIUS_M,
      );
      if (routeSet.has(exit.id) || near) ids.add(exit.id);
    }
    return ids;
  }, [exits, routeSet, selectedNodeId, currentNodeId, destinationNodeId, graph]);
  const language = i18n.language;
  const nameOf = (text: LocalizedText) => localized(text, language);
  const exitLabel = (node: MapNode) => node.exitNo ?? localized(node.name, language);
  const linked = useMemo(() => new Set(linkedPoiIds ?? []), [linkedPoiIds]);

  /**
   * 重なるラベルを間引く。優先度: 出口番号 > 案内中の店名 > 建物名 > 広場・改札名 >
   * 設備 > 店名（詳細表示）> エリア名。全体表示では出口番号は出さない（点だけ）。
   * 画面 px での判定なので、ズーム倍率（k）が変わったときだけ計算し直す。
   */
  const visibleLabels = useMemo(() => {
    const toLabel = (shop: Shop) => ({
      id: shop.id,
      name: shop.name,
      at: screenOf.get(shop.nodeId) as ScreenPoint,
    });
    const boxes = buildMapLabelBoxes({
      k,
      language,
      exits:
        level === 'overview'
          ? []
          : level === 'detail'
            ? exits
            : exits.filter((n) => importantExitIds.has(n.id)),
      pins,
      screenOf,
      buildings,
      facilities:
        level === 'detail'
          ? facilities
          : level === 'normal'
            ? facilities.filter((f) => f.onRoute)
            : [],
      zones,
      areaName: (area) => t(`area.${area}`),
      focusShops: labelShops.focus.map(toLabel),
      otherShops: labelShops.others.map(toLabel),
    });
    return placeLabelLayout(boxes);
  }, [
    k,
    level,
    exits,
    importantExitIds,
    pins,
    screenOf,
    buildings,
    facilities,
    zones,
    labelShops,
    language,
    t,
  ]);

  const hasRoute = routePoints !== null;
  const selectedPoint = selectedNodeId !== null ? screenOf.get(selectedNodeId) : undefined;

  return (
    <div className="interactive-map">
      <svg
        ref={viewport.containerRef}
        viewBox={viewport.viewBox}
        role="group"
        aria-label={t('map.title')}
        data-testid="map-view"
        data-detail={level}
        data-floor={floor}
        className={hasRoute ? 'has-route' : undefined}
        {...viewport.handlers}
      >
        {/* 下地: 地上の建物の輪郭と道路 */}
        <MapBasemap basemap={basemap} />
        {/* 地下街の床（地下街ごとの色） */}
        {zones.map((zone) => (
          <polygon
            key={zone.area}
            className={`map-zone zone-${zone.area}${floor === 'B1' ? '' : ' off-floor'}`}
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

        {/* 地下の通路（実際の幅に近い太さの線） */}
        <g className="map-network">
          {slabs.map(({ key, from, to, a, b }) => (
            <line
              key={`top-${key}`}
              className={
                floorView.isEdgeOnFloor(from, to, floor) ? 'map-edge' : 'map-edge off-floor'
              }
              x1={a.px}
              y1={a.py}
              x2={b.px}
              y2={b.py}
            />
          ))}
        </g>
        {routeRuns?.map((run, index) => (
          <g key={`route-${index}`} className={run.onFloor ? undefined : 'off-floor'}>
            <polyline
              className="map-route-casing"
              points={run.attr}
              vectorEffect="non-scaling-stroke"
            />
            <polyline
              className="map-route"
              points={run.attr}
              data-testid="map-route"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
        {focusPoints !== null && (
          <polyline
            className="map-route-focus"
            points={focusPoints}
            data-testid="map-route-focus"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {arrows.map(({ at: p, angleDeg }, index) => (
          <g
            key={`arrow-${index}`}
            className="map-route-arrow"
            data-testid="map-route-arrow"
            transform={`translate(${p.px} ${p.py}) rotate(${angleDeg}) scale(${k})`}
          >
            <path d="M -4 -5 L 3 0 L -4 5" />
          </g>
        ))}
        {level === 'detail' &&
          nodes
            .filter((n) => n.kind === 'junction' && isNodeOnFloor(n.id))
            .map((node) => (
              <Fixed key={node.id} at={at(node.id)} k={k}>
                <circle className="map-node" r={3} />
              </Fixed>
            ))}
        {level !== 'overview' &&
          facilities
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
        {level === 'detail' &&
          [...shopsByNode.entries()].flatMap(([nodeId, group]) => {
            const p = screenOf.get(nodeId);
            if (!p) return [];
            return group.map((shop, index) => {
              const { dx, dy } = shopOffset(index, group.length);
              return (
                <Fixed key={shop.id} at={p} k={k}>
                  <circle
                    className="map-shop-pin"
                    data-shop-id={shop.id}
                    cx={dx}
                    cy={dy}
                    r={4.5}
                    {...pressable(nameOf(shop.name), () =>
                      pick({ nodeId, name: shop.name, aboveGround: false }),
                    )}
                  >
                    <title>{nameOf(shop.name)}</title>
                  </circle>
                </Fixed>
              );
            });
          })}
        {orderedLabelShops.map((shop, index) => {
          // 同じノードの店名は縦に並べる（mapLabels の判定と同じ並び）
          const row = orderedLabelShops
            .slice(0, index)
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
              <circle r={6} />
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
          const onRoute = routeSet.has(node.id);
          const classes = ['map-exit-badge'];
          if (!showBadge) classes.push('compact');
          if (onRoute) classes.push('on-route');
          return (
            <Fixed key={node.id} at={at(node.id)} k={k}>
              <g
                className={classes.join(' ')}
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
                  <>
                    {/* 小さな点でも押せるよう、透明な当たり判定を広めに取る */}
                    <circle className="hit-area" r={11} />
                    <circle r={level === 'overview' ? 3.5 : 5} />
                  </>
                )}
                <title>{nameOf(node.name)}</title>
              </g>
            </Fixed>
          );
        })}

        <MapGroundLayer
          buildings={buildings}
          unitsPerPixel={k}
          labelLayout={visibleLabels}
          linkedPoiIds={linked}
          onPick={pick}
        />
        {selectedPoint !== undefined && (
          <Fixed at={selectedPoint} k={k}>
            <g className="selection-ring" data-testid="map-selection" pointerEvents="none">
              <circle r={16} />
            </g>
          </Fixed>
        )}
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
        {hasRoute && (
          <span>
            <i className="swatch route" />
            {t('map.legendRoute')}
          </span>
        )}
      </div>
      <FloorSwitcher floors={floorView.floors} current={floor} onChange={chooseFloor} />
      <div className="map-zoom-controls">
        <button type="button" aria-label={t('map.zoomIn')} onClick={viewport.zoomIn}>
          ＋
        </button>
        <button type="button" aria-label={t('map.zoomOut')} onClick={viewport.zoomOut}>
          −
        </button>
        {hasRoute && (
          <button type="button" aria-label={t('map.fitRoute')} onClick={fitWholeRoute}>
            ⤢
          </button>
        )}
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

/**
 * 全画面マップ。要素が多い（数百のピン・ラベル）ため、props が変わらない限り
 * 描き直さない（シートの開閉などで App が再描画されても地図はそのまま）。
 */
export const InteractiveMap = memo(InteractiveMapView);

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
      <circle className="gps-hint-area" cx={center.px} cy={center.py} r={r} />
      <Fixed at={center} k={k}>
        <circle className="gps-hint-dot" r={6} />
        <text className="map-label gps-hint-label" x={10} y={4} pointerEvents="none">
          {label}
        </text>
      </Fixed>
    </g>
  );
}
