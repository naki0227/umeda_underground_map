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
  const name = localized(place.name, i18n.language);
  /** 地上の場所なら「地上・D-21 出口」と、どこから上がるかを添える */
  const sub = place.aboveGround
    ? exitNo !== undefined
      ? t('search.kindPoiExit', { exit: exitNo })
      : t('search.kindPoi')
    : null;
  return (
    <BottomSheet label={name} onClose={onClose} initialSnap="peek">
      <div className="sheet-header place-header">
        <div className="place-title">
          <h2>{name}</h2>
          {sub !== null && <p className="place-sub">{sub}</p>}
        </div>
        {/* 保存・共有は見出しの横に小さく。押す所の主役は下の 2 つ */}
        <button
          type="button"
          className={favorite ? 'icon-tool active' : 'icon-tool'}
          aria-label={t('tabs.favorites')}
          aria-pressed={favorite}
          onClick={onToggleFavorite}
        >
          {favorite ? '★' : '☆'}
        </button>
        <button
          type="button"
          className="icon-tool"
          aria-label={t('place.shareShort')}
          title={t('place.share')}
          onClick={share}
        >
          ↗
        </button>
        <button type="button" className="close" aria-label={t('sheet.close')} onClick={onClose}>
          ×
        </button>
      </div>
      {shareState === 'copied' && (
        <p className="hint ok" role="status">
          {t('place.copied')}
        </p>
      )}
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
