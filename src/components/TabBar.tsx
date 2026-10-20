import { useTranslation } from 'react-i18next';
import type { SheetKind } from '../features/navigation/useMapNavigation';

interface Props {
  sheet: SheetKind;
  onMap: () => void;
  onSpots: () => void;
  onMenu: () => void;
}

/** 画面下部の固定タブバー（地図 / スポット / メニュー） */
export function TabBar({ sheet, onMap, onSpots, onMenu }: Props) {
  const { t } = useTranslation();
  const mapActive = sheet !== 'spots' && sheet !== 'menu';
  return (
    <nav className="tabbar" aria-label={t('tabs.label')}>
      <button
        type="button"
        className={mapActive ? 'active' : ''}
        aria-current={mapActive ? 'page' : undefined}
        onClick={onMap}
      >
        <span className="tab-icon" aria-hidden>
          ⌂
        </span>
        {t('tabs.map')}
      </button>
      <button
        type="button"
        className={sheet === 'spots' ? 'active' : ''}
        aria-current={sheet === 'spots' ? 'page' : undefined}
        onClick={onSpots}
      >
        <span className="tab-icon" aria-hidden>
          ✦
        </span>
        {t('tabs.spots')}
      </button>
      <button
        type="button"
        className={sheet === 'menu' ? 'active' : ''}
        aria-current={sheet === 'menu' ? 'page' : undefined}
        onClick={onMenu}
      >
        <span className="tab-icon" aria-hidden>
          ☰
        </span>
        {t('tabs.menu')}
      </button>
    </nav>
  );
}
