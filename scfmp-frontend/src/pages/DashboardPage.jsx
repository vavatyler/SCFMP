import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../components/DashboardLayout';
import DashboardRecommendations from '../components/DashboardRecommendations';
import NoOrganizationSelectedState from '../components/NoOrganizationSelectedState';
import StatCard from '../components/StatCard';
import { getDashboardAnalytics, getDashboardSummary } from '../api/dashboard';
import { useAuth } from '../context/AuthContext';
import { useCooperative } from '../context/CooperativeContext';
import { getDashboardGreeting } from '../utils/dashboardGreeting';
import { PERMISSIONS } from '../config/permissions';
import DashboardAnalytics from '../components/DashboardAnalytics';

const DashboardPage = () => {
  const { t } = useTranslation();
  const { user, can } = useAuth();
  const {
    cooperativeScope,
    isSuperAdmin,
    activeCooperativeId,
    activeCooperative,
    isLoading: isOrganizationLoading,
  } = useCooperative();
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');
  const [summaryOrganizationId, setSummaryOrganizationId] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setSummary(null);
    setAnalytics(null);
    setSummaryOrganizationId(null);
    setError('');
    setAnalyticsError('');
    if (!activeCooperativeId) {
      setIsLoading(false);
      setIsAnalyticsLoading(false);
      return;
    }
    const fetchSummary = async () => {
      setIsLoading(true);
      setIsAnalyticsLoading(true);
      setError('');
      const [summaryResult, analyticsResult] = await Promise.allSettled([
        getDashboardSummary(cooperativeScope),
        getDashboardAnalytics(cooperativeScope),
      ]);
      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value);
        setSummaryOrganizationId(activeCooperativeId);
      } else {
        setError(t('dashboard.loadError'));
      }
      if (analyticsResult.status === 'fulfilled') {
        setAnalytics(analyticsResult.value);
      } else {
        setAnalyticsError(t('dashboard.analyticsLoadError'));
      }
      setIsAnalyticsLoading(false);
      setIsLoading(false);
    };
    fetchSummary();
  }, [activeCooperativeId, cooperativeScope, t]);

  if (isOrganizationLoading || isLoading || (activeCooperativeId && summaryOrganizationId !== activeCooperativeId && !error)) {
    return <DashboardLayout><div className="flex h-64 items-center justify-center text-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('common.loading')}</div></DashboardLayout>;
  }

  if (error) {
    return <DashboardLayout><div className="flex items-center gap-3 rounded-xl border border-clay/20 bg-clay/5 p-5 text-clay" role="alert"><AlertTriangle className="h-5 w-5 shrink-0" /><p className="text-sm">{error}</p></div></DashboardLayout>;
  }

  if (!activeCooperativeId || !activeCooperative) {
    return (
      <DashboardLayout title={t('common.dashboard')} subtitle={t('organizationContext.noCurrentOrganization')}>
        <NoOrganizationSelectedState descriptionKey="dashboardDescription" showModules />
      </DashboardLayout>
    );
  }

  const dashboardGreeting = getDashboardGreeting({
    isSuperAdmin,
    firstName: user?.first_name,
    organizationName: activeCooperative?.name,
  });

  const stats = [
    can(PERMISSIONS.MEMBERS_VIEW) && <StatCard key="members" label={t('dashboard.totalMembers')} value={summary.members.total} accent="forest" />,
    can(PERMISSIONS.FARMERS_VIEW) && <StatCard key="farmers" label={t('dashboard.activeFarmers')} value={summary.farmers.total} accent="forest" />,
    can(PERMISSIONS.PRODUCTION_VIEW) && <StatCard key="production" label={t('dashboard.productionValue')} value={summary.production.total_value} sublabel={t('dashboard.records', { quantity: summary.production.total_quantity, count: summary.production.record_count })} accent="gold" isCurrency />,
    can(PERMISSIONS.FINANCE_VIEW) && <StatCard key="income" label={t('dashboard.income')} value={summary.finance.income} accent="gold" isCurrency />,
    can(PERMISSIONS.FINANCE_VIEW) && <StatCard key="expenses" label={t('dashboard.expenses')} value={summary.finance.expense} accent="clay" isCurrency />,
    can(PERMISSIONS.FINANCE_VIEW) && <StatCard key="balance" label={t('dashboard.netBalance')} value={summary.finance.net_balance} accent={summary.finance.net_balance >= 0 ? 'gold' : 'clay'} isCurrency />,
    can(PERMISSIONS.FINANCE_VIEW) && <StatCard key="loans" label={t('dashboard.activeLoans')} value={summary.loans.active_count} sublabel={t('dashboard.outstanding', { amount: Number(summary.loans.outstanding_balance).toLocaleString('en-RW') })} accent="clay" />,
    can(PERMISSIONS.INVENTORY_VIEW) && <StatCard key="inventory" label={t('dashboard.lowStock')} value={summary.inventory.low_stock_count} sublabel={summary.inventory.low_stock_count > 0 ? t('dashboard.needsAttention') : t('dashboard.allGood')} accent={summary.inventory.low_stock_count > 0 ? 'clay' : 'forest'} />,
  ].filter(Boolean);

  return (
    <DashboardLayout
      title={t(dashboardGreeting.key, dashboardGreeting.values)}
      subtitle={t('organizationContext.currentOrganization', { name: activeCooperative.name })}
    >
      {stats.length > 0 ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{stats}</div> : <p className="rounded-xl border border-dashed border-sand bg-white p-6 text-sm text-ink-soft">{t('dashboard.noAuthorizedMetrics')}</p>}
      <DashboardAnalytics data={analytics} isLoading={isAnalyticsLoading} error={analyticsError} can={can} />
      <DashboardRecommendations summary={summary} can={can} />
    </DashboardLayout>
  );
};

export default DashboardPage;
