import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { updatePreferredLanguage } from '../api/auth';
import { useAuth } from '../context/AuthContext';

const LanguageSwitcher = ({ compact = false }) => {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuth();

  const changeLanguage = async (event) => {
    const language = event.target.value;
    await i18n.changeLanguage(language);
    if (user) {
      try {
        const updated = await updatePreferredLanguage(language);
        updateUser(updated);
      } catch {
        // The local preference still works when the API is temporarily unavailable.
      }
    }
  };

  return (
    <label className="flex items-center gap-2 text-sm text-ink-soft">
      <Languages className="h-4 w-4" aria-hidden="true" />
      {!compact && <span className="sr-only sm:not-sr-only">{t('common.language')}</span>}
      <select
        value={i18n.resolvedLanguage || i18n.language}
        onChange={changeLanguage}
        aria-label={t('common.language')}
        className="focus-ring rounded-lg border border-sand bg-white px-2 py-1.5 text-sm text-ink"
      >
        <option value="en">{t('language.en')}</option>
        <option value="rw">{t('language.rw')}</option>
        <option value="fr">{t('language.fr')}</option>
      </select>
    </label>
  );
};

export default LanguageSwitcher;
