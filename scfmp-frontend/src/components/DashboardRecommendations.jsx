import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Boxes,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Sparkles,
  Sprout,
  UsersRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PERMISSIONS } from '../config/permissions';

const CARD_TONES = {
  forest: {
    background: 'from-[#122419] via-[#1c3829] to-[#326448]',
    glow: 'bg-[#e0bc6f]/25',
    accent: 'text-[#f1d48b]',
    icon: 'bg-[#f1d48b]/15 text-[#f1d48b]',
    button: 'bg-white text-ink hover:bg-[#f4ecd8]',
  },
  harvest: {
    background: 'from-[#302315] via-[#59401f] to-[#8c672d]',
    glow: 'bg-[#f8cf83]/25',
    accent: 'text-[#ffe1a2]',
    icon: 'bg-[#ffe1a2]/15 text-[#ffe1a2]',
    button: 'bg-white text-ink hover:bg-[#f8efd9]',
  },
  river: {
    background: 'from-[#142b35] via-[#1c4a50] to-[#2f7265]',
    glow: 'bg-[#83ddc1]/25',
    accent: 'text-[#baf1dc]',
    icon: 'bg-[#baf1dc]/15 text-[#baf1dc]',
    button: 'bg-white text-ink hover:bg-[#e5f7ef]',
  },
  clay: {
    background: 'from-[#35231f] via-[#633e31] to-[#925a43]',
    glow: 'bg-[#ffcf9c]/25',
    accent: 'text-[#ffd5b0]',
    icon: 'bg-[#ffd5b0]/15 text-[#ffd5b0]',
    button: 'bg-white text-ink hover:bg-[#fff0e5]',
  },
};

const DashboardRecommendations = ({ summary, can }) => {
  const { t } = useTranslation();
  const trackRef = useRef(null);
  const [canScrollPrevious, setCanScrollPrevious] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const recommendations = [
    {
      id: 'members',
      to: '/members',
      permission: PERMISSIONS.MEMBERS_VIEW,
      Icon: UsersRound,
      tone: 'forest',
      titleKey: 'dashboard.recommendMembersTitle',
      descriptionKey: 'dashboard.recommendMembersDescription',
      actionKey: 'dashboard.recommendMembersAction',
      metricLabel: t('dashboard.totalMembers'),
      metricValue: summary?.members ? Number(summary.members.total).toLocaleString('en-RW') : null,
    },
    {
      id: 'production',
      to: '/production',
      permission: PERMISSIONS.PRODUCTION_VIEW,
      Icon: Sprout,
      tone: 'harvest',
      titleKey: 'dashboard.recommendProductionTitle',
      descriptionKey: 'dashboard.recommendProductionDescription',
      actionKey: 'dashboard.recommendProductionAction',
      metricLabel: t('dashboard.productionValue'),
      metricValue: summary?.production ? Number(summary.production.total_value).toLocaleString('en-RW') : null,
      suffix: 'RWF',
    },
    {
      id: 'finance',
      to: '/finance',
      permission: PERMISSIONS.FINANCE_VIEW,
      Icon: CircleDollarSign,
      tone: 'river',
      titleKey: 'dashboard.recommendFinanceTitle',
      descriptionKey: 'dashboard.recommendFinanceDescription',
      actionKey: 'dashboard.recommendFinanceAction',
      metricLabel: t('dashboard.netBalance'),
      metricValue: summary?.finance ? Number(summary.finance.net_balance).toLocaleString('en-RW') : null,
      suffix: 'RWF',
    },
    {
      id: 'inventory',
      to: '/inventory',
      permission: PERMISSIONS.INVENTORY_VIEW,
      Icon: Boxes,
      tone: 'clay',
      titleKey: 'dashboard.recommendInventoryTitle',
      descriptionKey: 'dashboard.recommendInventoryDescription',
      actionKey: 'dashboard.recommendInventoryAction',
      metricLabel: t('dashboard.lowStock'),
      metricValue: summary?.inventory ? Number(summary.inventory.low_stock_count).toLocaleString('en-RW') : null,
    },
  ].filter((recommendation) => can(recommendation.permission));

  const updateScrollControls = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setCanScrollPrevious(track.scrollLeft > 2);
    setCanScrollNext(track.scrollLeft + track.clientWidth < track.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    updateScrollControls();
    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateScrollControls)
      : null;
    observer?.observe(track);
    window.addEventListener('resize', updateScrollControls);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateScrollControls);
    };
  }, [recommendations.length, updateScrollControls]);

  if (!recommendations.length) return null;

  const scroll = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const firstCard = track.querySelector('[data-recommendation-card]');
    const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 16;
    const amount = (firstCard?.getBoundingClientRect().width || track.clientWidth) + gap;
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    track.scrollBy({ left: direction * amount, behavior });
  };

  return (
    <section className="mt-10 sm:mt-12" aria-labelledby="dashboard-recommendations-title">
      <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 id="dashboard-recommendations-title" className="font-display text-xl font-semibold text-ink sm:text-2xl">
              {t('dashboard.recommendationsTitle')}
            </h2>
            <span className="rounded-full bg-forest px-2 py-0.5 text-[11px] font-semibold text-white" aria-label={t('dashboard.recommendationCount', { count: recommendations.length })}>
              {recommendations.length}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-ink-soft">{t('dashboard.recommendationsSubtitle')}</p>
        </div>
        {recommendations.length > 1 && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-sand bg-white text-ink transition hover:border-forest/30 hover:bg-forest hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-sand disabled:hover:bg-white disabled:hover:text-ink"
              onClick={() => scroll(-1)}
              disabled={!canScrollPrevious}
              aria-label={t('common.previous')}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-sand bg-white text-ink transition hover:border-forest/30 hover:bg-forest hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-sand disabled:hover:bg-white disabled:hover:text-ink"
              onClick={() => scroll(1)}
              disabled={!canScrollNext}
              aria-label={t('common.next')}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      <div
        ref={trackRef}
        className="dashboard-recommendation-track flex gap-4 overflow-x-auto overscroll-x-contain px-1 pb-3 pt-1"
        onScroll={updateScrollControls}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            scroll(1);
          } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            scroll(-1);
          }
        }}
        role="region"
        aria-roledescription="carousel"
        aria-label={`${t('dashboard.recommendationsTitle')}: ${t('dashboard.recommendationsSubtitle')}`}
        tabIndex={0}
      >
        {recommendations.map((recommendation) => {
          const Icon = recommendation.Icon;
          const tone = CARD_TONES[recommendation.tone];
          return (
            <article
              key={recommendation.id}
              data-recommendation-card
              className={`dashboard-recommendation-card group relative isolate min-h-[320px] snap-start overflow-hidden rounded-[1.4rem] bg-gradient-to-br ${tone.background} p-5 text-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:min-h-[300px] sm:p-6`}
              aria-label={t(recommendation.titleKey)}
            >
              <div className={`pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full ${tone.glow} blur-3xl`} />
              <div className="pointer-events-none absolute -right-9 bottom-[-5.5rem] h-52 w-52 rounded-full border border-white/10 bg-white/[0.04] transition-transform duration-500 group-hover:scale-110" />
              <div className="relative z-10 max-w-[60%] sm:max-w-[52%]">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-white/70">
                  <Sparkles className={`h-3.5 w-3.5 ${tone.accent}`} />
                  {t('dashboard.recommendationLabel')}
                </p>
                <h3 className="mt-4 font-display text-lg font-semibold leading-snug sm:text-xl">
                  {t(recommendation.titleKey)}
                </h3>
                <p className="mt-2 text-xs leading-5 text-white/75 sm:text-sm sm:leading-6">
                  {t(recommendation.descriptionKey)}
                </p>
              </div>

              <div aria-hidden="true" className={`dashboard-recommendation-mobile-icon pointer-events-none absolute right-5 top-5 z-0 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/[0.13] ${tone.icon}`}>
                <Icon className="h-5 w-5" strokeWidth={1.8} />
              </div>

              {recommendation.metricValue !== null && <div aria-hidden="true" className="dashboard-recommendation-art pointer-events-none absolute bottom-5 right-4 z-0 h-[118px] w-[132px] rotate-[-4deg] flex-col justify-between rounded-2xl border border-white/20 bg-white/[0.13] p-3 shadow-lg backdrop-blur-md transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-0 sm:bottom-6 sm:right-5 sm:h-[120px] sm:w-[132px]">
                <div className="flex items-center justify-between">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone.icon}`}>
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <ArrowRight className={`h-4 w-4 ${tone.accent}`} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-medium text-white/65">{recommendation.metricLabel}</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-white sm:text-base">
                    {recommendation.metricValue}
                    {recommendation.suffix && <span className="ml-1 text-[9px] font-medium text-white/65">{recommendation.suffix}</span>}
                  </p>
                </div>
              </div>}

              <Link
                to={recommendation.to}
                className={`focus-ring absolute bottom-5 left-5 z-10 inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold shadow-sm transition duration-200 hover:gap-3 sm:bottom-6 sm:left-6 ${tone.button}`}
              >
                {t(recommendation.actionKey)}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default DashboardRecommendations;
