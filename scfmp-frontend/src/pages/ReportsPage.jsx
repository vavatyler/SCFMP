import { Boxes, FileText, TrendingUp, Users, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../components/DashboardLayout';

const reports = [
  { to: '/members', key: 'members', icon: Users },
  { to: '/production', key: 'production', icon: TrendingUp },
  { to: '/finance', key: 'finance', icon: Wallet },
  { to: '/inventory', key: 'inventory', icon: Boxes },
  { to: '/documents', key: 'documents', icon: FileText },
];

const ReportsPage = () => {
  const { t } = useTranslation();
  return <DashboardLayout title={t('reports.hubTitle')} subtitle={t('reports.hubSubtitle')}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{reports.map(({ to, key, icon: Icon }) => <Link key={key} to={to} className="focus-ring rounded-xl bg-white p-5 shadow-card transition-transform hover:-translate-y-0.5"><Icon className="h-6 w-6 text-forest" /><h2 className="mt-4 font-display text-lg font-semibold text-ink">{t(`reports.modules.${key}`)}</h2><p className="mt-1 text-sm text-ink-soft">{t('reports.openModule')}</p></Link>)}</div></DashboardLayout>;
};

export default ReportsPage;
