import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { ReportLink } from '../../components/ReportLink';
import { BottomSheet } from '../../components/BottomSheet';

interface Props {
  dataVersion: string;
  onClose: () => void;
}

/**
 * メニュー: よく使う「言語」「情報が違うとき」を上に。アプリの説明はたたみ、
 * 地図データの出典（OpenStreetMap）はいつも見える所に置く
 */
export function MenuSheet({ dataVersion, onClose }: Props) {
  const { t } = useTranslation();
  return (
    <BottomSheet label={t('tabs.menu')} onClose={onClose}>
      <div className="sheet-header">
        <h2>{t('tabs.menu')}</h2>
        <button type="button" className="close" aria-label={t('sheet.close')} onClick={onClose}>
          ×
        </button>
      </div>
      <div className="field">
        <span>{t('language.label')}</span>
        <LanguageSwitcher />
      </div>
      <ReportLink />
      <details className="menu-about">
        <summary>{t('app.about')}</summary>
        <p className="hint">
          {t('app.title')} — {t('app.subtitle')}
        </p>
        <p className="hint">{t('map.caption')}</p>
        <p className="hint">{t('app.dataVersionNote', { version: dataVersion })}</p>
        <p className="hint">{t('attribution.official')}</p>
      </details>
      <div className="attribution" data-testid="attribution">
        <h3>{t('attribution.title')}</h3>
        <p className="hint">
          {t('attribution.osm')}{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            © OpenStreetMap contributors
          </a>{' '}
          (ODbL)
        </p>
      </div>
    </BottomSheet>
  );
}
