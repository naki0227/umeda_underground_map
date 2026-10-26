import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Amenity } from '../../data/amenities';
import type { AmenityKind } from '../../data/types';
import { localized } from '../../i18n';
import type { Place } from '../map/InteractiveMap';
import { walkText } from './walkText';

interface Props {
  amenities: Amenity[];
  /** いまいる所から各点までの通路の距離。現在地がなければ null */
  distances: Map<string, number> | null;
  onPick: (place: Place) => void;
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

/** トイレ・コインロッカーなどを種類で選び、近い順に出す */
export function AmenityFinder({ amenities, distances, onPick }: Props) {
  const { t, i18n } = useTranslation();
  const [kind, setKind] = useState<AmenityFilter | null>(null);
  /** 選んだ種類の設備を近い順に（現在地がなければ名前の順）。多いので先頭だけ */
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

  return (
    <div className="amenity-finder">
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
      {kind !== null && distances === null && nearby.length > 0 && (
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
                {distanceM !== null && <span className="spot-meta">{walkText(t, distanceM)}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
