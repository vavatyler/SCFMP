import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../components/DashboardLayout';
import NoOrganizationSelectedState from '../components/NoOrganizationSelectedState';
import StatCard from '../components/StatCard';
import { getDashboardSummary } from '../api/dashboard';
import { useAuth } from '../context/AuthContext';
import { useCooperative } from '../context/CooperativeContext';
import { getDashboardGreeting } from '../utils/dashboardGreeting';

const DashboardPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    cooperativeScope,
    isSuperAdmin,
    activeCooperativeId,
    activeCooperative,
    isLoading: isOrganizationLoading,
  } = useCooperative();
  const [summary, setSummary] = useState(null);
  const [summaryOrganizationId, setSummaryOrganizationId] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setSummary(null);
    setSummaryOrganizationId(null);
    setError('');
    if (!activeCooperativeId) {
      setIsLoading(false);
      return;
    }
    const fetchSummary = async () => {
      setIsLoading(true);
      setError('');
      try {
        setSummary(await getDashboardSummary(cooperativeScope));
        setSummaryOrganizationId(activeCooperativeId);
      } catch {
        setError(t('dashboard.loadError'));
      } finally {
        setIsLoading(false);
      }
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

  return (
    <DashboardLayout
      title={t(dashboardGreeting.key, dashboardGreeting.values)}
      subtitle={t('organizationContext.currentOrganization', { name: activeCooperative.name })}
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t('dashboard.totalMembers')} value={summary.members.total} accent="forest" />
        <StatCard label={t('dashboard.activeFarmers')} value={summary.farmers.total} accent="forest" />
        <StatCard label={t('dashboard.productionValue')} value={summary.production.total_value} sublabel={t('dashboard.records', { quantity: summary.production.total_quantity, count: summary.production.record_count })} accent="gold" isCurrency />
        <StatCard label={t('dashboard.income')} value={summary.finance.income} accent="gold" isCurrency />
        <StatCard label={t('dashboard.expenses')} value={summary.finance.expense} accent="clay" isCurrency />
        <StatCard label={t('dashboard.netBalance')} value={summary.finance.net_balance} accent={summary.finance.net_balance >= 0 ? 'gold' : 'clay'} isCurrency />
        <StatCard label={t('dashboard.activeLoans')} value={summary.loans.active_count} sublabel={t('dashboard.outstanding', { amount: Number(summary.loans.outstanding_balance).toLocaleString('en-RW') })} accent="clay" />
        <StatCard label={t('dashboard.lowStock')} value={summary.inventory.low_stock_count} sublabel={summary.inventory.low_stock_count > 0 ? t('dashboard.needsAttention') : t('dashboard.allGood')} accent={summary.inventory.low_stock_count > 0 ? 'clay' : 'forest'} />
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
