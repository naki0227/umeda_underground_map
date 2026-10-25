import { useTranslation } from 'react-i18next';
import { localized } from '../../i18n';
import type { Place } from './InteractiveMap';
import { BottomSheet } from '../../components/BottomSheet';

interface Props {
  place: Place;
  onGo: () => void;
  onSetHere: () => void;
  onClose: () => void;
  favorite: boolean;
  onToggleFavorite: () => void;
}

/** ピン・検索結果で選んだ場所の操作シート */
export function PlaceSheet({ place, onGo, onSetHere, onClose, favorite, onToggleFavorite }: Props) {
  const { t, i18n } = useTranslation();
  return (
    <BottomSheet label={localized(place.name, i18n.language)} onClose={onClose} initialSnap="peek">
      <div className="sheet-header">
        <h2>{localized(place.name, i18n.language)}</h2>
        <button
          type="button"
          className={favorite ? 'favorite-toggle active' : 'favorite-toggle'}
          aria-pressed={favorite}
          onClick={onToggleFavorite}
        >
          <span aria-hidden>{favorite ? '★' : '☆'}</span> {t('favorites.add')}
        </button>
        <button type="button" className="close" aria-label={t('sheet.close')} onClick={onClose}>
          ×
        </button>
      </div>
      {place.aboveGround && <p className="hint">{t('place.aboveGroundNote')}</p>}
      <div className="route-actions sticky-actions">
        <button type="button" className="primary" onClick={onGo}>
          {t('place.goHere')}
        </button>
        <button type="button" className="secondary" onClick={onSetHere}>
          {t('place.setHere')}
        </button>
      </div>
    </BottomSheet>
  );
}
