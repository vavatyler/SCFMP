import { useEffect, useState } from 'react';
import { CalendarDays, Check, CreditCard, Loader2, ReceiptText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../components/DashboardLayout';
import Badge from '../components/Badge';
import { getSubscriptionOverview } from '../api/subscriptions';
import { useCooperative } from '../context/CooperativeContext';
import { COMPANY_EMAIL, PRODUCT_NAME } from '../config/company';

const SubscriptionPage = () => {
  const { t } = useTranslation();
  const { cooperativeScope, activeCooperativeId } = useCooperative();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');
    getSubscriptionOverview(cooperativeScope)
      .then((data) => { if (active) setOverview(data); })
      .catch(() => { if (active) setError(t('subscription.loadError')); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [activeCooperativeId, cooperativeScope, t]);

  const current = overview?.current;
  const currentRank = overview?.plans.find((plan) => plan.id === current?.plan_id)?.rank;
  const localizedPlanName = (plan) => t(`subscription.planNames.${plan.id}`, { defaultValue: plan.name });
  const requestPlanUrl = (plan) => `mailto:${COMPANY_EMAIL}?subject=${encodeURIComponent(`${PRODUCT_NAME} ${localizedPlanName(plan)} plan request`)}&body=${encodeURIComponent(t('subscription.requestBody', { plan: localizedPlanName(plan), cycle: t(`subscription.${billingCycle}`) }))}`;

  return (
    <DashboardLayout title={t('subscription.title')} subtitle={t('subscription.subtitle')}>
      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center rounded-xl bg-white text-ink-soft shadow-card"><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('subscription.loading')}</div>
      ) : error ? (
        <div className="rounded-xl bg-white p-6 text-sm text-clay shadow-card" role="alert">{error}</div>
      ) : (
        <div className="space-y-7">
          <section className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div><div className="mb-2 flex items-center gap-2 text-forest"><CreditCard className="h-5 w-5" /><h2 className="font-display text-lg font-semibold">{t('subscription.current')}</h2></div>{current ? <div className="space-y-1.5 text-sm text-ink-soft"><p><span className="font-medium text-ink">{t('subscription.plan')}:</span> {localizedPlanName(overview.plans.find((plan) => plan.id === current.plan_id) || { id: current.plan_id, name: current.plan_id })}</p><p><span className="font-medium text-ink">{t('common.status')}:</span> <Badge status={current.status}>{t(`subscription.status.${current.status}`)}</Badge></p><p><span className="font-medium text-ink">{t('subscription.billingCycle')}:</span> {current.billing_cycle ? t(`subscription.${current.billing_cycle}`) : '—'}</p></div> : <div><p className="font-medium text-ink">{t('subscription.noSubscription')}</p><p className="mt-1 text-sm text-ink-soft">{t('subscription.noSubscriptionBody')}</p></div>}</div>
              {current && <dl className="grid gap-3 text-sm sm:min-w-64"><div className="flex items-center justify-between gap-5"><dt className="text-ink-soft">{t('subscription.nextBilling')}</dt><dd className="figure text-ink">{current.next_billing_date || '—'}</dd></div><div className="flex items-center justify-between gap-5"><dt className="text-ink-soft">{t('subscription.renewal')}</dt><dd className="figure text-ink">{current.cancel_at_period_end ? t('subscription.ends') : current.renews_at || '—'}</dd></div><div className="flex items-center justify-between gap-5"><dt className="text-ink-soft">{t('subscription.paymentStatus')}</dt><dd className="text-ink">{current.payment_status ? t(`subscription.status.${current.payment_status}`) : '—'}</dd></div></dl>}
            </div>
          </section>

          <section>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-display text-xl font-semibold text-ink">{t('subscription.available')}</h2><p className="mt-1 text-sm text-ink-soft">{t('subscription.pricingPending')}</p></div><div className="inline-flex self-start rounded-xl border border-sand bg-white p-1" role="group" aria-label={t('subscription.billingCycle')}>{['monthly', 'yearly'].map((cycle) => <button key={cycle} onClick={() => setBillingCycle(cycle)} aria-pressed={billingCycle === cycle} className={`focus-ring min-h-10 rounded-lg px-4 text-sm font-medium ${billingCycle === cycle ? 'bg-forest text-paper' : 'text-ink-soft'}`}>{t(`subscription.${cycle}`)}</button>)}</div></div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{overview.plans.map((plan) => {
              const isCurrent = current?.plan_id === plan.id;
              const direction = currentRank === undefined || plan.rank > currentRank ? 'upgrade' : 'downgrade';
              return <article key={plan.id} className={`flex min-w-0 flex-col rounded-2xl border bg-white p-5 shadow-card ${isCurrent ? 'border-forest' : 'border-sand/70'}`}><div className="mb-4"><div className="flex items-start justify-between gap-2"><h3 className="font-display text-lg font-semibold text-ink">{localizedPlanName(plan)}</h3>{isCurrent && <Badge status="active">{t('subscription.currentBadge')}</Badge>}</div><p className="mt-2 text-sm leading-5 text-ink-soft">{t(`subscription.planDescriptions.${plan.id}`, { defaultValue: plan.description })}</p></div><div className="mb-5 rounded-xl bg-sand/30 p-3"><p className="text-xs uppercase tracking-wide text-ink-soft">{t(`subscription.${billingCycle}`)}</p><p className="mt-1 font-medium text-ink">{t('subscription.contactPricing')}</p>{billingCycle === 'yearly' && <p className="mt-1 text-xs text-forest">{t('subscription.yearlyGuidance', overview.yearly_discount_guidance)}</p>}</div><ul className="mb-5 flex-1 space-y-2 text-sm text-ink-soft"><li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-forest" />{t('subscription.configurable')}</li><li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-forest" />{t('subscription.organizationReady')}</li></ul>{isCurrent ? <button disabled className="min-h-11 rounded-lg border border-sand text-sm font-medium text-ink-soft opacity-60">{t('subscription.currentBadge')}</button> : <a href={requestPlanUrl(plan)} className="focus-ring inline-flex min-h-11 items-center justify-center rounded-lg bg-forest px-3 text-center text-sm font-medium text-paper">{t(`subscription.${direction}`)}</a>}</article>;
            })}</div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-card"><div className="mb-3 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-forest" /><h2 className="font-display text-lg font-semibold text-ink">{t('subscription.history')}</h2></div>{overview.history.length ? <div /> : <p className="text-sm text-ink-soft">{t('subscription.noHistory')}</p>}</div>
            <div className="rounded-2xl bg-white p-5 shadow-card"><div className="mb-3 flex items-center gap-2"><ReceiptText className="h-5 w-5 text-forest" /><h2 className="font-display text-lg font-semibold text-ink">{t('subscription.invoices')}</h2></div>{overview.invoices.length ? <div /> : <p className="text-sm text-ink-soft">{t('subscription.noInvoices')}</p>}</div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
};

export default SubscriptionPage;
