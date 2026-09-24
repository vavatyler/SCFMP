import { Mail, MapPin, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../components/DashboardLayout';
import ProfileAvatar from '../components/ProfileAvatar';
import { useAuth } from '../context/AuthContext';
import { useCooperative } from '../context/CooperativeContext';

const ProfilePage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeCooperative } = useCooperative();
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');
  const details = [
    { label: t('profile.fullName'), value: fullName, icon: UserRound },
    { label: t('profile.email'), value: user?.email, icon: Mail },
    { label: t('profile.phone'), value: user?.phone, icon: Phone },
    { label: t('profile.officialRole'), value: user?.official_role, icon: ShieldCheck },
    { label: t('profile.organization'), value: activeCooperative?.name, icon: MapPin },
  ].filter((item) => item.value);

  return (
    <DashboardLayout title={t('common.myProfile')} subtitle={t('profile.subtitle')}>
      <section className="overflow-hidden rounded-2xl border border-sand/80 bg-white shadow-card">
        <div className="h-2 bg-gradient-to-r from-forest via-forest-light to-gold" />
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-8">
          <ProfileAvatar user={user} size="h-20 w-20 text-xl" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest">{t('common.myProfile')}</p>
            <h2 className="mt-1 break-words font-display text-2xl font-semibold text-ink">{fullName}</h2>
            {user?.official_role && <p className="mt-1 text-sm font-medium text-ink-soft">{user.official_role}</p>}
            {activeCooperative?.name && <p className="mt-1 text-sm text-ink-soft">{activeCooperative.name}</p>}
          </div>
        </div>
        <dl className="grid gap-px border-t border-sand/80 bg-sand/70 sm:grid-cols-2">
          {details.map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white px-5 py-4 sm:px-8">
              <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-soft"><Icon className="h-4 w-4 text-forest" />{label}</dt>
              <dd className="mt-2 break-words pl-6 text-sm font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="border-t border-sand/80 px-5 py-4 text-xs leading-5 text-ink-soft sm:px-8">{t('profile.managedNotice')}</p>
      </section>
    </DashboardLayout>
  );
};

export default ProfilePage;
