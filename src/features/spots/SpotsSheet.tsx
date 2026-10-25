import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WALK_SPEED_M_PER_MIN } from '../../app/config';
import type { Graph } from '../../domain/graph';
import { distancesFrom } from '../../domain/distances';
import type { NodeId, Poi } from '../../domain/types';
import { localized } from '../../i18n';
import type { Place } from '../map/InteractiveMap';
import type { Amenity } from '../../data/amenities';
import type { AmenityKind } from '../../data/types';
import { BottomSheet } from '../../components/BottomSheet';

interface Props {
  graph: Graph;
  pois: Poi[];
  /** トイレ・コインロッカーなどの設備（なければ設備の欄を出さない） */
  amenities?: Amenity[];
  currentNodeId: NodeId | null;
  onPick: (place: Place) => void;
  onClose: () => void;
}

/** 設備の絞り込み（多目的トイレはトイレのうち車いすで使えるもの） */
type AmenityFilter = AmenityKind | 'accessible';
const AMENITY_FILTERS: AmenityFilter[] = [
  'toilet',
  'accessible',
  'locker',
  'atm',
  'elevator',
  'info',
  'aed',
];
const MAX_AMENITIES = 8;

/** おすすめスポット: 地上POIをカードで一覧し、現在地からの徒歩目安を出す */
export function SpotsSheet({ graph, pois, amenities = [], currentNodeId, onPick, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const [kind, setKind] = useState<AmenityFilter | null>(null);
  /** いまいる所から各点までの通路の距離（1 回の計算で全部） */
  const distances = useMemo(
    () => (currentNodeId === null ? null : distancesFrom(graph, currentNodeId)),
    [graph, currentNodeId],
  );
  /** 選んだ種類の設備を近い順に（現在地がなければ階・名前の順）。多いので先頭だけ */
  const nearby = useMemo(() => {
    if (kind === null) return [];
    const matches = amenities.filter((a) =>
      kind === 'accessible' ? a.kind === 'toilet' && a.wheelchair : a.kind === kind,
    );
    const withDistance = matches.map((a) => ({
      amenity: a,
      distanceM: distances?.get(a.nodeId) ?? null,
    }));
    withDistance.sort(
      (x, y) =>
        (x.distanceM ?? Infinity) - (y.distanceM ?? Infinity) ||
        x.amenity.label.ja.localeCompare(y.amenity.label.ja),
    );
    return withDistance.slice(0, MAX_AMENITIES);
  }, [amenities, kind, distances]);

  const cards = useMemo(
    () => pois.map((poi) => ({ poi, distanceM: distances?.get(poi.nodeId) ?? null })),
    [pois, distances],
  );

  return (
    <BottomSheet label={t('spots.title')} onClose={onClose}>
      <div className="sheet-header">
        <h2>{t('spots.title')}</h2>
        <button type="button" className="close" aria-label={t('sheet.close')} onClick={onClose}>
          ×
        </button>
      </div>
      {amenities.length > 0 && (
        <div className="field amenity-finder">
          <span>{t('amenity.title')}</span>
          <div className="quick-chips" role="group" aria-label={t('amenity.title')}>
            {AMENITY_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                className={kind === filter ? 'chip active' : 'chip'}
                aria-pressed={kind === filter}
                onClick={() => setKind((prev) => (prev === filter ? null : filter))}
              >
                {t(`amenity.${filter}`)}
              </button>
            ))}
          </div>
          {kind !== null && nearby.length === 0 && <p className="hint">{t('amenity.none')}</p>}
          {kind !== null && currentNodeId === null && nearby.length > 0 && (
            <p className="hint">{t('amenity.setLocation')}</p>
          )}
          {nearby.length > 0 && (
            <ul className="choice-list amenity-list">
              {nearby.map(({ amenity, distanceM }) => (
                <li key={amenity.id}>
                  <button
                    type="button"
                    className="amenity-item"
                    onClick={() =>
                      onPick({ nodeId: amenity.nodeId, name: amenity.label, aboveGround: false })
                    }
                  >
                    <span>{localized(amenity.label, i18n.language)}</span>
                    {distanceM !== null && (
                      <span className="spot-meta">
                        {t('spots.walk', {
                          minutes: Math.max(1, Math.round(distanceM / WALK_SPEED_M_PER_MIN)),
                          distance: Math.round(distanceM),
                        })}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
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
    </BottomSheet>
  );
}
