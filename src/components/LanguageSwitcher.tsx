import { useTranslation } from 'react-i18next';
import type { AppLanguage } from '../i18n';

const LANGUAGES: { code: AppLanguage; label: string }[] = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '简体中文' },
  { code: 'zh-Hant', label: '繁體中文' },
  { code: 'th', label: 'ไทย' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
];

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  return (
    <label className="language-switcher">
      <span className="visually-hidden">{t('language.label')}</span>
      <select
        value={LANGUAGES.find((l) => i18n.language === l.code)?.code ?? 'en'}
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
