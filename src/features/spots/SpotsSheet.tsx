import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { WALK_SPEED_M_PER_MIN } from '../../app/config';
import type { Graph } from '../../domain/graph';
import { findRoute } from '../../domain/route';
import type { NodeId, Poi } from '../../domain/types';
import { localized } from '../../i18n';
import type { Place } from '../map/InteractiveMap';

interface Props {
  graph: Graph;
  pois: Poi[];
  currentNodeId: NodeId | null;
  onPick: (place: Place) => void;
  onClose: () => void;
}

/** おすすめスポット: 地上POIをカードで一覧し、現在地からの徒歩目安を出す */
export function SpotsSheet({ graph, pois, currentNodeId, onPick, onClose }: Props) {
  const { t, i18n } = useTranslation();

  const cards = useMemo(() => {
    return pois.map((poi) => {
      const distanceM =
        currentNodeId === null
          ? null
          : (findRoute(graph, currentNodeId, poi.nodeId)?.totalDistanceM ?? null);
      return { poi, distanceM };
    });
  }, [pois, graph, currentNodeId]);

  return (
    <div className="sheet" role="dialog" aria-label={t('spots.title')}>
      <div className="sheet-header">
        <h2>{t('spots.title')}</h2>
        <button type="button" className="close" aria-label={t('sheet.close')} onClick={onClose}>
          ×
        </button>
      </div>
      <p className="hint">{t('spots.description')}</p>
      <ul className="spot-cards">
        {cards.map(({ poi, distanceM }) => (
          <li key={poi.id}>
            <button
              type="button"
              className="spot-card"
              onClick={() => onPick({ nodeId: poi.nodeId, name: poi.name, aboveGround: true })}
            >
              <span className="spot-name">{localized(poi.name, i18n.language)}</span>
              <span className="spot-meta">
                <span className="spot-tag">{t('spots.aboveGround')}</span>
                {distanceM !== null &&
                  t('spots.walk', {
                    minutes: Math.max(1, Math.round(distanceM / WALK_SPEED_M_PER_MIN)),
                    distance: Math.round(distanceM),
                  })}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
