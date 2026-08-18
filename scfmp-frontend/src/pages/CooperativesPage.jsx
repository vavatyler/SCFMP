import { useRef, useState } from 'react';
import { Building2, Eye, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../components/DashboardLayout';
import Modal from '../components/Modal';
import RwandaLocationFields from '../components/RwandaLocationFields';
import RwandaPhoneInput from '../components/RwandaPhoneInput';
import {
  createCooperative,
  deleteCooperative,
  updateCooperative,
} from '../api/cooperatives';
import { useAuth } from '../context/AuthContext';
import { useCooperative } from '../context/CooperativeContext';
import {
  buildOrganizationPayload,
  createEmptyOrganizationForm,
  ORGANIZATION_TYPES,
  organizationToForm,
} from '../utils/organizationForm';
import { hasAnyLocation, hasCompleteLocation, hasLocationChanged } from '../utils/locationHierarchy';
import { isValidEmail, isValidRwandaLocalPhone } from '../utils/validation';

const CooperativesPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    cooperatives,
    isLoading,
    isSuperAdmin,
    refetchCooperatives,
    activeCooperativeId,
    setActiveCooperativeId,
  } = useCooperative();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingOrganization, setViewingOrganization] = useState(null);
  const [editingOrganization, setEditingOrganization] = useState(null);
  const [form, setForm] = useState(createEmptyOrganizationForm);
  const [formError, setFormError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const submitLockRef = useRef(false);

  const canCreateOrganization = isSuperAdmin;
  const canEditOrganization = isSuperAdmin || user?.role === 'cooperative_manager';
  const canDeleteOrganization = isSuperAdmin;
  const canSwitchOrganization = isSuperAdmin;
  const organizationTypeLabel = (type) => {
    const storedType = type || 'cooperative';
    return ORGANIZATION_TYPES.includes(storedType) ? t(`organizationTypes.${storedType}`) : storedType;
  };

  const openCreateModal = () => {
    if (!canCreateOrganization) return;
    setEditingOrganization(null);
    setForm(createEmptyOrganizationForm());
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (organization) => {
    if (!canEditOrganization) return;
    setEditingOrganization(organization);
    setForm(organizationToForm(organization));
    setFormError('');
    setIsModalOpen(true);
  };

  const validateForm = () => {
    if (!form.name.trim()) return t('organizations.validation.nameRequired');
    if (!ORGANIZATION_TYPES.includes(form.organization_type)) return t('organizations.validation.invalid');
    const locationChanged = !editingOrganization || hasLocationChanged(form, editingOrganization);
    if (locationChanged && hasAnyLocation(form) && !hasCompleteLocation(form)) {
      return t('locations.incomplete');
    }
    if (form.phone && !isValidRwandaLocalPhone(form.phone)) return t('validation.phoneInvalid');
    const email = form.email.trim();
    const emailChanged = !editingOrganization
      || email !== String(editingOrganization.email || '').trim();
    if (emailChanged && email && !isValidEmail(email)) return t('validation.emailInvalid');
    return '';
  };

  const closeFormModal = () => {
    if (submitLockRef.current) return;
    setIsModalOpen(false);
    setEditingOrganization(null);
    setForm(createEmptyOrganizationForm());
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitLockRef.current) return;
    setFormError('');
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    submitLockRef.current = true;
    setIsSaving(true);
    try {
      const payload = buildOrganizationPayload(form, editingOrganization);
      if (editingOrganization) {
        await updateCooperative(editingOrganization.id, payload);
        setFeedback(t('organizations.updated'));
      } else {
        const newOrganization = await createCooperative(payload);
        setActiveCooperativeId(newOrganization.id);
        setFeedback(t('organizations.created'));
      }
      setIsModalOpen(false);
      setEditingOrganization(null);
      setForm(createEmptyOrganizationForm());
      await refetchCooperatives();
    } catch (error) {
      setFormError(error.response?.data?.message || (
        error.response?.status === 422
          ? t('organizations.validation.invalid')
          : t('organizations.saveError')
      ));
    } finally {
      submitLockRef.current = false;
      setIsSaving(false);
    }
  };

  const handleDelete = async (organization) => {
    if (!canDeleteOrganization) return;
    if (!window.confirm(t('organizations.deleteConfirm', { name: organization.name }))) return;
    setDeletingId(organization.id);
    setFeedback('');
    try {
      await deleteCooperative(organization.id);
      await refetchCooperatives();
      setFeedback(t('organizations.deleted'));
    } catch (error) {
      window.alert(error.response?.status === 409 ? t('organizations.deleteBlocked') : t('organizations.deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  const email = form.email.trim();
  const emailState = email ? isValidEmail(email) ? 'valid' : 'invalid' : 'empty';

  return (
    <DashboardLayout title={t('common.organizations')} subtitle={t('organizations.subtitle')}>
      {feedback && (
        <div className="mb-5 rounded-lg border border-forest/20 bg-forest/5 px-4 py-3 text-sm text-forest" role="status">
          {feedback}
        </div>
      )}

      {canCreateOrganization && (
        <div className="mb-5 flex items-center justify-end">
          <button onClick={openCreateModal} className="focus-ring flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-paper hover:bg-forest-light">
            <Plus className="h-4 w-4" />
            {t('organizations.add')}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl bg-white shadow-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-ink-soft">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {t('organizations.loading')}
          </div>
        ) : cooperatives.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-soft">{t('organizations.empty')}</div>
        ) : (
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="border-b border-sand bg-sand/30 text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-5 py-3 font-medium">{t('organizations.fields.name')}</th>
                <th className="px-5 py-3 font-medium">{t('organizations.fields.type')}</th>
                <th className="px-5 py-3 font-medium">{t('locations.district')}</th>
                <th className="px-5 py-3 font-medium">{t('organizations.fields.phone')}</th>
                <th className="px-5 py-3 font-medium">{t('common.status')}</th>
                <th className="px-5 py-3 font-medium text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {cooperatives.map((organization) => (
                <tr key={organization.id} className="transition-colors hover:bg-sand/20">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 shrink-0 text-ink-soft" />
                      <span className="font-medium text-ink">{organization.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-ink-soft">{organizationTypeLabel(organization.organization_type)}</td>
                  <td className="px-5 py-3.5 text-ink-soft">{organization.district || '—'}</td>
                  <td className="px-5 py-3.5 text-ink-soft">{organization.phone || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center rounded-full bg-forest/10 px-2.5 py-0.5 text-xs font-medium capitalize text-forest">{organization.status}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setViewingOrganization(organization)} title={t('common.view')} className="focus-ring rounded-lg border border-sand p-1.5 text-ink-soft hover:bg-sand/30 hover:text-ink">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      {canEditOrganization && (
                        <button onClick={() => openEditModal(organization)} title={t('common.edit')} className="focus-ring rounded-lg border border-sand p-1.5 text-ink-soft hover:bg-sand/30 hover:text-ink">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canDeleteOrganization && (
                        <button onClick={() => handleDelete(organization)} disabled={deletingId === organization.id} title={t('common.delete')} className="focus-ring rounded-lg border border-sand p-1.5 text-clay hover:bg-clay/5 disabled:opacity-50">
                          {deletingId === organization.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      {organization.id === activeCooperativeId ? (
                        <span className="text-xs font-medium text-forest">{t('organizations.current')}</span>
                      ) : canSwitchOrganization ? (
                        <button onClick={() => setActiveCooperativeId(organization.id)} className="focus-ring rounded-lg border border-sand px-3 py-1.5 text-xs font-medium text-forest hover:bg-forest/5">
                          {t('organizations.switch')}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal title={editingOrganization ? t('organizations.edit') : t('organizations.add')} isOpen={isModalOpen} onClose={closeFormModal}>
        <form onSubmit={handleSubmit} noValidate>
          {formError && <div className="mb-4 rounded-lg bg-clay/10 px-3.5 py-2.5 text-sm text-clay" role="alert">{formError}</div>}

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="organization-type" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('organizations.fields.type')}</label>
              <select id="organization-type" required value={form.organization_type} onChange={(event) => setForm({ ...form, organization_type: event.target.value })} className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm">
                {ORGANIZATION_TYPES.map((type) => <option key={type} value={type}>{t(`organizationTypes.${type}`)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="organization-name" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('organizations.fields.name')}</label>
              <input id="organization-name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={t('organizations.placeholders.name')} className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="registration-number" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('organizations.fields.registrationNumber')}</label>
            <input id="registration-number" value={form.registration_number} onChange={(event) => setForm({ ...form, registration_number: event.target.value })} placeholder={t('common.optional')} className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm" />
          </div>

          <div className="mb-4">
            <RwandaLocationFields
              idPrefix="organization-location"
              value={form}
              onChange={setForm}
              disabled={isSaving}
            />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="organization-phone" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('organizations.fields.phone')}</label>
              <RwandaPhoneInput
                id="organization-phone"
                value={form.phone}
                onChange={(phone) => setForm({ ...form, phone })}
                disabled={isSaving}
              />
            </div>
            <div>
              <label htmlFor="organization-email" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('organizations.fields.email')}</label>
              <input
                id="organization-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder={t('organizations.placeholders.email')}
                aria-invalid={emailState === 'invalid'}
                aria-describedby={emailState === 'empty' ? undefined : 'organization-email-feedback'}
                className={`focus-ring w-full rounded-lg border px-3 py-2 text-sm ${
                  emailState === 'valid'
                    ? 'border-forest'
                    : emailState === 'invalid'
                      ? 'border-clay'
                      : 'border-sand'
                }`}
              />
              {emailState !== 'empty' && (
                <p
                  id="organization-email-feedback"
                  className={`mt-1 text-xs ${emailState === 'valid' ? 'text-forest' : 'text-clay'}`}
                >
                  {emailState === 'valid' ? t('validation.emailValid') : t('validation.emailInvalid')}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={closeFormModal} disabled={isSaving} className="focus-ring rounded-lg border border-sand px-4 py-2.5 text-sm font-medium text-ink hover:bg-sand/30 disabled:opacity-60">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={isSaving} className="focus-ring flex items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSaving ? t('common.saving') : editingOrganization ? t('organizations.saveChanges') : t('organizations.create')}
            </button>
          </div>
        </form>
      </Modal>

      <Modal title={t('organizations.details')} isOpen={Boolean(viewingOrganization)} onClose={() => setViewingOrganization(null)}>
        {viewingOrganization && (
          <dl className="space-y-3 text-sm">
            {[
              [t('organizations.fields.name'), viewingOrganization.name],
              [t('organizations.fields.type'), organizationTypeLabel(viewingOrganization.organization_type)],
              [t('organizations.fields.registrationNumber'), viewingOrganization.registration_number],
              [t('locations.district'), viewingOrganization.district],
              [t('locations.sector'), viewingOrganization.sector],
              [t('locations.cell'), viewingOrganization.cell],
              [t('organizations.fields.phone'), viewingOrganization.phone],
              [t('organizations.fields.email'), viewingOrganization.email],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-sand pb-3 last:border-0">
                <dt className="text-ink-soft">{label}</dt>
                <dd className="text-right text-ink">{value || '—'}</dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>
    </DashboardLayout>
  );
};

export default CooperativesPage;
