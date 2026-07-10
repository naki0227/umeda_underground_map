import { useTranslation } from 'react-i18next';
import type { Graph } from '../../domain/graph';
import type { NodeId, Poi } from '../../domain/types';
import { localized } from '../../i18n';
import { buildingFaces, GROUND_ELEVATION, project, type ScreenPoint } from './iso';
import type { Place } from './InteractiveMap';

export const BUILDING_HALF_WIDTH = 34;
export const BUILDING_HEIGHT = 40;

export interface Building {
  poi: Poi;
  base: ScreenPoint;
  anchor: ScreenPoint;
}

/** 地上の建物: POIをノードごとにまとめて横に並べる */
export function buildBuildings(graph: Graph, pois: Poi[]): Building[] {
  const byNode = new Map<NodeId, Poi[]>();
  for (const poi of pois) {
    const list = byNode.get(poi.nodeId);
    if (list) list.push(poi);
    else byNode.set(poi.nodeId, [poi]);
  }
  const result: Building[] = [];
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
}

interface Props {
  buildings: Building[];
  onPick: (place: Place) => void;
}

/** 地上レイヤー: 地下への階段リンクと建物ボックス */
export function MapGroundLayer({ buildings, onPick }: Props) {
  const { i18n } = useTranslation();
  return (
    <>
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
            onClick={() => onPick({ nodeId: poi.nodeId, name: poi.name, aboveGround: true })}
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
    </>
  );
}
