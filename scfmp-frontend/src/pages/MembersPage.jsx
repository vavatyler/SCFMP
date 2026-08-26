import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Plus, Search, Sprout } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Badge from '../components/Badge';
import DashboardLayout from '../components/DashboardLayout';
import MemberFormFields from '../components/MemberFormFields';
import Modal from '../components/Modal';
import ReportActions from '../components/ReportActions';
import { createMember, listMembers } from '../api/members';
import { useAuth } from '../context/AuthContext';
import { useCooperative } from '../context/CooperativeContext';
import { hasAnyLocation, hasCompleteLocation } from '../utils/locationHierarchy';
import {
  buildMemberPayload,
  createEmptyMemberForm,
  getMemberAddressLocation,
  MEMBER_WRITE_ROLES,
} from '../utils/memberForm';
import { isValidRwandaLocalPhone, isValidRwandaNationalId } from '../utils/validation';

const MembersPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { cooperativeScope, activeCooperativeId } = useCooperative();
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(createEmptyMemberForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const submitLockRef = useRef(false);

  const canCreateMember = MEMBER_WRITE_ROLES.includes(user?.role)
    && (user?.role !== 'super_admin' || Boolean(activeCooperativeId));

  const fetchMembers = async (searchTerm = '') => {
    setIsLoading(true);
    setError('');
    try {
      const params = searchTerm ? { search: searchTerm, ...cooperativeScope } : cooperativeScope;
      const { data } = await listMembers(params);
      setMembers(data);
    } catch {
      setError(t('members.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [activeCooperativeId, t]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchMembers(search), 350);
    return () => clearTimeout(timeout);
  }, [search]);

  const openCreateModal = () => {
    if (!canCreateMember) return;
    setForm(createEmptyMemberForm());
    setFieldErrors({});
    setFormError('');
    setIsModalOpen(true);
  };

  const closeCreateModal = () => {
    if (submitLockRef.current) return;
    setIsModalOpen(false);
    setForm(createEmptyMemberForm());
    setFieldErrors({});
    setFormError('');
  };

  const updateForm = (nextForm, field) => {
    setForm(nextForm);
    if (fieldErrors[field]) setFieldErrors((current) => ({ ...current, [field]: '' }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (submitLockRef.current || !canCreateMember) return;
    setFormError('');
    const nextFieldErrors = {};
    if (!form.first_name.trim()) nextFieldErrors.first_name = t('members.validation.firstNameRequired');
    if (!form.last_name.trim()) nextFieldErrors.last_name = t('members.validation.lastNameRequired');
    if (form.national_id.trim() && !isValidRwandaNationalId(form.national_id)) {
      nextFieldErrors.national_id = t('members.validation.nationalIdInvalid');
    }
    const addressLocation = getMemberAddressLocation(form);
    if (
      hasAnyLocation(addressLocation, { includeVillage: true })
      && !hasCompleteLocation(addressLocation, { includeVillage: true })
    ) {
      nextFieldErrors.address_location = t('locations.memberIncomplete');
    }
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      return;
    }
    if (form.phone && !isValidRwandaLocalPhone(form.phone)) {
      setFormError(t('validation.phoneInvalid'));
      return;
    }

    submitLockRef.current = true;
    setIsSaving(true);
    try {
      await createMember({
        ...buildMemberPayload(form),
        ...cooperativeScope,
      });
      setIsModalOpen(false);
      setForm(createEmptyMemberForm());
      setFieldErrors({});
      setFeedback(t('members.created'));
      await fetchMembers(search);
    } catch {
      setFormError(t('members.createError'));
    } finally {
      submitLockRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout title={t('common.members')} subtitle={t('modules.membersSubtitle')}>
      {feedback && (
        <div className="mb-5 rounded-lg border border-forest/20 bg-forest/5 px-4 py-3 text-sm text-forest" role="status">
          {feedback}
        </div>
      )}
      <ReportActions moduleName="members" filters={{ ...cooperativeScope, search }} />
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('members.searchPlaceholder')} className="focus-ring w-full rounded-lg border border-sand bg-white py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-soft/50" />
        </div>
        {canCreateMember && (
          <button type="button" onClick={openCreateModal} className="focus-ring flex shrink-0 items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-paper hover:bg-forest-light">
            <Plus className="h-4 w-4" />
            {t('members.add')}
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('members.loading')}</div>
        ) : error ? (
          <div className="p-6 text-sm text-clay">{error}</div>
        ) : members.length === 0 ? (
          <div className="p-10 text-center"><p className="text-sm text-ink-soft">{search ? t('members.noSearchResults') : t('members.empty')}</p></div>
        ) : (
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="border-b border-sand bg-sand/30 text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-5 py-3 font-medium">{t('members.fields.name')}</th>
                <th className="px-5 py-3 font-medium">{t('members.fields.nationalId')}</th>
                <th className="px-5 py-3 font-medium">{t('members.fields.phone')}</th>
                <th className="px-5 py-3 font-medium">{t('common.status')}</th>
                <th className="px-5 py-3 font-medium">{t('members.farmerProfile')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {members.map((member) => (
                <tr key={member.id} className="transition-colors hover:bg-sand/20">
                  <td className="px-5 py-3.5"><Link to={`/members/${member.id}`} className="font-medium text-ink hover:text-forest">{member.first_name} {member.last_name}</Link></td>
                  <td className="figure px-5 py-3.5 text-ink-soft">{member.national_id || '—'}</td>
                  <td className="px-5 py-3.5 text-ink-soft">{member.phone || '—'}</td>
                  <td className="px-5 py-3.5"><Badge status={member.status} /></td>
                  <td className="px-5 py-3.5">
                    {member.farmerProfile ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gold-dark"><Sprout className="h-3.5 w-3.5" />{member.farmerProfile.crop_type || t('common.farmer')}</span>
                    ) : <span className="text-xs text-ink-soft/60">{t('members.notFarmer')}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal title={t('members.add')} isOpen={isModalOpen} onClose={closeCreateModal}>
        <form onSubmit={handleCreate} noValidate>
          {formError && <div className="mb-4 rounded-lg bg-clay/10 px-3.5 py-2.5 text-sm text-clay" role="alert">{formError}</div>}
          <MemberFormFields idPrefix="member-create" form={form} onChange={updateForm} errors={fieldErrors} disabled={isSaving} />
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={closeCreateModal} disabled={isSaving} className="focus-ring rounded-lg border border-sand px-4 py-2.5 text-sm font-medium text-ink hover:bg-sand/30 disabled:opacity-60">{t('common.cancel')}</button>
            <button type="submit" disabled={isSaving} className="focus-ring flex items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}{isSaving ? t('members.adding') : t('members.add')}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default MembersPage;
