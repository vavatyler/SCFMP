import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Loader2, Sprout } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import ReportActions from '../components/ReportActions';
import { listMembers, createMember } from '../api/members';
import { useAuth } from '../context/AuthContext';
import { useCooperative } from '../context/CooperativeContext';
import { useTranslation } from 'react-i18next';

const emptyForm = {
  first_name: '',
  last_name: '',
  gender: '',
  phone: '',
  address: '',
  membership_date: '',
};

const MembersPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { cooperativeScope, activeCooperativeId } = useCooperative();
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchMembers = async (searchTerm = '') => {
    setIsLoading(true);
    setError('');
    try {
      const params = searchTerm ? { search: searchTerm, ...cooperativeScope } : cooperativeScope;
      const { data } = await listMembers(params);
      setMembers(data);
    } catch (err) {
      setError('Could not load members. Is the backend server running?');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [activeCooperativeId]);

  // Debounce search so we're not firing a request on every keystroke
  useEffect(() => {
    const timeout = setTimeout(() => fetchMembers(search), 350);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);
    try {
      await createMember({ ...form, ...cooperativeScope });
      setIsModalOpen(false);
      setForm(emptyForm);
      fetchMembers(search);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not add member. Check the details and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout title={t('common.members')} subtitle={t('modules.membersSubtitle')}>
      <ReportActions moduleName="members" filters={{ ...cooperativeScope, search }} />
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone…"
            className="focus-ring w-full rounded-lg border border-sand bg-white py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-soft/50"
          />
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="focus-ring flex shrink-0 items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-paper hover:bg-forest-light"
        >
          <Plus className="h-4 w-4" />
          Add member
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-ink-soft">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading members…
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-clay">{error}</div>
        ) : members.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-ink-soft">
              {search ? 'No members match your search.' : 'No members yet — add your first one.'}
            </p>
          </div>
        ) : (
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="border-b border-sand bg-sand/30 text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Farmer profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {members.map((member) => (
                <tr key={member.id} className="transition-colors hover:bg-sand/20">
                  <td className="px-5 py-3.5">
                    <Link
                      to={`/members/${member.id}`}
                      className="font-medium text-ink hover:text-forest"
                    >
                      {member.first_name} {member.last_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-ink-soft">{member.phone || '—'}</td>
                  <td className="px-5 py-3.5">
                    <Badge status={member.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    {member.farmerProfile ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gold-dark">
                        <Sprout className="h-3.5 w-3.5" />
                        {member.farmerProfile.crop_type || 'Farmer'}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-soft/60">Not a farmer</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal title="Add member" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleCreate}>
          {formError && (
            <div className="mb-4 rounded-lg bg-clay/10 px-3.5 py-2.5 text-sm text-clay">
              {formError}
            </div>
          )}

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                First name
              </label>
              <input
                required
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Last name
              </label>
              <input
                required
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              Gender
            </label>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
            >
              <option value="">Not specified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              Phone
            </label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="07XX XXX XXX"
              className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
            />
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              Membership date
            </label>
            <input
              type="date"
              value={form.membership_date}
              onChange={(e) => setForm({ ...form, membership_date: e.target.value })}
              className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? 'Adding…' : 'Add member'}
          </button>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default MembersPage;
