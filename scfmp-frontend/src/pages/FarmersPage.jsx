import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MapPin, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../components/DashboardLayout';
import FarmSizeFields from '../components/FarmSizeFields';
import Modal from '../components/Modal';
import ReportActions from '../components/ReportActions';
import RwandaLocationFields from '../components/RwandaLocationFields';
import {
  createFarmer,
  listEligibleFarmerMembers,
  listFarmers,
} from '../api/farmers';
import { useAuth } from '../context/AuthContext';
import { useCooperative } from '../context/CooperativeContext';
import {
  buildFarmerPayload,
  createEmptyFarmerForm,
  FARMER_WRITE_ROLES,
  getFarmSizeDisplay,
  getFarmerLocationDisplay,
  isValidFarmSize,
  isValidFarmSizeUnit,
} from '../utils/farmerForm';
import { hasAnyLocation, hasCompleteLocation } from '../utils/locationHierarchy';

const FarmersPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { cooperativeScope, activeCooperativeId } = useCooperative();
  const [farmers, setFarmers] = useState([]);
  const [eligibleMembers, setEligibleMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [farmerForm, setFarmerForm] = useState(createEmptyFarmerForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const submitLockRef = useRef(false);

  const canCreateFarmer = FARMER_WRITE_ROLES.includes(user?.role)
    && (user?.role !== 'super_admin' || Boolean(activeCooperativeId));

  const fetchPageData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [farmerRows, memberRows] = await Promise.all([
        listFarmers(cooperativeScope),
        canCreateFarmer ? listEligibleFarmerMembers(cooperativeScope) : Promise.resolve([]),
      ]);
      setFarmers(farmerRows);
      setEligibleMembers(memberRows);
    } catch {
      setError(t('farmers.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, [activeCooperativeId, t, user?.role]);

  useEffect(() => {
    setIsModalOpen(false);
    setSelectedMemberId('');
    setFarmerForm(createEmptyFarmerForm());
    setFieldErrors({});
    setFormError('');
  }, [activeCooperativeId]);

  const openCreateModal = () => {
    if (!canCreateFarmer) return;
    setSelectedMemberId('');
    setFarmerForm(createEmptyFarmerForm());
    setFieldErrors({});
    setFormError('');
    setIsModalOpen(true);
  };

  const closeCreateModal = () => {
    if (submitLockRef.current) return;
    setIsModalOpen(false);
    setSelectedMemberId('');
    setFarmerForm(createEmptyFarmerForm());
    setFieldErrors({});
    setFormError('');
  };

  const handleCreateFarmer = async (event) => {
    event.preventDefault();
    if (submitLockRef.current || !canCreateFarmer) return;

    const nextFieldErrors = {};
    if (!selectedMemberId) nextFieldErrors.member_id = t('farmers.validation.memberRequired');
    if (!isValidFarmSize(farmerForm.farm_size)) {
      nextFieldErrors.farm_size = t('farmers.validation.farmSizeInvalid');
    }
    if (farmerForm.farm_size && !isValidFarmSizeUnit(farmerForm.farm_size_unit)) {
      nextFieldErrors.farm_size_unit = t('farmers.validation.farmSizeUnitRequired');
    }
    setFieldErrors(nextFieldErrors);
    setFormError('');
    if (Object.keys(nextFieldErrors).length > 0) return;

    const hasAnyStructuredLocation = hasAnyLocation(farmerForm, { includeVillage: true });
    const hasCompleteStructuredLocation = hasCompleteLocation(farmerForm, { includeVillage: true });
    if (hasAnyStructuredLocation && !hasCompleteStructuredLocation) {
      setFormError(t('locations.farmerIncomplete'));
      return;
    }

    submitLockRef.current = true;
    setIsSaving(true);
    try {
      await createFarmer({
        ...buildFarmerPayload(farmerForm),
        member_id: Number(selectedMemberId),
      });
      setIsModalOpen(false);
      setSelectedMemberId('');
      setFarmerForm(createEmptyFarmerForm());
      setFieldErrors({});
      setFeedback(t('farmers.created'));
      await fetchPageData();
    } catch (requestError) {
      if (requestError.response?.status === 409) {
        setFormError(t('farmers.validation.alreadyExists'));
      } else if (requestError.response?.status === 422) {
        setFormError(t('farmers.validation.invalid'));
      } else {
        setFormError(t('farmers.saveError'));
      }
    } finally {
      submitLockRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout title={t('common.farmers')} subtitle={t('modules.farmersSubtitle')}>
      {feedback && (
        <div className="mb-5 rounded-lg border border-forest/20 bg-forest/5 px-4 py-3 text-sm text-forest" role="status">
          {feedback}
        </div>
      )}
      <ReportActions moduleName="farmers" filters={cooperativeScope} />
      {canCreateFarmer && (
        <div className="mb-5 flex justify-end">
          <button type="button" onClick={openCreateModal} className="focus-ring flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-paper hover:bg-forest-light">
            <Plus className="h-4 w-4" />
            {t('farmers.addProfile')}
          </button>
        </div>
      )}
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
                  <td className="figure px-5 py-3.5 text-ink-soft">{getFarmSizeDisplay(farmer) || '—'}</td>
                  <td className="px-5 py-3.5 text-ink-soft">{locationDisplay ? <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{locationDisplay}</span> : '—'}</td>
                </tr>;
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal title={t('farmers.addProfile')} isOpen={isModalOpen} onClose={closeCreateModal}>
        <form onSubmit={handleCreateFarmer} noValidate>
          {formError && <div className="mb-4 rounded-lg bg-clay/10 px-3.5 py-2.5 text-sm text-clay" role="alert">{formError}</div>}

          <div className="mb-4">
            <label htmlFor="farmer-member" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('farmers.fields.member')}</label>
            <select
              id="farmer-member"
              required
              disabled={isSaving || eligibleMembers.length === 0}
              value={selectedMemberId}
              onChange={(event) => {
                setSelectedMemberId(event.target.value);
                if (fieldErrors.member_id) setFieldErrors((current) => ({ ...current, member_id: '' }));
              }}
              aria-invalid={Boolean(fieldErrors.member_id)}
              aria-describedby={fieldErrors.member_id ? 'farmer-member-error' : undefined}
              className={`focus-ring w-full rounded-lg border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-sand/30 ${fieldErrors.member_id ? 'border-clay' : 'border-sand'}`}
            >
              <option value="">{t('farmers.selectMember')}</option>
              {eligibleMembers.map((member) => (
                <option key={member.id} value={member.id}>{member.first_name} {member.last_name}</option>
              ))}
            </select>
            {fieldErrors.member_id && <p id="farmer-member-error" className="mt-1 text-xs text-clay">{fieldErrors.member_id}</p>}
            {eligibleMembers.length === 0 && (
              <p className="mt-2 text-xs text-ink-soft">
                {t('farmers.noEligibleMembers')} <Link to="/members" className="font-medium text-forest hover:text-forest-light">{t('farmers.viewMembers')}</Link>
              </p>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="farmer-create-crop" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('farmers.fields.cropType')}</label>
            <input id="farmer-create-crop" maxLength={100} disabled={isSaving} value={farmerForm.crop_type} onChange={(event) => setFarmerForm({ ...farmerForm, crop_type: event.target.value })} placeholder={t('farmers.placeholders.cropType')} className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-sand/30" />
          </div>

          <FarmSizeFields
            idPrefix="farmer-create"
            form={farmerForm}
            onChange={(nextForm, field) => {
              setFarmerForm(nextForm);
              if (fieldErrors[field]) setFieldErrors((current) => ({ ...current, [field]: '' }));
            }}
            errors={fieldErrors}
            disabled={isSaving}
          />

          <div className="mb-5">
            <RwandaLocationFields idPrefix="farmer-create-location" value={farmerForm} onChange={setFarmerForm} includeVillage disabled={isSaving} />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={closeCreateModal} disabled={isSaving} className="focus-ring rounded-lg border border-sand px-4 py-2.5 text-sm font-medium text-ink hover:bg-sand/30 disabled:opacity-60">{t('common.cancel')}</button>
            <button type="submit" disabled={isSaving || eligibleMembers.length === 0} className="focus-ring flex items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}{isSaving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default FarmersPage;
