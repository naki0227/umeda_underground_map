import { useTranslation } from 'react-i18next';
import { localized } from '../../i18n';
import { BUILDING_ICON_SIZE_PX, BUILDING_ICON_TOP_PX, type Building } from './ground';
import type { Place } from './InteractiveMap';
import { poiIcon } from './mapIcons';
import { BUILDING_LABEL_BELOW_DY_PX, buildingLabelYPx } from './mapLabels';
import { pressable } from './pressable';

interface Props {
  buildings: Building[];
  /** 画面 1px あたりのマップ単位（アイコン・ラベルを一定サイズで描く） */
  unitsPerPixel: number;
  /** 重なり判定で表示が決まったラベルの id（`building:<poiId>`）→ 位置（0 = 目印の上、1 = 下） */
  labelLayout: ReadonlyMap<string, number>;
  /** 最寄り出口までの点線を出す建物（選択中・目的地） */
  linkedPoiIds: Set<string>;
  onPick: (place: Place) => void;
}

/** 地上レイヤー: 地上スポットのアイコン（名前は拡大時・選択時）と、選んだスポットから最寄り出口への点線 */
export function MapGroundLayer({
  buildings,
  unitsPerPixel: k,
  labelLayout,
  linkedPoiIds,
  onPick,
}: Props) {
  const { i18n } = useTranslation();
  const size = BUILDING_ICON_SIZE_PX;
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
            <rect
              className="hit-area"
              x={-18}
              y={BUILDING_ICON_TOP_PX - 6}
              width={36}
              height={size + 14}
            />
            <circle className="building-shadow" r={3} />
            <circle className="building-top" cy={BUILDING_ICON_TOP_PX + size / 2} r={size / 2} />
            <text
              className="building-icon"
              y={BUILDING_ICON_TOP_PX + size / 2}
              textAnchor="middle"
              dominantBaseline="central"
              pointerEvents="none"
              aria-hidden
            >
              {poiIcon(poi)}
            </text>
            {(selected || labelLayout.has(`building:${poi.id}`)) && (
              <text
                className="map-label building-label"
                pointerEvents="none"
                y={
                  buildingLabelYPx +
                  (labelLayout.get(`building:${poi.id}`) === 1 ? BUILDING_LABEL_BELOW_DY_PX : 0)
                }
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
