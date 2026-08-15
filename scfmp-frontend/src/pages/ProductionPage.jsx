import { useCallback, useEffect, useMemo, useState } from 'react';
import { Filter, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import DashboardLayout from '../components/DashboardLayout';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import StatCard from '../components/StatCard';
import ReportActions from '../components/ReportActions';
import {
  createProduction,
  deleteProduction,
  getProductionAnalytics,
  listProduction,
  listProducts,
  updateProduction,
} from '../api/production';
import { listFarmers } from '../api/farmers';
import { useAuth } from '../context/AuthContext';
import { useCooperative } from '../context/CooperativeContext';

const emptyForm = {
  farmer_id: '', product_id: '', product_name: '', quantity: '', unit: 'kg',
  unit_price: '', production_date: '', season: '', status: 'recorded',
};

const emptyFilters = {
  search: '', farmer_id: '', product_id: '', season: '', status: '', from: '', to: '', page: 1, limit: 20,
};

const cleanParams = (value) => Object.fromEntries(
  Object.entries(value).filter(([, item]) => item !== '' && item != null)
);

const ProductionPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { cooperativeScope, activeCooperativeId } = useCooperative();
  const canManage = ['super_admin', 'cooperative_manager', 'field_officer'].includes(user?.role);
  const canVerify = ['super_admin', 'cooperative_manager'].includes(user?.role);
  const canDelete = ['super_admin', 'cooperative_manager'].includes(user?.role);
  const [records, setRecords] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [products, setProducts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [filters, setFilters] = useState(emptyFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const scopedFilters = useMemo(
    () => cleanParams({ ...cooperativeScope, ...filters }),
    [cooperativeScope, filters]
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const analyticsParams = { ...scopedFilters };
      delete analyticsParams.page;
      delete analyticsParams.limit;
      const [productionRes, farmersRes, productsRes, analyticsRes] = await Promise.all([
        listProduction(scopedFilters),
        listFarmers(cooperativeScope),
        listProducts(cooperativeScope),
        getProductionAnalytics(analyticsParams),
      ]);
      setRecords(productionRes.data);
      setPagination(productionRes.pagination);
      setFarmers(farmersRes);
      setProducts(productsRes);
      setAnalytics(analyticsRes);
    } catch {
      setError(t('production.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [activeCooperativeId, scopedFilters, t]);

  useEffect(() => {
    const timeout = setTimeout(fetchData, filters.search ? 250 : 0);
    return () => clearTimeout(timeout);
  }, [fetchData]);

  useEffect(() => {
    setFilters(emptyFilters);
  }, [activeCooperativeId]);

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  const liveTotal = form.quantity && form.unit_price
    ? Number(form.quantity) * Number(form.unit_price)
    : 0;

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
      product_id: record.product_id || '',
      product_name: '',
      quantity: record.quantity || '',
      unit: record.unit || 'kg',
      unit_price: record.unit_price || '',
      production_date: record.production_date || '',
      season: record.season || '',
      status: record.status || 'recorded',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.product_id && !form.product_name.trim()) {
      setFormError(t('production.selectProduct'));
      return;
    }
    setIsSaving(true);
    setFormError('');
    try {
      const payload = cleanParams(form);
      if (editingRecord) {
        delete payload.farmer_id;
        await updateProduction(editingRecord.id, payload);
      } else {
        await createProduction(payload);
      }
      setIsModalOpen(false);
      await fetchData();
    } catch (requestError) {
      setFormError(requestError.response?.data?.message || t('production.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (record) => {
    if (!window.confirm(t('production.deleteConfirm'))) return;
    setIsDeleting(true);
    try {
      await deleteProduction(record.id);
      await fetchData();
    } catch (requestError) {
      window.alert(requestError.response?.data?.message || t('common.error'));
    } finally {
      setIsDeleting(false);
    }
  };

  const reportFilters = { ...scopedFilters };
  delete reportFilters.page;
  delete reportFilters.limit;

  return (
    <DashboardLayout title={t('common.production')} subtitle={t('production.subtitle')}>
      <ReportActions moduleName="production" filters={reportFilters} />

      {analytics && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label={t('production.totalProduction')} value={analytics.stats.total_quantity} accent="forest" />
            <StatCard label={t('production.totalValue')} value={analytics.stats.total_value} accent="gold" isCurrency />
            <StatCard label={t('production.activeFarmers')} value={analytics.stats.active_farmers} accent="forest" />
            <StatCard label={t('reports.records')} value={analytics.stats.record_count} accent="clay" />
          </div>
          <div className="mb-5 grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl bg-white p-4 shadow-card">
              <h2 className="mb-4 text-sm font-semibold text-ink">{t('production.monthlyTrend')}</h2>
              <div className="h-64" aria-label={t('production.monthlyTrend')}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.monthly_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4dfd3" />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={(value) => Number(value).toLocaleString()} />
                    <Line type="monotone" dataKey="quantity" stroke="#1a4934" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-card">
              <h2 className="mb-4 text-sm font-semibold text-ink">{t('production.byProduct')}</h2>
              <div className="h-64" aria-label={t('production.byProduct')}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.by_product.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4dfd3" />
                    <XAxis type="number" fontSize={11} />
                    <YAxis type="category" dataKey="label" width={82} fontSize={11} />
                    <Tooltip formatter={(value) => Number(value).toLocaleString()} />
                    <Bar dataKey="quantity" fill="#c9982c" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}

      <section className="mb-5 rounded-xl border border-sand bg-white p-4 shadow-sm" aria-label={t('common.filters')}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-medium text-ink"><Filter className="h-4 w-4" /> {t('common.filters')}</h2>
          {canManage && (
            <button
              onClick={openCreateModal}
              disabled={!farmers.length}
              className="focus-ring flex min-h-10 items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> {t('production.recordHarvest')}
            </button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input value={filters.search} onChange={(event) => setFilter('search', event.target.value)} placeholder={`${t('common.search')}…`} className="focus-ring min-h-10 rounded-lg border border-sand px-3 text-sm" />
          <select value={filters.farmer_id} onChange={(event) => setFilter('farmer_id', event.target.value)} className="focus-ring min-h-10 rounded-lg border border-sand px-3 text-sm">
            <option value="">{t('production.farmer')}: {t('common.all')}</option>
            {farmers.map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.member.first_name} {farmer.member.last_name}</option>)}
          </select>
          <select value={filters.product_id} onChange={(event) => setFilter('product_id', event.target.value)} className="focus-ring min-h-10 rounded-lg border border-sand px-3 text-sm">
            <option value="">{t('production.product')}: {t('common.all')}</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
          <input value={filters.season} onChange={(event) => setFilter('season', event.target.value)} placeholder={t('production.season')} className="focus-ring min-h-10 rounded-lg border border-sand px-3 text-sm" />
          <select value={filters.status} onChange={(event) => setFilter('status', event.target.value)} className="focus-ring min-h-10 rounded-lg border border-sand px-3 text-sm">
            <option value="">{t('common.status')}: {t('common.all')}</option>
            {['recorded', 'verified', 'rejected'].map((status) => <option key={status} value={status}>{t(`production.${status}`)}</option>)}
          </select>
          <label className="text-xs text-ink-soft">{t('common.from')}<input type="date" value={filters.from} onChange={(event) => setFilter('from', event.target.value)} className="focus-ring mt-1 block min-h-10 w-full rounded-lg border border-sand px-3 text-sm text-ink" /></label>
          <label className="text-xs text-ink-soft">{t('common.to')}<input type="date" value={filters.to} onChange={(event) => setFilter('to', event.target.value)} className="focus-ring mt-1 block min-h-10 w-full rounded-lg border border-sand px-3 text-sm text-ink" /></label>
        </div>
      </section>

      <div className="overflow-hidden rounded-xl bg-white shadow-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('common.loading')}</div>
        ) : error ? (
          <div className="p-6 text-sm text-clay" role="alert">{error}</div>
        ) : records.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-soft">{t('production.noRecords')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="border-b border-sand bg-sand/30 text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  {[t('production.farmer'), t('production.product'), t('production.quantity'), t('production.unitPrice'), t('production.totalValue'), t('production.season'), t('common.status'), t('common.date')].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}
                  {(canManage || canDelete) && <th className="px-4 py-3"><span className="sr-only">{t('common.actions')}</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-sand/20">
                    <td className="px-4 py-3.5 font-medium text-ink">{record.farmer?.member ? `${record.farmer.member.first_name} ${record.farmer.member.last_name}` : '—'}</td>
                    <td className="px-4 py-3.5 text-ink-soft">{record.product?.name || record.product_name}</td>
                    <td className="figure px-4 py-3.5 text-ink-soft">{record.quantity} {record.unit}</td>
                    <td className="figure px-4 py-3.5 text-ink-soft">{Number(record.unit_price).toLocaleString()} RWF</td>
                    <td className="figure px-4 py-3.5 font-medium text-gold-dark">{Number(record.total_amount).toLocaleString()} RWF</td>
                    <td className="px-4 py-3.5 text-ink-soft">{record.season || '—'}</td>
                    <td className="px-4 py-3.5"><Badge status={record.status}>{t(`production.${record.status}`)}</Badge></td>
                    <td className="px-4 py-3.5 text-ink-soft">{record.production_date}</td>
                    {(canManage || canDelete) && (
                      <td className="px-4 py-3.5 text-right"><div className="flex justify-end gap-2">
                        {canManage && <button onClick={() => openEditModal(record)} aria-label={t('common.edit')} className="focus-ring min-h-9 min-w-9 rounded-lg border border-sand p-2 text-ink-soft hover:text-ink"><Pencil className="h-4 w-4" /></button>}
                        {canDelete && <button onClick={() => handleDelete(record)} disabled={isDeleting} aria-label={t('common.delete')} className="focus-ring min-h-9 min-w-9 rounded-lg border border-sand p-2 text-ink-soft hover:text-clay"><Trash2 className="h-4 w-4" /></button>}
                      </div></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-sand px-4 py-3 text-sm text-ink-soft">
            <span>{t('common.page')} {pagination.page} {t('common.of')} {pagination.pages}</span>
            <div className="flex gap-2">
              <button disabled={pagination.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))} className="focus-ring min-h-10 rounded-lg border border-sand px-3 disabled:opacity-40">{t('common.previous')}</button>
              <button disabled={pagination.page >= pagination.pages} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))} className="focus-ring min-h-10 rounded-lg border border-sand px-3 disabled:opacity-40">{t('common.next')}</button>
            </div>
          </div>
        )}
      </div>

      <Modal title={editingRecord ? t('production.editHarvest') : t('production.recordHarvest')} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <div className="rounded-lg bg-clay/10 px-3.5 py-2.5 text-sm text-clay" role="alert">{formError}</div>}
          <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.farmer')}
            <select required value={form.farmer_id} onChange={(event) => setForm({ ...form, farmer_id: event.target.value })} disabled={Boolean(editingRecord)} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm disabled:bg-sand/30">
              <option value="">{t('production.selectFarmer')}</option>
              {farmers.map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.member.first_name} {farmer.member.last_name}</option>)}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.product')}
              <select value={form.product_id} onChange={(event) => { const product = products.find((item) => String(item.id) === event.target.value); setForm({ ...form, product_id: event.target.value, product_name: '', unit: product?.default_unit || form.unit }); }} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm">
                <option value="">{t('production.selectProduct')}</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
            </label>
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.addProduct')}
              <input value={form.product_name} onChange={(event) => setForm({ ...form, product_name: event.target.value, product_id: '' })} maxLength={100} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.quantity')}<input required type="number" min="0.01" step="0.01" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label>
            <label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.unit')}<input required value={form.unit} maxLength={20} onChange={(event) => setForm({ ...form, unit: event.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label>
            <label className="col-span-2 text-xs font-medium uppercase tracking-wide text-ink-soft sm:col-span-1">{t('production.unitPrice')}<input required type="number" min="0" step="0.01" value={form.unit_price} onChange={(event) => setForm({ ...form, unit_price: event.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label>
          </div>
          <div className="rounded-lg bg-sand/30 px-3 py-2 text-sm text-ink-soft">{t('production.totalValue')}: <strong className="figure text-ink">{liveTotal.toLocaleString()} RWF</strong></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.productionDate')}<input required type="date" value={form.production_date} onChange={(event) => setForm({ ...form, production_date: event.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label>
            <label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.season')}<input value={form.season} maxLength={20} onChange={(event) => setForm({ ...form, season: event.target.value })} placeholder="2026A" className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label>
          </div>
          {canVerify && <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.status')}<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm">{['recorded', 'verified', 'rejected'].map((status) => <option key={status} value={status}>{t(`production.${status}`)}</option>)}</select></label>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="focus-ring min-h-11 rounded-lg border border-sand px-4 text-sm font-medium text-ink-soft">{t('common.cancel')}</button>
            <button disabled={isSaving} className="focus-ring flex min-h-11 items-center gap-2 rounded-lg bg-forest px-4 text-sm font-medium text-paper disabled:opacity-50">{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}{t('common.save')}</button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default ProductionPage;
