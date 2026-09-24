import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PERMISSIONS } from '../config/permissions';

const CHART_COLORS = ['#1C3829', '#C99A3D', '#8B4A3C'];

const ChartCard = ({ title, children }) => (
  <section className="min-w-0 rounded-2xl border border-sand/80 bg-white p-4 shadow-card sm:p-5" aria-label={title}>
    <h2 className="font-display text-base font-semibold text-ink sm:text-lg">{title}</h2>
    {children}
  </section>
);

const EmptyChart = ({ message }) => (
  <div className="flex min-h-56 flex-col items-center justify-center px-4 text-center text-sm text-ink-soft">
    <Activity className="h-7 w-7 text-ink-soft/50" aria-hidden="true" />
    <p className="mt-3 max-w-xs">{message}</p>
  </div>
);

const compactNumber = (value) => Number(value || 0).toLocaleString('en-RW', { maximumFractionDigits: 1 });

const DashboardAnalytics = ({ data, isLoading, error, can }) => {
  const { t } = useTranslation();
  const showProduction = can(PERMISSIONS.PRODUCTION_VIEW);
  const showFarmers = can(PERMISSIONS.FARMERS_VIEW);
  const showInventory = can(PERMISSIONS.INVENTORY_VIEW);
  const showFinance = can(PERMISSIONS.FINANCE_VIEW);
  const hasPanels = showProduction || showFarmers || showInventory || showFinance || can(PERMISSIONS.MEMBERS_VIEW);

  if (!hasPanels) return null;

  const panels = [];
  if (showProduction) panels.push({ id: 'production', title: t('dashboard.productionTrendTitle') });
  if (showFarmers) panels.push({ id: 'farmers', title: t('dashboard.farmerDistributionTitle') });
  if (showInventory) panels.push({ id: 'inventory', title: t('dashboard.inventoryStatusTitle') });
  if (showFinance) panels.push({ id: 'finance', title: t('dashboard.financialOverviewTitle') });

  const inventoryRows = data?.inventory_status ? [
    { name: t('dashboard.availableStock'), value: data.inventory_status.available },
    { name: t('dashboard.lowStock'), value: data.inventory_status.low_stock },
    { name: t('dashboard.outOfStock'), value: data.inventory_status.out_of_stock },
  ] : [];

  return (
    <section className="mt-8 sm:mt-10" aria-labelledby="dashboard-analytics-heading">
      <div className="mb-4"><h2 id="dashboard-analytics-heading" className="font-display text-xl font-semibold text-ink sm:text-2xl">{t('dashboard.analyticsTitle')}</h2><p className="mt-1 text-sm text-ink-soft">{t('dashboard.analyticsSubtitle')}</p></div>
      {error && <p className="mb-4 rounded-lg border border-clay/20 bg-clay/5 px-4 py-3 text-sm text-clay" role="alert">{error}</p>}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">{panels.map((panel) => <div key={panel.id} className="flex min-h-72 flex-col rounded-2xl border border-sand/80 bg-white p-5 shadow-card"><h3 className="font-display font-semibold text-ink">{panel.title}</h3><div className="flex flex-1 items-center justify-center text-sm text-ink-soft" role="status"><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('common.loading')}</div></div>)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {showProduction && <ChartCard title={t('dashboard.productionTrendTitle')}>
            {data?.production_trend?.length ? <div className="mt-4 h-56 min-w-0 sm:h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.production_trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}><defs><linearGradient id="productionValueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1C3829" stopOpacity={0.24} /><stop offset="95%" stopColor="#1C3829" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="#E8E1D1" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="period" tick={{ fill: '#5A5548', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis width={54} tickFormatter={compactNumber} tick={{ fill: '#5A5548', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => [`${compactNumber(value)} RWF`, t('dashboard.productionValue')]} /><Area type="monotone" dataKey="value" name={t('dashboard.productionValue')} stroke="#1C3829" strokeWidth={2.5} fill="url(#productionValueFill)" activeDot={{ r: 5 }} /></AreaChart></ResponsiveContainer></div> : <EmptyChart message={t('dashboard.noProductionAnalytics')} />}
          </ChartCard>}

          {showFarmers && <ChartCard title={t('dashboard.farmerDistributionTitle')}>
            {data?.farmer_distribution?.length ? <div className="mt-4 h-56 min-w-0 sm:h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.farmer_distribution} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}><CartesianGrid stroke="#E8E1D1" strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} tick={{ fill: '#5A5548', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="location" width={88} tick={{ fill: '#5A5548', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => [value, t('dashboard.farmersCount')]} /><Bar dataKey="farmers" name={t('dashboard.farmersCount')} fill="#1C3829" radius={[0, 5, 5, 0]} maxBarSize={24} /></BarChart></ResponsiveContainer></div> : <EmptyChart message={t('dashboard.noFarmerAnalytics')} />}
          </ChartCard>}

          {showInventory && <ChartCard title={t('dashboard.inventoryStatusTitle')}>
            {Number(data?.inventory_status?.total_items) > 0 ? <div className="mt-4 h-56 min-w-0 sm:h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={inventoryRows} dataKey="value" nameKey="name" innerRadius="53%" outerRadius="78%" paddingAngle={3} stroke="#fff" strokeWidth={2}>{inventoryRows.map((row, index) => <Cell key={row.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie><Tooltip formatter={(value, name) => [value, name]} /><Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer></div> : <EmptyChart message={t('dashboard.noInventoryAnalytics')} />}
          </ChartCard>}

          {showFinance && <ChartCard title={t('dashboard.financialOverviewTitle')}>
            {data?.financial_overview?.length ? <div className="mt-4 h-56 min-w-0 sm:h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.financial_overview} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}><CartesianGrid stroke="#E8E1D1" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="period" tick={{ fill: '#5A5548', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis width={54} tickFormatter={compactNumber} tick={{ fill: '#5A5548', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value, name) => [`${compactNumber(value)} RWF`, name]} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="income" name={t('dashboard.income')} fill="#1C3829" radius={[4, 4, 0, 0]} maxBarSize={34} /><Bar dataKey="expense" name={t('dashboard.expenses')} fill="#8B4A3C" radius={[4, 4, 0, 0]} maxBarSize={34} /></BarChart></ResponsiveContainer></div> : <EmptyChart message={t('dashboard.noFinancialAnalytics')} />}
          </ChartCard>}
        </div>
      )}

      {can(PERMISSIONS.MEMBERS_VIEW) && <section className="mt-4 rounded-2xl border border-sand/80 bg-white p-4 shadow-card sm:p-5" aria-label={t('dashboard.recentActivityTitle')}>
        <h2 className="font-display text-base font-semibold text-ink sm:text-lg">{t('dashboard.recentActivityTitle')}</h2>
        {isLoading ? <p className="mt-4 text-sm text-ink-soft" role="status">{t('common.loading')}</p> : data?.recent_activity?.length ? <ul className="mt-3 divide-y divide-sand/70">{data.recent_activity.map((activity) => <li key={activity.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><span className="min-w-0 text-sm font-medium capitalize text-ink">{String(activity.action || '').replace(/[._]/g, ' ')}</span><span className="shrink-0 text-xs text-ink-soft">{activity.created_at ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(activity.created_at)) : ''}</span></li>)}</ul> : <p className="mt-3 text-sm text-ink-soft">{t('dashboard.noRecentActivity')}</p>}
      </section>}
    </section>
  );
};

export default DashboardAnalytics;
