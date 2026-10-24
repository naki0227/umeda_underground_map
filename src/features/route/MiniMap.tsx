import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { basemap } from '../../data/generated/basemap';
import type { Graph } from '../../domain/graph';
import type { NodeId } from '../../domain/types';
import { MapBasemap } from '../map/MapBasemap';
import { buildMapZones } from '../map/zones';
import { headingUpTransform, type PlanePoint } from './miniMapGeometry';

interface Props {
  graph: Graph;
  routeNodeIds: NodeId[];
  /** いまの区間（起点 → 終点）。起点を中心に、進む向きを上にして描く */
  stepNodeIds: NodeId[];
  destinationNodeId: NodeId;
  /** 押したら全体の地図を開く */
  onOpenMap: () => void;
}

/** 小さな地図の大きさ（px）と、中心から端までに入れる距離（m） */
const SIZE = 132;
const RADIUS_M = 110;

/**
 * 案内中の小さな地図（一人称の画面の左上）。全体の地図と同じ下地（建物・道路・地下街の色）と
 * 通路・経路を、進む向きが上になるよう回して描く。現在地は中心の矢印
 */
export function MiniMap({ graph, routeNodeIds, stepNodeIds, destinationNodeId, onOpenMap }: Props) {
  const { t } = useTranslation();
  // 下地・地下街・通路は経路によらないので一度だけ作る（地図と同じ画面座標 x, -y）
  const base = useMemo(() => {
    const nodes = [...graph.nodes.values()];
    let corridors = '';
    for (const [fromId, edges] of graph.adjacency) {
      const a = graph.nodes.get(fromId);
      if (!a) continue;
      for (const edge of edges) {
        const b = graph.nodes.get(edge.to);
        if (b && fromId < edge.to) corridors += `M${a.x} ${-a.y}L${b.x} ${-b.y}`;
      }
    }
    return { zones: buildMapZones(nodes, basemap), corridors };
  }, [graph]);

  const drawing = useMemo(() => {
    const at = (id: NodeId): PlanePoint | undefined => graph.nodes.get(id);
    const start = at(stepNodeIds[0] ?? '');
    const end = at(stepNodeIds.at(-1) ?? '');
    if (!start) return null;
    const heading =
      end && (end.x !== start.x || end.y !== start.y)
        ? { x: end.x - start.x, y: end.y - start.y }
        : { x: 0, y: 1 };
    const line = (ids: NodeId[]) =>
      ids
        .map(at)
        .filter((p): p is PlanePoint => p !== undefined)
        .map((p) => `${p.x},${-p.y}`)
        .join(' ');
    return {
      transform: headingUpTransform(start, heading, SIZE / 2 / RADIUS_M, SIZE),
      route: line(routeNodeIds),
      step: line(stepNodeIds),
      destination: at(destinationNodeId) ?? null,
    };
  }, [graph, routeNodeIds, stepNodeIds, destinationNodeId]);

  if (drawing === null) return null;
  const c = SIZE / 2;
  return (
    <button
      type="button"
      className="mini-map"
      data-testid="mini-map"
      aria-label={t('fpv.openMap')}
      onClick={onOpenMap}
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} aria-hidden>
        <g transform={drawing.transform}>
          <MapBasemap basemap={basemap} />
          {base.zones.map((zone) => (
            <polygon
              key={zone.area}
              className={`map-zone zone-${zone.area}`}
              points={zone.points}
            />
          ))}
          <path className="mini-map-corridor" d={base.corridors} />
          <polyline className="mini-map-route" points={drawing.route} />
          <polyline className="mini-map-step" points={drawing.step} />
          {drawing.destination && (
            <circle
              className="mini-map-destination"
              cx={drawing.destination.x}
              cy={-drawing.destination.y}
              r={7}
            />
          )}
        </g>
        {/* 現在地（区間の起点）。上が進む向き */}
        <path
          className="mini-map-you"
          d={`M${c} ${c - 9}L${c + 7} ${c + 7}L${c} ${c + 3}L${c - 7} ${c + 7}Z`}
        />
      </svg>
    </button>
  );
}
