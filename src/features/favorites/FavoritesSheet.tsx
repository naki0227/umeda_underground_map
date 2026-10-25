import { useTranslation } from 'react-i18next';
import { BottomSheet } from '../../components/BottomSheet';
import { localized } from '../../i18n';
import type { Place } from '../map/InteractiveMap';
import { favoriteKey } from './favoritesStore';

interface Props {
  favorites: Place[];
  onPick: (place: Place) => void;
  onRemove: (place: Place) => void;
  onClose: () => void;
}

/** お気に入り一覧。タップで場所シートを開き、そこから案内できる */
export function FavoritesSheet({ favorites, onPick, onRemove, onClose }: Props) {
  const { t, i18n } = useTranslation();
  return (
    <BottomSheet label={t('favorites.title')} onClose={onClose}>
      <div className="sheet-header">
        <h2>{t('favorites.title')}</h2>
        <button type="button" className="close" aria-label={t('sheet.close')} onClick={onClose}>
          ×
        </button>
      </div>
      {favorites.length === 0 ? (
        <p className="hint">{t('favorites.empty')}</p>
      ) : (
        <ul className="favorite-list">
          {favorites.map((place) => {
            const name = localized(place.name, i18n.language);
            return (
              <li key={favoriteKey(place)}>
                <button type="button" className="favorite-item" onClick={() => onPick(place)}>
                  <span>{name}</span>
                  {place.aboveGround && <span className="spot-tag">{t('spots.aboveGround')}</span>}
                </button>
                <button
                  type="button"
                  className="favorite-remove"
                  aria-label={t('favorites.removeNamed', { name })}
                  onClick={() => onRemove(place)}
                >
                  ★
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="hint">{t('favorites.storageNote')}</p>
    </BottomSheet>
  );
}
