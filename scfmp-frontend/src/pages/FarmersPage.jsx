import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../components/DashboardLayout';
import ReportActions from '../components/ReportActions';
import { listFarmers } from '../api/farmers';
import { useCooperative } from '../context/CooperativeContext';
import { getFarmerLocationDisplay } from '../utils/farmerForm';

const FarmersPage = () => {
  const { t } = useTranslation();
  const { cooperativeScope, activeCooperativeId } = useCooperative();
  const [farmers, setFarmers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFarmers = async () => {
      setIsLoading(true);
      setError('');
      try {
        setFarmers(await listFarmers(cooperativeScope));
      } catch {
        setError(t('farmers.loadError'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchFarmers();
  }, [activeCooperativeId, t]);

  return (
    <DashboardLayout title={t('common.farmers')} subtitle={t('modules.farmersSubtitle')}>
      <ReportActions moduleName="farmers" filters={cooperativeScope} />
      <div className="overflow-x-auto rounded-xl bg-white shadow-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('farmers.loading')}</div>
        ) : error ? (
          <div className="p-6 text-sm text-clay">{error}</div>
        ) : farmers.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-soft">{t('farmers.empty')}</div>
        ) : (
          <table className="min-w-[680px] w-full text-left text-sm">
            <thead className="border-b border-sand bg-sand/30 text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-5 py-3 font-medium">{t('members.fields.name')}</th>
                <th className="px-5 py-3 font-medium">{t('farmers.fields.cropType')}</th>
                <th className="px-5 py-3 font-medium">{t('farmers.fields.farmSize')}</th>
                <th className="px-5 py-3 font-medium">{t('farmers.fields.location')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {farmers.map((farmer) => {
                const locationDisplay = getFarmerLocationDisplay(farmer);
                return <tr key={farmer.id} className="transition-colors hover:bg-sand/20">
                  <td className="px-5 py-3.5">{farmer.member ? <Link to={`/members/${farmer.member.id}`} className="font-medium text-ink hover:text-forest">{farmer.member.first_name} {farmer.member.last_name}</Link> : '—'}</td>
                  <td className="px-5 py-3.5 text-ink-soft">{farmer.crop_type || '—'}</td>
                  <td className="figure px-5 py-3.5 text-ink-soft">{farmer.farm_size_ha != null && farmer.farm_size_ha !== '' ? `${farmer.farm_size_ha} ha` : '—'}</td>
                  <td className="px-5 py-3.5 text-ink-soft">{locationDisplay ? <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{locationDisplay}</span> : '—'}</td>
                </tr>;
              })}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FarmersPage;
