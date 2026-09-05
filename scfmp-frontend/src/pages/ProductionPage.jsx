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
  listFarmerGroups,
  listProduction,
  listProducts,
  updateProduction,
} from '../api/production';
import { listFarmers } from '../api/farmers';
import { useAuth } from '../context/AuthContext';
import { useCooperative } from '../context/CooperativeContext';

const emptyForm = {
  production_mode: 'individual', farmer_id: '', farmer_group_id: '',
  product_id: '', product_name: '', expected_production: '', actual_harvest: '', unit: 'kg',
  unit_price: '', production_date: '', harvest_date: '', season: '', reporting_period: '',
  production_location: '', variety: '', production_category: '', quality_grade: '',
  storage_location: '', storage_quantity: '', sold_quantity: '0', remaining_quantity: '',
  buyer: '', notes: '', status: 'recorded', contributions: [],
};

const emptyFilters = {
  search: '', production_mode: '', farmer_id: '', farmer_group_id: '', product_id: '',
  season: '', status: '', from: '', to: '', page: 1, limit: 20,
};

const cleanParams = (value) => Object.fromEntries(
  Object.entries(value).filter(([, item]) => item !== '' && item != null)
);

const ProductionPage = ({ forcedMode = '' }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { cooperativeScope, activeCooperativeId, activeCooperative } = useCooperative();
  const canManage = ['super_admin', 'cooperative_manager', 'field_officer'].includes(user?.role);
  const canVerify = ['super_admin', 'cooperative_manager'].includes(user?.role);
  const canDelete = ['super_admin', 'cooperative_manager'].includes(user?.role);
  const [records, setRecords] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [farmerGroups, setFarmerGroups] = useState([]);
  const [products, setProducts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [filters, setFilters] = useState({ ...emptyFilters, production_mode: forcedMode });
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
      const [productionRes, farmersRes, farmerGroupsRes, productsRes, analyticsRes] = await Promise.all([
        listProduction(scopedFilters),
        listFarmers(cooperativeScope),
        listFarmerGroups(cooperativeScope),
        listProducts(cooperativeScope),
        getProductionAnalytics(analyticsParams),
      ]);
      setRecords(productionRes.data);
      setPagination(productionRes.pagination);
      setFarmers(farmersRes);
      setFarmerGroups(farmerGroupsRes);
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
    setFilters({ ...emptyFilters, production_mode: forcedMode });
  }, [activeCooperativeId, forcedMode]);

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  const contributionTotal = form.contributions.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const effectiveActual = form.production_mode === 'group' && form.contributions.length
    ? contributionTotal
    : Number(form.actual_harvest || 0);
  const liveTotal = effectiveActual && form.unit_price
    ? effectiveActual * Number(form.unit_price)
    : 0;

  const openCreateModal = () => {
    setEditingRecord(null);
    setForm({ ...emptyForm, production_mode: forcedMode || 'individual' });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setForm({
      production_mode: record.production_mode || 'individual',
      farmer_id: record.farmer_id || '',
      farmer_group_id: record.farmer_group_id || '',
      product_id: record.product_id || '',
      product_name: '',
      expected_production: record.expected_production || '',
      actual_harvest: record.actual_harvest || record.quantity || '',
      unit: record.unit || 'kg',
      unit_price: record.unit_price || '',
      production_date: record.production_date || '',
      harvest_date: record.harvest_date || record.production_date || '',
      season: record.season || '',
      reporting_period: record.reporting_period || '',
      production_location: record.production_location || '',
      variety: record.variety || '',
      production_category: record.production_category || '',
      quality_grade: record.quality_grade || '',
      storage_location: record.storage_location || '',
      storage_quantity: record.storage_quantity ?? '',
      sold_quantity: record.sold_quantity ?? '0',
      remaining_quantity: record.remaining_quantity ?? '',
      buyer: record.buyer || '',
      notes: record.notes || '',
      status: record.status || 'recorded',
      contributions: (record.contributions || []).map((item) => ({
        farmer_id: String(item.farmer_id), quantity: String(item.quantity), unit: item.unit || record.unit || 'kg',
      })),
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!activeCooperativeId) {
      setFormError(t('production.selectOrganization'));
      return;
    }
    if (form.production_mode === 'individual' && (!form.farmer_id || form.farmer_group_id)) {
      setFormError(t('production.selectFarmer'));
      return;
    }
    if (form.production_mode === 'group' && form.farmer_id) {
      setFormError(t('production.groupPrimaryFarmerError'));
      return;
    }
    if (!form.product_id && !form.product_name.trim()) {
      setFormError(t('production.selectCropType'));
      return;
    }
    setIsSaving(true);
    setFormError('');
    try {
      const payload = cleanParams({
        ...form,
        cooperative_id: activeCooperativeId,
        actual_harvest: effectiveActual,
        quantity: effectiveActual,
        contributions: form.production_mode === 'group'
          ? form.contributions.map((item) => ({ ...item, unit: form.unit }))
          : [],
        farmer_id: form.production_mode === 'individual' ? form.farmer_id : '',
        farmer_group_id: form.production_mode === 'group' ? form.farmer_group_id : '',
      });
      if (form.production_mode !== 'group') delete payload.contributions;
      if (editingRecord) {
        delete payload.production_mode;
        delete payload.farmer_id;
        delete payload.farmer_group_id;
        delete payload.cooperative_id;
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
          <div className="mb-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard label={t('production.totalProduction')} value={analytics.stats.total_quantity} accent="forest" />
            <StatCard label={t('production.totalValue')} value={analytics.stats.total_value} accent="gold" isCurrency />
            <StatCard label={t('production.activeProducers')} value={analytics.stats.active_producers} accent="forest" />
            <StatCard label={t('reports.records')} value={analytics.stats.record_count} accent="clay" />
            <StatCard label={t('production.soldQuantity')} value={analytics.stats.sold_quantity} accent="gold" />
            <StatCard label={t('production.remainingQuantity')} value={analytics.stats.remaining_quantity} accent="forest" />
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
              disabled={!activeCooperativeId || ((forcedMode || filters.production_mode || 'individual') === 'individual' && !farmers.length)}
              className="focus-ring flex min-h-10 items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> {t('production.recordHarvest')}
            </button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input value={filters.search} onChange={(event) => setFilter('search', event.target.value)} placeholder={`${t('common.search')}…`} className="focus-ring min-h-10 rounded-lg border border-sand px-3 text-sm" />
          {!forcedMode && <select
            value={filters.production_mode}
            onChange={(event) => setFilters((current) => ({
              ...current,
              production_mode: event.target.value,
              farmer_id: '',
              farmer_group_id: '',
              page: 1,
            }))}
            className="focus-ring min-h-10 rounded-lg border border-sand px-3 text-sm"
          >
            <option value="">{t('production.productionMode')}: {t('common.all')}</option>
            <option value="individual">{t('production.individual')}</option>
            <option value="group">{t('production.group')}</option>
          </select>}
          <select value={filters.farmer_id} onChange={(event) => setFilter('farmer_id', event.target.value)} className="focus-ring min-h-10 rounded-lg border border-sand px-3 text-sm">
            <option value="">{t('production.farmer')}: {t('common.all')}</option>
            {farmers.map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.member.first_name} {farmer.member.last_name}</option>)}
          </select>
          <select value={filters.farmer_group_id} onChange={(event) => setFilter('farmer_group_id', event.target.value)} className="focus-ring min-h-10 rounded-lg border border-sand px-3 text-sm">
            <option value="">{t('production.farmerGroup')}: {t('common.all')}</option>
            {farmerGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
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
              <table className="w-full min-w-[1400px] text-left text-sm">
              <thead className="border-b border-sand bg-sand/30 text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  {[
                    t('production.productionMode'), t('production.producer'), t('production.cropType'),
                    t('production.expectedProduction'), t('production.actualHarvest'), t('production.unitPrice'),
                    t('production.totalValue'), t('production.soldQuantity'), t('production.remainingQuantity'),
                    t('production.season'), t('production.productionLocation'),
                    t('common.status'), t('production.harvestDate'),
                  ].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}
                  {(canManage || canDelete) && <th className="px-4 py-3"><span className="sr-only">{t('common.actions')}</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-sand/20">
                    <td className="px-4 py-3.5 text-ink-soft">{t(`production.${record.production_mode || 'individual'}`)}</td>
                    <td className="px-4 py-3.5 font-medium text-ink">
                      {record.production_mode === 'group'
                        ? record.farmerGroup?.name || '—'
                        : (record.farmer?.member ? `${record.farmer.member.first_name} ${record.farmer.member.last_name}` : '—')}
                    </td>
                    <td className="px-4 py-3.5 text-ink-soft">{record.product?.name || record.product_name}</td>
                    <td className="figure px-4 py-3.5 text-ink-soft">{record.expected_production ? `${record.expected_production} ${record.unit}` : '—'}</td>
                    <td className="figure px-4 py-3.5 text-ink-soft">{record.actual_harvest ?? record.quantity} {record.unit}</td>
                    <td className="figure px-4 py-3.5 text-ink-soft">{Number(record.unit_price).toLocaleString()} RWF</td>
                    <td className="figure px-4 py-3.5 font-medium text-gold-dark">{Number(record.total_amount).toLocaleString()} RWF</td>
                    <td className="figure px-4 py-3.5 text-ink-soft">{Number(record.sold_quantity || 0).toLocaleString()} {record.unit}</td>
                    <td className="figure px-4 py-3.5 text-ink-soft">{Number(record.remaining_quantity || 0).toLocaleString()} {record.unit}</td>
                    <td className="px-4 py-3.5 text-ink-soft">{record.season || '—'}</td>
                    <td className="px-4 py-3.5 text-ink-soft">{record.production_location || '—'}</td>
                    <td className="px-4 py-3.5"><Badge status={record.status}>{t(`production.${record.status}`)}</Badge></td>
                    <td className="px-4 py-3.5 text-ink-soft">{record.harvest_date || record.production_date}</td>
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

      <Modal title={editingRecord ? t('production.editHarvest') : t('production.recordHarvest')} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <div className="rounded-lg bg-clay/10 px-3.5 py-2.5 text-sm text-clay" role="alert">{formError}</div>}
          <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.productionMode')}
            <select
              required
              value={form.production_mode}
              onChange={(event) => setForm({
                ...form,
                production_mode: event.target.value,
                farmer_id: '',
                 farmer_group_id: '',
                 production_location: '',
                 contributions: [],
               })}
               disabled={Boolean(editingRecord || forcedMode)}
              className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm disabled:bg-sand/30"
            >
              <option value="individual">{t('production.individual')}</option>
              <option value="group">{t('production.group')}</option>
            </select>
          </label>
          <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('reports.cooperative')}
            <input
              value={activeCooperative?.name || (activeCooperativeId ? `#${activeCooperativeId}` : '')}
              readOnly
              disabled
              className="mt-1.5 min-h-11 w-full rounded-lg border border-sand bg-sand/30 px-3 text-sm text-ink-soft"
            />
          </label>
          {form.production_mode === 'group' ? (
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.productionGroup')}
              <select
                value={form.farmer_group_id}
                onChange={(event) => {
                  const group = farmerGroups.find((item) => String(item.id) === event.target.value);
                  setForm({ ...form, farmer_group_id: event.target.value, production_location: group?.location || '' });
                }}
                disabled={Boolean(editingRecord)}
                className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm disabled:bg-sand/30"
              >
                <option value="">{t('production.cooperativeLevel')}</option>
                {farmerGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            </label>
          ) : (
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.farmer')}
              <select
                required
                value={form.farmer_id}
                onChange={(event) => {
                  const farmer = farmers.find((item) => String(item.id) === event.target.value);
                  setForm({ ...form, farmer_id: event.target.value, production_location: farmer?.location || '' });
                }}
                disabled={Boolean(editingRecord)}
                className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm disabled:bg-sand/30"
              >
                <option value="">{t('production.selectFarmer')}</option>
                {farmers.map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.member.first_name} {farmer.member.last_name}</option>)}
              </select>
            </label>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.cropType')}
              <select value={form.product_id} onChange={(event) => { const product = products.find((item) => String(item.id) === event.target.value); setForm({ ...form, product_id: event.target.value, product_name: '', unit: product?.default_unit || form.unit }); }} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm">
                <option value="">{t('production.selectCropType')}</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
            </label>
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.addCropType')}
              <input value={form.product_name} onChange={(event) => setForm({ ...form, product_name: event.target.value, product_id: '' })} maxLength={100} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" />
            </label>
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.variety')}
              <input value={form.variety} onChange={(event) => setForm({ ...form, variety: event.target.value })} maxLength={100} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3">
            <label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.expectedProduction')}<input type="number" min="0.01" step="0.01" value={form.expected_production} onChange={(event) => setForm({ ...form, expected_production: event.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label>
            <label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.actualHarvest')}<input required type="number" min="0.01" step="0.01" value={form.contributions.length ? contributionTotal : form.actual_harvest} disabled={form.contributions.length > 0} onChange={(event) => setForm({ ...form, actual_harvest: event.target.value, remaining_quantity: '' })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm disabled:bg-sand/30" /></label>
            <label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.unit')}<input required value={form.unit} maxLength={20} onChange={(event) => setForm({ ...form, unit: event.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label>
          </div>
          <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.unitPrice')}<input type="number" min="0" step="0.01" value={form.unit_price} onChange={(event) => setForm({ ...form, unit_price: event.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label>
          <div className="rounded-lg bg-sand/30 px-3 py-2 text-sm text-ink-soft">{t('production.totalValue')}: <strong className="figure text-ink">{liveTotal.toLocaleString()} RWF</strong></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.season')}<input value={form.season} maxLength={20} onChange={(event) => setForm({ ...form, season: event.target.value })} placeholder="2026A" className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label>
            <label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.reportingPeriod')}<input value={form.reporting_period} maxLength={50} onChange={(event) => setForm({ ...form, reporting_period: event.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label>
            <label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.productionDate')}<input type="date" value={form.production_date} onChange={(event) => setForm({ ...form, production_date: event.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label>
            <label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.harvestDate')}<input required type="date" value={form.harvest_date} onChange={(event) => setForm({ ...form, harvest_date: event.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3"><label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.productionLocation')}<input value={form.production_location} maxLength={255} onChange={(event) => setForm({ ...form, production_location: event.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label><label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.productionCategory')}<input value={form.production_category} maxLength={100} onChange={(event) => setForm({ ...form, production_category: event.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label><label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.qualityGrade')}<input value={form.quality_grade} maxLength={50} onChange={(event) => setForm({ ...form, quality_grade: event.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label></div>
          {form.production_mode === 'group' && <section className="rounded-xl border border-sand p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-ink">{t('production.contributingFarmers')}</h3><p className="mt-1 text-xs text-ink-soft">{t('production.contributionHint')}</p></div><button type="button" disabled={!farmers.length} onClick={() => setForm({ ...form, contributions: [...form.contributions, { farmer_id: '', quantity: '', unit: form.unit }], remaining_quantity: '' })} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-sand px-3 text-sm text-forest disabled:opacity-50"><Plus className="h-4 w-4" />{t('production.addFarmer')}</button></div>
            {form.contributions.length === 0 ? <p className="rounded-lg bg-sand/30 p-3 text-sm text-ink-soft">{t('production.noContributions')}</p> : <div className="space-y-3">{form.contributions.map((contribution, index) => <div key={`${index}-${contribution.farmer_id}`} className="grid gap-2 rounded-lg bg-sand/20 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(120px,0.45fr)_auto] sm:items-end"><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.farmer')}<select required value={contribution.farmer_id} onChange={(event) => setForm({ ...form, contributions: form.contributions.map((item, itemIndex) => itemIndex === index ? { ...item, farmer_id: event.target.value } : item), remaining_quantity: '' })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand bg-white px-3 text-sm"><option value="">{t('production.selectFarmer')}</option>{farmers.filter((farmer) => !form.contributions.some((item, itemIndex) => itemIndex !== index && String(item.farmer_id) === String(farmer.id))).map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.member.first_name} {farmer.member.last_name}</option>)}</select></label><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.contributionQuantity')}<div className="mt-1.5 flex"><input required type="number" min="0.01" step="0.01" value={contribution.quantity} onChange={(event) => setForm({ ...form, contributions: form.contributions.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: event.target.value } : item), remaining_quantity: '' })} className="focus-ring min-h-11 min-w-0 flex-1 rounded-l-lg border border-sand px-3 text-sm" /><span className="grid min-h-11 place-items-center rounded-r-lg border border-l-0 border-sand bg-white px-3 text-xs text-ink-soft">{form.unit}</span></div></label><button type="button" onClick={() => setForm({ ...form, contributions: form.contributions.filter((_, itemIndex) => itemIndex !== index), remaining_quantity: '' })} aria-label={t('common.delete')} className="focus-ring min-h-11 rounded-lg border border-sand px-3 text-clay"><Trash2 className="mx-auto h-4 w-4" /></button></div>)}</div>}
            {form.contributions.length > 0 && <p className="mt-3 text-right text-sm text-ink-soft">{t('production.contributionTotal')}: <strong className="figure text-ink">{contributionTotal.toLocaleString()} {form.unit}</strong></p>}
          </section>}
          <section className="rounded-xl border border-sand p-4"><h3 className="mb-3 text-sm font-semibold text-ink">{t('production.storageAndSales')}</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.storageLocation')}<input value={form.storage_location} maxLength={255} onChange={(event) => setForm({ ...form, storage_location: event.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.storageQuantity')}<input type="number" min="0" step="0.01" value={form.storage_quantity} onChange={(event) => setForm({ ...form, storage_quantity: event.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.soldQuantity')}<input type="number" min="0" step="0.01" value={form.sold_quantity} onChange={(event) => setForm({ ...form, sold_quantity: event.target.value, remaining_quantity: '' })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.remainingQuantity')}<input type="number" min="0" step="0.01" value={form.remaining_quantity} placeholder={String(Math.max(0, effectiveActual - Number(form.sold_quantity || 0)))} onChange={(event) => setForm({ ...form, remaining_quantity: event.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.buyer')}<input value={form.buyer} maxLength={150} onChange={(event) => setForm({ ...form, buyer: event.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label></div></section>
          <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.notes')}<textarea value={form.notes} maxLength={2000} rows={3} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="focus-ring mt-1.5 w-full rounded-lg border border-sand px-3 py-2 text-sm" /></label>
          {canVerify && <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('production.status')}<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm">{['recorded', 'verified', 'rejected'].map((status) => <option key={status} value={status}>{t(`production.${status}`)}</option>)}</select></label>}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setIsModalOpen(false)} className="focus-ring min-h-11 rounded-lg border border-sand px-4 text-sm font-medium text-ink-soft">{t('common.cancel')}</button>
            <button disabled={isSaving} className="focus-ring flex min-h-11 items-center gap-2 rounded-lg bg-forest px-4 text-sm font-medium text-paper disabled:opacity-50">{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}{t('common.save')}</button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default ProductionPage;
