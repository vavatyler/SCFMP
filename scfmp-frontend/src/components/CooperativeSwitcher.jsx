import { useEffect, useRef } from 'react';
import { Building2, Check, ChevronDown, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCooperative } from '../context/CooperativeContext';

const CooperativeSwitcher = () => {
  const { t } = useTranslation();
  const {
    cooperatives,
    activeCooperativeId,
    activeCooperative,
    isLoading,
    loadError,
    isSelectorOpen,
    setIsSelectorOpen,
    selectCooperative,
  } = useCooperative();
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setIsSelectorOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsSelectorOpen]);

  return (
    <div className="relative min-w-0" ref={containerRef} data-organization-selector>
      <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-ink-soft sm:block">
        {t('organizationContext.organization')}
      </span>
      <button
        type="button"
        onClick={() => setIsSelectorOpen((open) => !open)}
        disabled={isLoading}
        aria-haspopup="listbox"
        aria-expanded={isSelectorOpen}
        className="focus-ring flex min-h-10 max-w-[12rem] items-center gap-2 rounded-lg border border-sand bg-white px-2.5 text-sm font-medium text-ink hover:bg-sand/30 disabled:opacity-60 sm:max-w-[18rem] sm:px-3"
      >
        {isLoading ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-ink-soft" /> : <Building2 className="h-3.5 w-3.5 shrink-0 text-ink-soft" />}
        <span className="truncate">
          {isLoading ? t('organizationContext.loading') : activeCooperative?.name || t('organizationContext.noneSelected')}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-soft" />
      </button>

      {isSelectorOpen && !isLoading && (
        <>
          <button type="button" className="fixed inset-0 z-30" onClick={() => setIsSelectorOpen(false)} aria-label={t('common.close')} />
          <div className="absolute left-0 z-40 mt-2 w-[min(18rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-sand bg-white py-1.5 shadow-2xl" role="listbox" aria-label={t('organizationContext.selectOrganization')}>
            <button
              type="button"
              role="option"
              aria-selected={!activeCooperativeId}
              onClick={() => { selectCooperative(null); setIsSelectorOpen(false); }}
              className="focus-ring flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm text-ink hover:bg-sand/30"
            >
              <span>{t('organizationContext.noneSelected')}</span>
              {!activeCooperativeId && <Check className="h-3.5 w-3.5 shrink-0 text-forest" />}
            </button>
            {cooperatives.map((cooperative) => (
              <button
                type="button"
                role="option"
                aria-selected={cooperative.id === activeCooperativeId}
                key={cooperative.id}
                onClick={() => { selectCooperative(cooperative.id); setIsSelectorOpen(false); }}
                className="focus-ring flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm text-ink hover:bg-sand/30"
              >
                <span className="min-w-0 truncate">{cooperative.name}</span>
                {cooperative.id === activeCooperativeId && <Check className="h-3.5 w-3.5 shrink-0 text-forest" />}
              </button>
            ))}
            {loadError && <p className="px-4 py-2 text-xs text-clay">{t(`organizationContext.${loadError}`)}</p>}
            {!loadError && cooperatives.length === 0 && <p className="px-4 py-2 text-xs text-ink-soft">{t('organizationContext.noAuthorizedOrganizations')}</p>}
          </div>
        </>
      )}
    </div>
  );
};

export default CooperativeSwitcher;
