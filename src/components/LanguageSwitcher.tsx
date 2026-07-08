import { useTranslation } from 'react-i18next';
import type { AppLanguage } from '../i18n';

const LANGUAGES: { code: AppLanguage; label: string }[] = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
];

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  return (
    <label className="language-switcher">
      <span className="visually-hidden">{t('language.label')}</span>
      <select
        value={i18n.language.startsWith('ja') ? 'ja' : 'en'}
        onChange={(e) => void i18n.changeLanguage(e.target.value)}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </label>
  );
}
