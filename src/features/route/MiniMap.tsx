import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Graph } from '../../domain/graph';
import type { NodeId } from '../../domain/types';
import { headingUpProjector, type PlanePoint } from './miniMapGeometry';

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
const RADIUS_M = 90;
/** これより遠い通路は描かない（m） */
const DRAW_RADIUS_M = 170;

/**
 * 案内中の小さな地図（一人称の表示の左上）。進む向きが上になるよう回し、まわりの通路・経路・
 * いまの区間・現在地（中心の矢印）を描く。全体の地図より軽く、区間ごとに描き直す
 */
export function MiniMap({ graph, routeNodeIds, stepNodeIds, destinationNodeId, onOpenMap }: Props) {
  const { t } = useTranslation();
  const drawing = useMemo(() => {
    const at = (id: NodeId): PlanePoint | undefined => graph.nodes.get(id);
    const start = at(stepNodeIds[0] ?? '');
    const end = at(stepNodeIds.at(-1) ?? '');
    if (!start) return null;
    const heading =
      end && (end.x !== start.x || end.y !== start.y)
        ? { x: end.x - start.x, y: end.y - start.y }
        : { x: 0, y: 1 };
    const project = headingUpProjector(start, heading, SIZE / 2 / RADIUS_M, SIZE);
    const near = (p: PlanePoint) => Math.hypot(p.x - start.x, p.y - start.y) <= DRAW_RADIUS_M;
    const corridors: string[] = [];
    for (const [fromId, edges] of graph.adjacency) {
      const a = at(fromId);
      if (!a) continue;
      for (const edge of edges) {
        const b = at(edge.to);
        if (!b || fromId >= edge.to || (!near(a) && !near(b))) continue;
        const pa = project(a);
        const pb = project(b);
        corridors.push(`M${pa.px} ${pa.py}L${pb.px} ${pb.py}`);
      }
    }
    const line = (ids: NodeId[]) =>
      ids
        .map(at)
        .filter((p): p is PlanePoint => p !== undefined)
        .map((p) => {
          const { px, py } = project(p);
          return `${px},${py}`;
        })
        .join(' ');
    const destination = at(destinationNodeId);
    return {
      corridors: corridors.join(''),
      route: line(routeNodeIds),
      step: line(stepNodeIds),
      destination: destination && near(destination) ? project(destination) : null,
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
        <path className="mini-map-corridor" d={drawing.corridors} />
        <polyline className="mini-map-route" points={drawing.route} />
        <polyline className="mini-map-step" points={drawing.step} />
        {drawing.destination && (
          <circle
            className="mini-map-destination"
            cx={drawing.destination.px}
            cy={drawing.destination.py}
            r={5}
          />
        )}
        {/* 現在地（区間の起点）。上が進む向き */}
        <path
          className="mini-map-you"
          d={`M${c} ${c - 9}L${c + 7} ${c + 7}L${c} ${c + 3}L${c - 7} ${c + 7}Z`}
        />
      </svg>
    </button>
  );
}
