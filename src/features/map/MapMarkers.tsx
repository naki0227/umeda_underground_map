import { useTranslation } from 'react-i18next';
import type { ScreenPoint } from './projection';

interface Props {
  /** 画面 1px あたりのマップ単位（マーカーを一定サイズで描く） */
  unitsPerPixel: number;
  current?: ScreenPoint;
  destination?: ScreenPoint;
}

function StandingMarker({
  point,
  kind,
  label,
  testId,
  k,
}: {
  k: number;
  point: ScreenPoint;
  kind: 'current' | 'destination';
  label: string;
  testId: string;
}) {
  return (
    <g
      data-testid={testId}
      pointerEvents="none"
      transform={`translate(${point.px} ${point.py}) scale(${k})`}
    >
      <line className={`marker-stem ${kind}`} x1={0} y1={0} x2={0} y2={-22} />
      <circle className={`map-marker ${kind}`} cx={0} cy={-28} r={8} />
      <text className={`map-marker-label ${kind}`} x={12} y={-24}>
        {label}
      </text>
    </g>
  );
}

/** 現在地・目的地の立ちピン */
export function MapMarkers({ unitsPerPixel, current, destination }: Props) {
  const { t } = useTranslation();
  return (
    <>
      {destination !== undefined && (
        <StandingMarker
          k={unitsPerPixel}
          point={destination}
          kind="destination"
          label={t('map.destination')}
          testId="map-destination"
        />
      )}
      {current !== undefined && (
        <StandingMarker
          k={unitsPerPixel}
          point={current}
          kind="current"
          label={t('map.you')}
          testId="map-current"
        />
      )}
    </>
  );
}
