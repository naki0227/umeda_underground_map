import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { ReportLink } from '../../components/ReportLink';

interface Props {
  dataVersion: string;
  onClose: () => void;
}

/** メニュー: アプリ情報・言語切替・報告フォームへの動線 */
export function MenuSheet({ dataVersion, onClose }: Props) {
  const { t } = useTranslation();
  return (
    <div className="sheet" role="dialog" aria-label={t('tabs.menu')}>
      <div className="sheet-header">
        <h1>{t('app.title')}</h1>
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
    </div>
  );
}
