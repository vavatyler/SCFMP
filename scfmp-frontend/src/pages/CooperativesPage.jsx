import { useState } from 'react';
import { Plus, Loader2, Building2, Pencil } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import Modal from '../components/Modal';
import { createCooperative, updateCooperative } from '../api/cooperatives';
import { useCooperative } from '../context/CooperativeContext';
import { useTranslation } from 'react-i18next';

const emptyForm = {
  name: '',
  registration_number: '',
  district: '',
  sector: '',
  cell: '',
  village: '',
  phone: '',
  email: '',
};

const CooperativesPage = () => {
  const { t } = useTranslation();
  const { cooperatives, isLoading, refetchCooperatives, activeCooperativeId, setActiveCooperativeId } =
    useCooperative();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoop, setEditingCoop] = useState(null); // null = creating; object = editing this one
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const openCreateModal = () => {
    setEditingCoop(null);
    setForm(emptyForm);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (coop) => {
    setEditingCoop(coop);
    setForm({
      name: coop.name || '',
      registration_number: coop.registration_number || '',
      district: coop.district || '',
      sector: coop.sector || '',
      cell: coop.cell || '',
      village: coop.village || '',
      phone: coop.phone || '',
      email: coop.email || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);
    try {
      if (editingCoop) {
        await updateCooperative(editingCoop.id, form);
      } else {
        const newCoop = await createCooperative(form);
        setActiveCooperativeId(newCoop.id);
      }
      setIsModalOpen(false);
      setForm(emptyForm);
      await refetchCooperatives();
    } catch (err) {
      setFormError(
        err.response?.data?.message || `Could not ${editingCoop ? 'update' : 'create'} this cooperative.`
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout title={t('common.cooperatives')} subtitle={t('modules.cooperativesSubtitle')}>
      <div className="mb-5 flex items-center justify-end">
        <button
          onClick={openCreateModal}
          className="focus-ring flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-paper hover:bg-forest-light"
        >
          <Plus className="h-4 w-4" />
          Add cooperative
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-ink-soft">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading cooperatives…
          </div>
        ) : cooperatives.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-soft">
            No cooperatives yet — add your first one to get started.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-sand bg-sand/30 text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">District</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {cooperatives.map((coop) => (
                <tr key={coop.id} className="transition-colors hover:bg-sand/20">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 shrink-0 text-ink-soft" />
                      <span className="font-medium text-ink">{coop.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-ink-soft">{coop.district || '—'}</td>
                  <td className="px-5 py-3.5 text-ink-soft">{coop.phone || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center rounded-full bg-forest/10 px-2.5 py-0.5 text-xs font-medium capitalize text-forest">
                      {coop.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(coop)}
                        title="Edit"
                        className="focus-ring rounded-lg border border-sand p-1.5 text-ink-soft hover:bg-sand/30 hover:text-ink"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {coop.id === activeCooperativeId ? (
                        <span className="text-xs font-medium text-forest">Currently viewing</span>
                      ) : (
                        <button
                          onClick={() => setActiveCooperativeId(coop.id)}
                          className="focus-ring rounded-lg border border-sand px-3 py-1.5 text-xs font-medium text-forest hover:bg-forest/5"
                        >
                          Switch to this cooperative
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        title={editingCoop ? 'Edit cooperative' : 'Add cooperative'}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          {formError && (
            <div className="mb-4 rounded-lg bg-clay/10 px-3.5 py-2.5 text-sm text-clay">
              {formError}
            </div>
          )}

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              Cooperative name
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Gasaka Tea Cooperative"
              className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              Registration number (optional)
            </label>
            <input
              value={form.registration_number}
              onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
              className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
            />
          </div>

          <div className="mb-4 grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                District
              </label>
              <input
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Sector
              </label>
              <input
                value={form.sector}
                onChange={(e) => setForm({ ...form, sector: e.target.value })}
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Cell
              </label>
              <input
                value={form.cell}
                onChange={(e) => setForm({ ...form, cell: e.target.value })}
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3">
            <div>
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
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving…' : editingCoop ? 'Save changes' : 'Create cooperative'}
          </button>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default CooperativesPage;
