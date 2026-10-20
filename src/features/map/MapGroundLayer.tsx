import { useTranslation } from 'react-i18next';
import { localized } from '../../i18n';
import {
  BUILDING_ICON_HALF_WIDTH_PX,
  BUILDING_ICON_HEIGHT_PX,
  BUILDING_ICON_LIFT_PX,
  type Building,
} from './ground';
import { buildingFaces } from './iso';
import type { Place } from './InteractiveMap';
import { buildingLabelYPx } from './mapLabels';
import { pressable } from './pressable';

interface Props {
  buildings: Building[];
  /** 画面 1px あたりのマップ単位（アイコン・ラベルを一定サイズで描く） */
  unitsPerPixel: number;
  /** 重なり判定で表示が決まったラベルの id（`building:<poiId>`） */
  visibleLabelIds: Set<string>;
  /** 最寄り出口までの点線を出す建物（選択中・目的地） */
  linkedPoiIds: Set<string>;
  onPick: (place: Place) => void;
}

/** 地上レイヤー: 建物アイコンと、選んだ建物から最寄り出口への点線 */
export function MapGroundLayer({
  buildings,
  unitsPerPixel: k,
  visibleLabelIds,
  linkedPoiIds,
  onPick,
}: Props) {
  const { i18n } = useTranslation();
  const faces = buildingFaces(
    { px: 0, py: -BUILDING_ICON_LIFT_PX },
    BUILDING_ICON_HALF_WIDTH_PX,
    BUILDING_ICON_HEIGHT_PX,
  );
  return (
    <>
      {buildings
        .filter(({ poi }) => linkedPoiIds.has(poi.id))
        .map(({ poi, base, anchor }) => (
          <line
            key={`link-${poi.id}`}
            className="stair-link"
            data-testid="stair-link"
            pointerEvents="none"
            x1={anchor.px}
            y1={anchor.py}
            x2={base.px}
            y2={base.py}
          />
        ))}
      {buildings.map(({ poi, base }) => {
        const name = localized(poi.name, i18n.language);
        const selected = linkedPoiIds.has(poi.id);
        return (
          <g
            key={poi.id}
            className={selected ? 'building selected' : 'building'}
            data-poi-id={poi.id}
            transform={`translate(${base.px} ${base.py}) scale(${k})`}
            {...pressable(name, () =>
              onPick({ nodeId: poi.nodeId, name: poi.name, aboveGround: true }),
            )}
          >
            {/* タップしやすいよう、見た目より広い透明な当たり判定 */}
            <rect className="hit-area" x={-18} y={-34} width={36} height={40} />
            <ellipse className="building-shadow" rx={9} ry={4.5} />
            <polygon className="building-left" points={faces.left} />
            <polygon className="building-right" points={faces.right} />
            <polygon className="building-top" points={faces.top} />
            {(selected || visibleLabelIds.has(`building:${poi.id}`)) && (
              <text
                className="map-label building-label"
                pointerEvents="none"
                y={buildingLabelYPx}
                textAnchor="middle"
              >
                {name}
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}
