import { useEffect, useState } from 'react';
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import Modal from '../components/Modal';
import { listProduction, createProduction, updateProduction, deleteProduction } from '../api/production';
import { listFarmers } from '../api/farmers';
import { useAuth } from '../context/AuthContext';
import { useCooperative } from '../context/CooperativeContext';

const emptyForm = {
  farmer_id: '',
  product_name: '',
  quantity: '',
  unit: 'kg',
  unit_price: '',
  production_date: '',
  season: '',
};

const ProductionPage = () => {
  const { user } = useAuth();
  const { cooperativeScope, activeCooperativeId } = useCooperative();
  const [records, setRecords] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null); // null = creating; object = editing this record
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [productionRes, farmersRes] = await Promise.all([
        listProduction(cooperativeScope),
        listFarmers(cooperativeScope),
      ]);
      setRecords(productionRes.data);
      setFarmers(farmersRes);
    } catch (err) {
      setError('Could not load production records. Is the backend server running?');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeCooperativeId]);

  const liveTotal =
    form.quantity && form.unit_price
      ? (parseFloat(form.quantity) * parseFloat(form.unit_price)).toLocaleString('en-RW')
      : null;

  const openCreateModal = () => {
    setEditingRecord(null);
    setForm(emptyForm);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setForm({
      farmer_id: record.farmer_id,
      product_name: record.product_name || '',
      quantity: record.quantity || '',
      unit: record.unit || 'kg',
      unit_price: record.unit_price || '',
      production_date: record.production_date || '',
      season: record.season || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);
    try {
      if (editingRecord) {
        const { farmer_id, ...updatable } = form;
        await updateProduction(editingRecord.id, updatable);
      } else {
        await createProduction(form);
      }
      setIsModalOpen(false);
      setForm(emptyForm);
      fetchData();
    } catch (err) {
      setFormError(
        err.response?.data?.message || 'Could not save this record. Check the details and try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (record) => {
    if (!window.confirm('Delete this production record? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await deleteProduction(record.id);
      fetchData();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Could not delete this record.');
    } finally {
      setIsDeleting(false);
    }
  };


  return (
    <DashboardLayout title="Production" subtitle="Harvest records across your cooperative.">
      <div className="mb-5 flex items-center justify-end">
        <button
          onClick={openCreateModal}
          disabled={farmers.length === 0}
          className="focus-ring flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-paper hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-50"
          title={farmers.length === 0 ? 'Add a farmer profile first' : ''}
        >
          <Plus className="h-4 w-4" />
          Record harvest
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-ink-soft">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading production records…
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-clay">{error}</div>
        ) : records.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-ink-soft">
              {farmers.length === 0
                ? 'Add a farmer profile first, then come back to record a harvest.'
                : 'No harvests recorded yet — add the first one.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-sand bg-sand/30 text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-5 py-3 font-medium">Farmer</th>
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Quantity</th>
                <th className="px-5 py-3 font-medium">Unit price</th>
                <th className="px-5 py-3 font-medium">Total value</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {records.map((record) => (
                <tr key={record.id} className="transition-colors hover:bg-sand/20">
                  <td className="px-5 py-3.5 font-medium text-ink">
                    {record.farmer?.member
                      ? `${record.farmer.member.first_name} ${record.farmer.member.last_name}`
                      : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-ink-soft">{record.product_name}</td>
                  <td className="figure px-5 py-3.5 text-ink-soft">
                    {record.quantity} {record.unit}
                  </td>
                  <td className="figure px-5 py-3.5 text-ink-soft">
                    {Number(record.unit_price).toLocaleString('en-RW')} RWF
                  </td>
                  <td className="figure px-5 py-3.5 font-medium text-gold-dark">
                    {Number(record.total_amount).toLocaleString('en-RW')} RWF
                  </td>
                  <td className="px-5 py-3.5 text-ink-soft">{record.production_date}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(record)}
                        title="Edit"
                        className="focus-ring rounded-lg border border-sand p-1.5 text-ink-soft hover:bg-sand/30 hover:text-ink"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(record)}
                        disabled={isDeleting}
                        title="Delete"
                        className="focus-ring rounded-lg border border-sand p-1.5 text-ink-soft hover:bg-clay/10 hover:text-clay disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        title={editingRecord ? 'Edit harvest record' : 'Record harvest'}
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
              Farmer
            </label>
            <select
              required
              value={form.farmer_id}
              onChange={(e) => setForm({ ...form, farmer_id: e.target.value })}
              disabled={!!editingRecord}
              className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm disabled:bg-sand/30 disabled:text-ink-soft"
            >
              <option value="">Select a farmer…</option>
              {farmers.map((farmer) => (
                <option key={farmer.id} value={farmer.id}>
                  {farmer.member.first_name} {farmer.member.last_name}
                  {farmer.crop_type ? ` — ${farmer.crop_type}` : ''}
                </option>
              ))}
            </select>
            {editingRecord && (
              <p className="mt-1 text-xs text-ink-soft">
                Farmer can't be changed after creation — delete and re-add if needed.
              </p>
            )}
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Product
              </label>
              <input
                required
                value={form.product_name}
                onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                placeholder="e.g. Coffee"
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Unit
              </label>
              <input
                required
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="kg"
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Quantity
              </label>
              <input
                required
                type="number"
                step="0.01"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Unit price (RWF)
              </label>
              <input
                required
                type="number"
                step="0.01"
                value={form.unit_price}
                onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
            </div>
          </div>

          {liveTotal && (
            <div className="mb-4 rounded-lg bg-gold/10 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                Calculated total value
              </p>
              <p className="figure text-lg font-semibold text-gold-dark">{liveTotal} RWF</p>
            </div>
          )}

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Date
              </label>
              <input
                required
                type="date"
                value={form.production_date}
                onChange={(e) => setForm({ ...form, production_date: e.target.value })}
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Season (optional)
              </label>
              <input
                value={form.season}
                onChange={(e) => setForm({ ...form, season: e.target.value })}
                placeholder="e.g. 2026A"
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
            {isSaving ? 'Saving…' : editingRecord ? 'Save changes' : 'Save harvest record'}
          </button>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default ProductionPage;
