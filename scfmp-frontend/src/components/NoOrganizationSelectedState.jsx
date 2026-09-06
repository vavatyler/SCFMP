import { Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCooperative } from '../context/CooperativeContext';

const NoOrganizationSelectedState = ({ descriptionKey = 'genericDescription', showModules = false }) => {
  const { t } = useTranslation();
  const { cooperatives, requestOrganizationSelection } = useCooperative();

  return (
    <section className="rounded-xl border border-sand bg-white px-5 py-10 text-center shadow-card sm:px-8" aria-live="polite">
      <Building2 className="mx-auto h-10 w-10 text-forest" />
      <h2 className="mt-4 font-display text-xl font-semibold text-ink">{t('organizationContext.noneSelected')}</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-ink-soft">{t(`organizationContext.${descriptionKey}`)}</p>
      {showModules && <p className="mx-auto mt-3 max-w-2xl text-xs leading-5 text-ink-soft">{t('organizationContext.dashboardModules')}</p>}
      {cooperatives.length > 0 && (
        <button type="button" onClick={requestOrganizationSelection} className="focus-ring mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-forest px-4 text-sm font-medium text-paper">
          <Building2 className="h-4 w-4" />{t('organizationContext.selectOrganization')}
        </button>
      )}
    </section>
  );
};

export default NoOrganizationSelectedState;
