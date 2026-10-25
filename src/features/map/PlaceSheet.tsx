import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { placeUrl, sharePlace } from '../../app/shareLink';
import { localized } from '../../i18n';
import type { Place } from './InteractiveMap';
import { BottomSheet } from '../../components/BottomSheet';

interface Props {
  place: Place;
  /** 地上の場所のいちばん近い出口の番号（あれば） */
  exitNo?: string;
  onGo: () => void;
  onSetHere: () => void;
  onClose: () => void;
  favorite: boolean;
  onToggleFavorite: () => void;
}

/** ピン・検索結果で選んだ場所の操作シート */
export function PlaceSheet({
  place,
  exitNo,
  onGo,
  onSetHere,
  onClose,
  favorite,
  onToggleFavorite,
}: Props) {
  const { t, i18n } = useTranslation();
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');
  /** この場所のリンクを送る（待ち合わせにも）。開いた人の画面ではこの場所が選ばれた状態で始まる */
  const share = () => {
    const title = t('place.shareTitle', { name: localized(place.name, i18n.language) });
    void sharePlace(placeUrl(globalThis.location.href, place), title).then((result) => {
      if (result === 'copied') setShareState('copied');
    });
  };
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
      {place.aboveGround && (
        <p className="hint">
          {exitNo !== undefined && (
            <strong className="nearest-exit">{t('place.nearestExit', { exit: exitNo })}</strong>
          )}
          {t('place.aboveGroundNote')}
        </p>
      )}
      <button type="button" className="link-button share-place" onClick={share}>
        {shareState === 'copied' ? t('place.copied') : t('place.share')}
      </button>
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
