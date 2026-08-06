import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MapPin } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { listFarmers } from '../api/farmers';
import { useAuth } from '../context/AuthContext';
import { useCooperative } from '../context/CooperativeContext';

const FarmersPage = () => {
  const { user } = useAuth();
  const { cooperativeScope, activeCooperativeId } = useCooperative();
  const [farmers, setFarmers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFarmers = async () => {
      try {
        const data = await listFarmers(cooperativeScope);
        setFarmers(data);
      } catch (err) {
        setError('Could not load farmers. Is the backend server running?');
      } finally {
        setIsLoading(false);
      }
    };
    fetchFarmers();
  }, [activeCooperativeId]);

  return (
    <DashboardLayout title="Farmers" subtitle="Members with a registered farm profile.">
      <div className="overflow-hidden rounded-xl bg-white shadow-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-ink-soft">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading farmers…
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-clay">{error}</div>
        ) : farmers.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-soft">
            No farmer profiles yet. Add one from a member's detail page.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-sand bg-sand/30 text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Crop</th>
                <th className="px-5 py-3 font-medium">Farm size</th>
                <th className="px-5 py-3 font-medium">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {farmers.map((farmer) => (
                <tr key={farmer.id} className="transition-colors hover:bg-sand/20">
                  <td className="px-5 py-3.5">
                    <Link
                      to={`/members/${farmer.member.id}`}
                      className="font-medium text-ink hover:text-forest"
                    >
                      {farmer.member.first_name} {farmer.member.last_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-ink-soft">{farmer.crop_type || '—'}</td>
                  <td className="figure px-5 py-3.5 text-ink-soft">
                    {farmer.farm_size_ha ? `${farmer.farm_size_ha} ha` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-ink-soft">
                    {farmer.location ? (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {farmer.location}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FarmersPage;
