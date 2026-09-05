import { useState } from 'react';
import { KeyRound, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../components/DashboardLayout';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ChangePasswordModal from '../components/ChangePasswordModal';

const SettingsPage = () => {
  const { t } = useTranslation();
  const [passwordOpen, setPasswordOpen] = useState(false);
  return <DashboardLayout title={t('settings.title')} subtitle={t('settings.subtitle')}><div className="grid gap-4 md:grid-cols-2"><section className="rounded-xl bg-white p-5 shadow-card"><div className="flex items-center gap-2"><Languages className="h-5 w-5 text-forest" /><h2 className="font-display text-lg font-semibold text-ink">{t('settings.language')}</h2></div><p className="mt-2 text-sm text-ink-soft">{t('settings.languageHint')}</p><div className="mt-4"><LanguageSwitcher /></div></section><section className="rounded-xl bg-white p-5 shadow-card"><div className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-forest" /><h2 className="font-display text-lg font-semibold text-ink">{t('settings.security')}</h2></div><p className="mt-2 text-sm text-ink-soft">{t('settings.securityHint')}</p><button onClick={() => setPasswordOpen(true)} className="focus-ring mt-4 min-h-11 rounded-lg bg-forest px-4 text-sm font-medium text-paper">{t('common.changePassword')}</button></section></div><ChangePasswordModal isOpen={passwordOpen} onClose={() => setPasswordOpen(false)} /></DashboardLayout>;
};

export default SettingsPage;
