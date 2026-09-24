import { useMemo, useState } from 'react';
import { Boxes, CalendarDays, Users, Wallet, Wheat } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../components/DashboardLayout';
import ReportActions from '../components/ReportActions';
import { useAuth } from '../context/AuthContext';
import { useCooperative } from '../context/CooperativeContext';
import { PERMISSIONS } from '../config/permissions';

const REPORT_MODULES = [
  { id: 'members', permission: PERMISSIONS.MEMBERS_VIEW, icon: Users },
  { id: 'farmers', permission: PERMISSIONS.FARMERS_VIEW, icon: Wheat },
  { id: 'production', permission: PERMISSIONS.PRODUCTION_VIEW, icon: Wheat },
  { id: 'finance', permission: PERMISSIONS.FINANCE_VIEW, icon: Wallet },
  { id: 'inventory', permission: PERMISSIONS.INVENTORY_VIEW, icon: Boxes },
];

const ReportsPage = () => {
  const { t } = useTranslation();
  const { can } = useAuth();
  const { cooperativeScope } = useCooperative();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const dateError = from && to && from > to;
  const filters = useMemo(() => ({ ...cooperativeScope, ...(from ? { from } : {}), ...(to ? { to } : {}) }), [cooperativeScope, from, to]);
  const reports = REPORT_MODULES.filter((item) => can(item.permission));

  return (
    <DashboardLayout title={t('reports.hubTitle')} subtitle={t('reports.hubSubtitle')}>
      <section className="mb-5 rounded-2xl border border-sand/80 bg-white p-4 shadow-card sm:p-5" aria-label={t('reports.dateRange')}>
        <div className="mb-3 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-forest" /><h2 className="text-sm font-semibold text-ink">{t('reports.dateRange')}</h2></div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-xs font-medium text-ink-soft">{t('common.from')}<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand bg-white px-3 text-sm text-ink" /></label>
          <label className="text-xs font-medium text-ink-soft">{t('common.to')}<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand bg-white px-3 text-sm text-ink" /></label>
          <button type="button" onClick={() => { setFrom(''); setTo(''); }} disabled={!from && !to} className="focus-ring min-h-11 rounded-lg border border-sand px-4 text-sm font-medium text-ink-soft hover:bg-sand/30 disabled:opacity-40">{t('reports.clearRange')}</button>
        </div>
        {dateError && <p className="mt-3 text-sm text-clay" role="alert">{t('reports.invalidDateRange')}</p>}
      </section>

      {reports.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {reports.map(({ id, icon: Icon }) => (
            <article key={id} className="min-w-0 rounded-2xl border border-sand/80 bg-white p-4 shadow-card sm:p-5">
              <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest/10 text-forest"><Icon className="h-5 w-5" /></span><div className="min-w-0"><h2 className="font-display text-base font-semibold text-ink">{t(`reports.modules.${id}`)}</h2><p className="mt-1 text-xs leading-5 text-ink-soft">{t('reports.centerDescription')}</p></div></div>
              <div className="mt-4 border-t border-sand/70 pt-3"><ReportActions moduleName={id} filters={filters} disabled={Boolean(dateError)} /></div>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-sand bg-white p-6 text-sm text-ink-soft">{t('reports.noModules')}</p>
      )}
    </DashboardLayout>
  );
};

export default ReportsPage;
