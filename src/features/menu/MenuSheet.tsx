import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { ReportLink } from '../../components/ReportLink';
import { BottomSheet } from '../../components/BottomSheet';

interface Props {
  dataVersion: string;
  onClose: () => void;
}

/** メニュー: アプリ情報・言語切替・報告フォームへの動線 */
export function MenuSheet({ dataVersion, onClose }: Props) {
  const { t } = useTranslation();
  return (
    <BottomSheet label={t('tabs.menu')}>
      <div className="sheet-header">
        <h2>{t('app.title')}</h2>
        <button type="button" className="close" aria-label={t('sheet.close')} onClick={onClose}>
          ×
        </button>
      </div>
      <p className="hint">{t('app.subtitle')}</p>
      <p className="hint">{t('map.caption')}</p>
      <div className="field">
        <span>{t('language.label')}</span>
        <LanguageSwitcher />
      </div>
      <ReportLink />
      <p className="hint">{t('app.dataVersionNote', { version: dataVersion })}</p>
      <div className="attribution" data-testid="attribution">
        <h3>{t('attribution.title')}</h3>
        <p className="hint">
          {t('attribution.osm')}{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            © OpenStreetMap contributors
          </a>{' '}
          (ODbL)
        </p>
        <p className="hint">{t('attribution.official')}</p>
      </div>
    </BottomSheet>
  );
}
