import { useTranslation } from 'react-i18next';
import { localized } from '../../i18n';
import { BUILDING_HALF_WIDTH, BUILDING_HEIGHT, type Building } from './ground';
import { buildingFaces } from './iso';
import type { Place } from './InteractiveMap';

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
