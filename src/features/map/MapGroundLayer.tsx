import { useTranslation } from 'react-i18next';
import { localized } from '../../i18n';
import { BUILDING_HALF_WIDTH, BUILDING_HEIGHT, type Building } from './ground';
import { buildingFaces } from './iso';
import type { Place } from './InteractiveMap';
import { buildingLabelOffsetPx } from './mapLabels';
import { pressable } from './pressable';

interface Props {
  buildings: Building[];
  /** 画面 1px あたりのマップ単位（ラベルを一定サイズで描く） */
  unitsPerPixel: number;
  /** 重なり判定で表示が決まったラベルの id（`building:<poiId>`） */
  visibleLabelIds: Set<string>;
  onPick: (place: Place) => void;
}

/** 地上レイヤー: 地下への階段リンクと建物ボックス */
export function MapGroundLayer({ buildings, unitsPerPixel: k, visibleLabelIds, onPick }: Props) {
  const { i18n } = useTranslation();
  return (
    <>
      {buildings.map(({ poi, base, anchor }) => (
        <line
          key={`link-${poi.id}`}
          className="stair-link"
          pointerEvents="none"
          x1={anchor.px}
          y1={anchor.py}
          x2={base.px}
          y2={base.py + 2}
        />
      ))}
      {buildings.map(({ poi, base, labelRow }) => {
        const faces = buildingFaces(base, BUILDING_HALF_WIDTH, BUILDING_HEIGHT);
        const name = localized(poi.name, i18n.language);
        const roofTop = base.py - BUILDING_HEIGHT - BUILDING_HALF_WIDTH * 0.5;
        return (
          <g
            key={poi.id}
            className="building"
            data-poi-id={poi.id}
            {...pressable(name, () =>
              onPick({ nodeId: poi.nodeId, name: poi.name, aboveGround: true }),
            )}
          >
            <polygon className="building-left" points={faces.left} />
            <polygon className="building-right" points={faces.right} />
            <polygon className="building-top" points={faces.top} />
            {visibleLabelIds.has(`building:${poi.id}`) && (
              <g transform={`translate(${base.px} ${roofTop}) scale(${k})`}>
                <text
                  className="map-label building-label"
                  pointerEvents="none"
                  y={buildingLabelOffsetPx(labelRow)}
                  textAnchor="middle"
                >
                  {name}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </>
  );
}
