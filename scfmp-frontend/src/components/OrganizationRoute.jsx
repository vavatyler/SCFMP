import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from './DashboardLayout';
import NoOrganizationSelectedState from './NoOrganizationSelectedState';
import { useCooperative } from '../context/CooperativeContext';

const OrganizationRoute = ({ children, titleKey, descriptionKey }) => {
  const { t } = useTranslation();
  const { activeCooperativeId, hasOrganizationContext, isLoading } = useCooperative();

  if (isLoading) {
    return <DashboardLayout title={t(titleKey)}><div className="flex min-h-48 items-center justify-center text-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('organizationContext.loading')}</div></DashboardLayout>;
  }
  if (!hasOrganizationContext) {
    return <DashboardLayout title={t(titleKey)} subtitle={t('organizationContext.noCurrentOrganization')}><NoOrganizationSelectedState descriptionKey={descriptionKey} /></DashboardLayout>;
  }
  return <div key={activeCooperativeId}>{children}</div>;
};

export default OrganizationRoute;
