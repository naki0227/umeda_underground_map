import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Graph } from '../../domain/graph';
import { distancesFrom } from '../../domain/distances';
import type { NodeId, Poi } from '../../domain/types';
import { localized } from '../../i18n';
import type { Place } from '../map/InteractiveMap';
import type { Amenity } from '../../data/amenities';
import { BottomSheet } from '../../components/BottomSheet';
import { AmenityFinder } from './AmenityFinder';
import { walkText } from './walkText';

interface Props {
  graph: Graph;
  pois: Poi[];
  /** トイレ・コインロッカーなどの設備（なければ設備のタブを出さない） */
  amenities?: Amenity[];
  currentNodeId: NodeId | null;
  onPick: (place: Place) => void;
  onClose: () => void;
}

type Tab = 'spots' | 'amenities';

/**
 * スポットのシート。「おすすめスポット（地上の行き先）」と「設備をさがす（トイレなど）」を
 * タブで分け、1 度に片方だけ出す
 */
export function SpotsSheet({ graph, pois, amenities = [], currentNodeId, onPick, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<Tab>('spots');
  /** いまいる所から各点までの通路の距離（1 回の計算で全部） */
  const distances = useMemo(
    () => (currentNodeId === null ? null : distancesFrom(graph, currentNodeId)),
    [graph, currentNodeId],
  );
  const tabs: { value: Tab; label: string }[] = [
    { value: 'spots', label: t('spots.title') },
    ...(amenities.length > 0 ? [{ value: 'amenities' as const, label: t('amenity.title') }] : []),
  ];

  return (
    <BottomSheet label={t('tabs.spots')} onClose={onClose}>
      <div className="sheet-header">
        <h2>{t('tabs.spots')}</h2>
        <button type="button" className="close" aria-label={t('sheet.close')} onClick={onClose}>
          ×
        </button>
      </div>
      {tabs.length > 1 && (
        <fieldset className="segmented">
          <legend className="visually-hidden">{t('tabs.spots')}</legend>
          {tabs.map(({ value, label }) => (
            <label key={value} className={tab === value ? 'active' : undefined}>
              <input
                type="radio"
                name="spots-tab"
                checked={tab === value}
                onChange={() => setTab(value)}
              />
              {label}
            </label>
          ))}
        </fieldset>
      )}
      {tab === 'amenities' ? (
        <AmenityFinder amenities={amenities} distances={distances} onPick={onPick} />
      ) : (
        <>
          <p className="hint">{t('spots.description')}</p>
          <ul className="spot-cards">
            {pois.map((poi) => {
              const distanceM = distances?.get(poi.nodeId) ?? null;
              return (
                <li key={poi.id}>
                  <button
                    type="button"
                    className="spot-card"
                    onClick={() =>
                      onPick({ nodeId: poi.nodeId, name: poi.name, aboveGround: true })
                    }
                  >
                    <span className="spot-name">{localized(poi.name, i18n.language)}</span>
                    <span className="spot-meta">
                      <span className="spot-tag">{t('spots.aboveGround')}</span>
                      {distanceM !== null && walkText(t, distanceM)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </BottomSheet>
  );
}
