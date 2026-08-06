import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import StatCard from '../components/StatCard';
import { getDashboardSummary } from '../api/dashboard';
import { useAuth } from '../context/AuthContext';
import { useCooperative } from '../context/CooperativeContext';

const DashboardPage = () => {
  const { user } = useAuth();
  const { cooperativeScope, isSuperAdmin, activeCooperativeId } = useCooperative();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // super_admin needs a cooperative selected before there's anything to show
    if (isSuperAdmin && !activeCooperativeId) {
      setIsLoading(false);
      return;
    }

    const fetchSummary = async () => {
      setIsLoading(true);
      try {
        const data = await getDashboardSummary(cooperativeScope);
        setSummary(data);
      } catch (err) {
        setError('Could not load dashboard data. Is the backend server running?');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSummary();
  }, [user, activeCooperativeId]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center text-ink-soft">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading dashboard…
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center gap-3 rounded-xl border border-clay/20 bg-clay/5 p-5 text-clay">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  if (isSuperAdmin && !activeCooperativeId) {
    return (
      <DashboardLayout title={`Welcome back, ${user?.first_name}`}>
        <div className="rounded-xl border border-sand bg-white p-8 text-center shadow-card">
          <p className="text-sm text-ink-soft">
            No cooperatives registered yet. Head to <strong>Cooperatives</strong> in the sidebar to add your first one.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // Safety net: the active cooperative can change (via the switcher, or CooperativeContext
  // settling asynchronously right after login) before this page's own fetch has caught up.
  // Never render fields off a null summary, regardless of what isLoading currently says.
  if (!summary) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center text-ink-soft">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading dashboard…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`Welcome back, ${user?.first_name}`}
      subtitle="Here's what's happening across your cooperative right now."
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total members" value={summary.members.total} accent="forest" />
        <StatCard label="Active farmers" value={summary.farmers.total} accent="forest" />
        <StatCard
          label="Production value"
          value={summary.production.total_value}
          sublabel={`${summary.production.total_quantity} units across ${summary.production.record_count} records`}
          accent="gold"
          isCurrency
        />
        <StatCard label="Income" value={summary.finance.income} accent="gold" isCurrency />
        <StatCard label="Expenses" value={summary.finance.expense} accent="clay" isCurrency />
        <StatCard
          label="Net balance"
          value={summary.finance.net_balance}
          accent={summary.finance.net_balance >= 0 ? 'gold' : 'clay'}
          isCurrency
        />
        <StatCard
          label="Active loans"
          value={summary.loans.active_count}
          sublabel={`${Number(summary.loans.outstanding_balance).toLocaleString('en-RW')} RWF outstanding`}
          accent="clay"
        />
        <StatCard
          label="Low stock items"
          value={summary.inventory.low_stock_count}
          sublabel={summary.inventory.low_stock_count > 0 ? 'Needs attention' : 'All good'}
          accent={summary.inventory.low_stock_count > 0 ? 'clay' : 'forest'}
        />
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
