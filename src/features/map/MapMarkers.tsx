import { useTranslation } from 'react-i18next';
import type { ScreenPoint } from './iso';

interface Props {
  current?: ScreenPoint;
  destination?: ScreenPoint;
}

function StandingMarker({
  point,
  kind,
  label,
  testId,
}: {
  point: ScreenPoint;
  kind: 'current' | 'destination';
  label: string;
  testId: string;
}) {
  return (
    <g data-testid={testId}>
      <line
        className={`marker-stem ${kind}`}
        x1={point.px}
        y1={point.py}
        x2={point.px}
        y2={point.py - 34}
      />
      <circle className={`map-marker ${kind}`} cx={point.px} cy={point.py - 42} r={13} />
      <text className={`map-marker-label ${kind}`} x={point.px + 18} y={point.py - 38}>
        {label}
      </text>
    </g>
  );
}

/** 現在地・目的地の立ちピン */
export function MapMarkers({ current, destination }: Props) {
  const { t } = useTranslation();
  return (
    <>
      {destination !== undefined && (
        <StandingMarker
          point={destination}
          kind="destination"
          label={t('map.destination')}
          testId="map-destination"
        />
      )}
      {current !== undefined && (
        <StandingMarker point={current} kind="current" label={t('map.you')} testId="map-current" />
      )}
    </>
  );
}
