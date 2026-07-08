import { useTranslation } from 'react-i18next';
import { REPORT_FORM_URLS } from '../app/config';

export function ReportLink() {
  const { t, i18n } = useTranslation();
  const url = i18n.language.startsWith('ja') ? REPORT_FORM_URLS.ja : REPORT_FORM_URLS.en;
  return (
    <div className="report">
      <h3>{t('report.title')}</h3>
      <p className="hint">{t('report.description')}</p>
      <a href={url} target="_blank" rel="noreferrer">
        {t('report.link')}
      </a>
    </div>
  );
}
