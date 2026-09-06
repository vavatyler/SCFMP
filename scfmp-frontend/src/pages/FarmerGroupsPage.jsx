import { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2, UsersRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../components/DashboardLayout';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import { useCooperative } from '../context/CooperativeContext';
import {
  createFarmerGroup,
  deleteFarmerGroup,
  listFarmerGroups,
  updateFarmerGroup,
} from '../api/farmerGroups';
import { PERMISSIONS } from '../config/permissions';

const emptyForm = { name: '', location: '', status: 'active' };

const FarmerGroupsPage = () => {
  const { t } = useTranslation();
  const { user, can } = useAuth();
  const { cooperativeScope, activeCooperativeId, isSuperAdmin } = useCooperative();
  const canManage = can(PERMISSIONS.FARMERS_MANAGE)
    && ['super_admin', 'cooperative_manager', 'field_officer'].includes(user?.role);
  const canDelete = can(PERMISSIONS.FARMERS_MANAGE)
    && ['super_admin', 'cooperative_manager'].includes(user?.role);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setGroups(await listFarmerGroups({ ...cooperativeScope, status: '' }));
    } catch {
      setError(t('farmerGroups.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [cooperativeScope, t]);

  useEffect(() => { load(); }, [activeCooperativeId, load]);

  const openForm = (group = null) => {
    setEditing(group);
    setForm(group ? { name: group.name, location: group.location || '', status: group.status } : { ...emptyForm });
    setFormError('');
  };

  const save = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setFormError('');
    try {
      const payload = { ...form, ...(isSuperAdmin ? cooperativeScope : {}) };
      if (editing) await updateFarmerGroup(editing.id, payload);
      else await createFarmerGroup(payload);
      setEditing(null);
      setForm(emptyForm);
      await load();
    } catch (requestError) {
      setFormError(requestError.response?.data?.message || t('farmerGroups.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (group) => {
    if (!window.confirm(t('farmerGroups.deleteConfirm', { name: group.name }))) return;
    try {
      await deleteFarmerGroup(group.id);
      await load();
    } catch (requestError) {
      window.alert(requestError.response?.data?.message || t('farmerGroups.deleteError'));
    }
  };

  const modalOpen = Boolean(editing) || form !== emptyForm;

  return (
    <DashboardLayout title={t('farmerGroups.title')} subtitle={t('farmerGroups.subtitle')}>
      {canManage && (
        <div className="mb-5 flex justify-end">
          <button
            onClick={() => openForm()}
            disabled={!activeCooperativeId}
            className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg bg-forest px-4 text-sm font-medium text-paper disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> {t('farmerGroups.add')}
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-xl bg-white shadow-card">
        {isLoading ? (
          <div className="flex min-h-40 items-center justify-center text-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('common.loading')}</div>
        ) : error ? (
          <div className="p-6 text-sm text-clay" role="alert">{error}</div>
        ) : groups.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-soft"><UsersRound className="mx-auto mb-3 h-8 w-8" />{t('farmerGroups.empty')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-sand bg-sand/30 text-xs uppercase tracking-wide text-ink-soft">
                <tr><th className="px-5 py-3">{t('farmerGroups.name')}</th><th className="px-5 py-3">{t('farmerGroups.location')}</th><th className="px-5 py-3">{t('common.status')}</th><th className="px-5 py-3"><span className="sr-only">{t('common.actions')}</span></th></tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {groups.map((group) => (
                  <tr key={group.id}>
                    <td className="px-5 py-3.5 font-medium text-ink">{group.name}</td>
                    <td className="px-5 py-3.5 text-ink-soft">{group.location || '—'}</td>
                    <td className="px-5 py-3.5"><Badge status={group.status}>{t(`common.${group.status}`)}</Badge></td>
                    <td className="px-5 py-3.5"><div className="flex justify-end gap-2">
                      {canManage && <button onClick={() => openForm(group)} aria-label={t('common.edit')} className="focus-ring rounded-lg border border-sand p-2 text-ink-soft"><Pencil className="h-4 w-4" /></button>}
                      {canDelete && <button onClick={() => remove(group)} aria-label={t('common.delete')} className="focus-ring rounded-lg border border-sand p-2 text-clay"><Trash2 className="h-4 w-4" /></button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal title={editing ? t('farmerGroups.edit') : t('farmerGroups.add')} isOpen={modalOpen} onClose={() => { setEditing(null); setForm(emptyForm); }}>
        <form onSubmit={save} className="space-y-4">
          {formError && <div className="rounded-lg bg-clay/10 p-3 text-sm text-clay" role="alert">{formError}</div>}
          <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('farmerGroups.name')}<input required maxLength={150} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label>
          <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('farmerGroups.location')}<input maxLength={255} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label>
          <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('common.status')}<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm"><option value="active">{t('common.active')}</option><option value="inactive">{t('common.inactive')}</option></select></label>
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => { setEditing(null); setForm(emptyForm); }} className="focus-ring min-h-11 rounded-lg border border-sand px-4 text-sm">{t('common.cancel')}</button><button disabled={isSaving} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-forest px-4 text-sm font-medium text-paper disabled:opacity-50">{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}{t('common.save')}</button></div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default FarmerGroupsPage;
