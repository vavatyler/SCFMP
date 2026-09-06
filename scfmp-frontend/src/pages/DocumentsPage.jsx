import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Archive, Download, Eye, FileClock, FilePenLine, FileText, Filter, Loader2, Plus,
  RefreshCw, Trash2, Upload,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../components/DashboardLayout';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import StatCard from '../components/StatCard';
import {
  deleteDocument,
  downloadDocument,
  getDocumentClassification,
  getDocumentStats,
  listDocuments,
  replaceDocumentFile,
  setDocumentArchived,
  updateDocument,
  uploadDocument,
  viewDocument,
} from '../api/documents';
import { listMembers } from '../api/members';
import { useAuth } from '../context/AuthContext';
import { useCooperative } from '../context/CooperativeContext';
import {
  DOCUMENT_DELETE_ROLES,
  DOCUMENT_UPLOAD_ACCEPT,
  DOCUMENT_UPLOAD_ROLES,
  getDocumentFileValidationKey,
  getDocumentUploadErrorKey,
} from '../utils/documentUpload';
import { PERMISSIONS } from '../config/permissions';

const emptyForm = {
  title: '', category: '', document_type: '', owner_type: 'cooperative', owner_id: '',
  description: '', document_date: '', expiry_date: '', version: '', tags: '',
  visibility: 'organization', notes: '',
};
const emptyFilters = { search: '', category: '', document_type: '', document_date: '', expiry_date: '', uploaded_by: '', status: '' };

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};
const compact = (value) => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== '' && item != null));

const DocumentsPage = ({ forcedView = '', forcedStatus = '' }) => {
  const { t } = useTranslation();
  const { user, can } = useAuth();
  const { cooperativeScope, activeCooperativeId, activeCooperative } = useCooperative();
  const [searchParams] = useSearchParams();
  const routeView = forcedView || searchParams.get('view') || 'all';
  const routeStatus = forcedStatus || searchParams.get('status') || '';
  const canUpload = can(PERMISSIONS.DOCUMENTS_MANAGE) && DOCUMENT_UPLOAD_ROLES.includes(user?.role);
  const canEdit = canUpload;
  const canArchive = can(PERMISSIONS.DOCUMENTS_MANAGE) && DOCUMENT_DELETE_ROLES.includes(user?.role);
  const canDelete = can(PERMISSIONS.DOCUMENTS_MANAGE) && DOCUMENT_DELETE_ROLES.includes(user?.role);
  const [documents, setDocuments] = useState([]);
  const [members, setMembers] = useState([]);
  const [classification, setClassification] = useState(null);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ ...emptyFilters, status: routeStatus });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [file, setFile] = useState(null);
  const [replacement, setReplacement] = useState(null);
  const [replacementFile, setReplacementFile] = useState(null);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const uploadSubmitLockRef = useRef(false);

  const selectedCategory = classification?.categories.find((item) => item.id === form?.category);
  const filterCategory = classification?.categories.find((item) => item.id === filters.category);
  const allTypes = useMemo(() => {
    const map = new Map();
    classification?.categories.forEach((category) => category.types.forEach((type) => map.set(type.id, type)));
    return [...map.values()];
  }, [classification]);

  const fetchAll = useCallback(async () => {
    if (!activeCooperativeId) {
      setDocuments([]); setMembers([]); setClassification(null); setStats(null); setIsLoading(false); return;
    }
    setIsLoading(true);
    setError('');
    try {
      const params = compact({ ...cooperativeScope, ...filters, status: routeStatus || filters.status });
      const [docs, membersResult, classificationResult, statsResult] = await Promise.all([
        listDocuments(params),
        listMembers({ ...cooperativeScope, limit: 100 }),
        getDocumentClassification(cooperativeScope),
        getDocumentStats(cooperativeScope),
      ]);
      setDocuments(docs);
      setMembers(membersResult.data);
      setClassification(classificationResult);
      setStats(statsResult);
    } catch {
      setError(t('documents.loadError'));
    } finally { setIsLoading(false); }
  }, [activeCooperativeId, cooperativeScope, filters, routeStatus, t]);

  useEffect(() => {
    const timeout = setTimeout(fetchAll, filters.search ? 250 : 0);
    return () => clearTimeout(timeout);
  }, [fetchAll]);

  useEffect(() => {
    setFilters({ ...emptyFilters, status: routeStatus });
    setForm(null);
  }, [activeCooperativeId, routeStatus]);

  const openAdd = () => {
    setEditing(null);
    setFile(null);
    setForm({ ...emptyForm, owner_id: activeCooperativeId || '' });
    setFormError('');
    setFeedback('');
  };
  const openEdit = (document) => {
    setEditing(document);
    setFile(null);
    setForm({
      ...emptyForm,
      ...document,
      tags: document.tags || '',
      owner_id: document.owner_id,
    });
    setFormError('');
  };
  const closeForm = () => { setEditing(null); setForm(null); setFile(null); };

  const save = async (event) => {
    event.preventDefault();
    if (uploadSubmitLockRef.current || !canEdit) return;
    if (!editing) {
      const validationKey = getDocumentFileValidationKey(file);
      if (validationKey) { setFormError(t(validationKey)); return; }
    }
    if (!form.category || !form.document_type) { setFormError(t('documents.classificationRequired')); return; }
    if (form.document_date && form.expiry_date && form.expiry_date < form.document_date) {
      setFormError(t('documents.expiryAfterDate')); return;
    }
    uploadSubmitLockRef.current = true;
    setIsSaving(true);
    setFormError('');
    try {
      if (editing) await updateDocument(editing.id, form);
      else await uploadDocument({ file, ...form });
      closeForm();
      await fetchAll();
      setFeedback(t(editing ? 'documents.updated' : 'documents.uploaded'));
    } catch (requestError) {
      setFormError(requestError.response?.data?.message || t(getDocumentUploadErrorKey(requestError)));
    } finally {
      uploadSubmitLockRef.current = false;
      setIsSaving(false);
    }
  };

  const replaceFile = async (event) => {
    event.preventDefault();
    const validationKey = getDocumentFileValidationKey(replacementFile);
    if (validationKey) { setFormError(t(validationKey)); return; }
    setIsSaving(true);
    setFormError('');
    try {
      await replaceDocumentFile(replacement.id, replacementFile);
      setReplacement(null); setReplacementFile(null); await fetchAll(); setFeedback(t('documents.replaced'));
    } catch (requestError) { setFormError(requestError.response?.data?.message || t(getDocumentUploadErrorKey(requestError))); }
    finally { setIsSaving(false); }
  };

  const archive = async (document) => {
    const shouldArchive = document.document_status !== 'archived';
    if (!window.confirm(t(shouldArchive ? 'documents.archiveConfirm' : 'documents.restoreConfirm', { name: document.title }))) return;
    try { await setDocumentArchived(document.id, shouldArchive); await fetchAll(); }
    catch { window.alert(t('documents.actionError')); }
  };
  const remove = async (document) => {
    if (!window.confirm(t('documents.deleteConfirm', { name: document.title || document.original_name }))) return;
    try { await deleteDocument(document.id); await fetchAll(); }
    catch { window.alert(t('documents.deleteError')); }
  };
  const ownerLabel = (document) => {
    if (document.owner_type === 'cooperative') return document.cooperative?.name || activeCooperative?.name || '—';
    if (document.owner_type === 'member') {
      const member = members.find((item) => item.id === Number(document.owner_id));
      return member ? `${member.first_name} ${member.last_name}` : `${t('documents.member')} #${document.owner_id}`;
    }
    return `${t(`documents.ownerTypes.${document.owner_type}`)} #${document.owner_id}`;
  };
  const categoryLabel = (id) => t(`documents.categories.${id}`, { defaultValue: id });
  const typeLabel = (id) => {
    const source = allTypes.find((item) => item.id === id);
    return t(`documents.types.${id}`, { defaultValue: source?.label || id });
  };

  return (
    <DashboardLayout title={t('documents.title')} subtitle={t('documents.subtitle')}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex max-w-full self-start overflow-x-auto rounded-xl border border-sand bg-white p-1"><Link to="/documents" className={`focus-ring whitespace-nowrap rounded-lg px-3 py-2 text-sm ${routeView === 'all' && !routeStatus ? 'bg-forest text-paper' : 'text-ink-soft'}`}>{t('documents.all')}</Link><Link to="/documents/categories" className={`focus-ring whitespace-nowrap rounded-lg px-3 py-2 text-sm ${routeView === 'categories' ? 'bg-forest text-paper' : 'text-ink-soft'}`}>{t('documents.categoriesTitle')}</Link><Link to="/documents/expiring" className={`focus-ring whitespace-nowrap rounded-lg px-3 py-2 text-sm ${routeStatus === 'expiring_soon' ? 'bg-forest text-paper' : 'text-ink-soft'}`}>{t('documents.expiring')}</Link></div>
        {canUpload && <button onClick={openAdd} disabled={!activeCooperativeId || !classification} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-forest px-4 text-sm font-medium text-paper disabled:opacity-50"><Plus className="h-4 w-4" />{t('documents.add')}</button>}
      </div>

      {feedback && <div className="mb-5 rounded-lg border border-forest/20 bg-forest/5 px-4 py-3 text-sm text-forest" role="status">{feedback}</div>}
      {stats && <div className="mb-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-5"><StatCard label={t('documents.totalDocuments')} value={stats.total} accent="forest" /><StatCard label={t('documents.meetingDocuments')} value={stats.meetings} accent="gold" /><StatCard label={t('documents.legalDocuments')} value={stats.legal} accent="forest" /><StatCard label={t('documents.financialDocuments')} value={stats.financial} accent="gold" /><StatCard label={t('documents.expiringSoon')} value={stats.expiring_soon} accent="clay" /></div>}

      {routeView === 'categories' && classification && <section className="mb-5 rounded-xl bg-white p-5 shadow-card"><h2 className="font-display text-lg font-semibold text-ink">{t('documents.categoriesFor', { type: t(`organizationTypes.${classification.organization_type}`) })}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{classification.categories.map((category) => <div key={category.id} className="rounded-xl border border-sand p-4"><h3 className="font-medium text-ink">{categoryLabel(category.id)}</h3><ul className="mt-2 space-y-1 text-sm text-ink-soft">{category.types.map((type) => <li key={type.id}>{typeLabel(type.id)}</li>)}</ul></div>)}</div></section>}

      <section className="mb-5 rounded-xl border border-sand bg-white p-4 shadow-sm" aria-label={t('common.filters')}>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-ink"><Filter className="h-4 w-4" />{t('common.filters')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder={t('documents.search')} className="focus-ring min-h-10 min-w-0 rounded-lg border border-sand px-3 text-sm" /><select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value, document_type: '' })} className="focus-ring min-h-10 min-w-0 rounded-lg border border-sand px-3 text-sm"><option value="">{t('documents.category')}: {t('common.all')}</option>{classification?.categories.map((category) => <option key={category.id} value={category.id}>{categoryLabel(category.id)}</option>)}</select><select value={filters.document_type} onChange={(event) => setFilters({ ...filters, document_type: event.target.value })} className="focus-ring min-h-10 min-w-0 rounded-lg border border-sand px-3 text-sm"><option value="">{t('documents.documentType')}: {t('common.all')}</option>{(filterCategory?.types || allTypes).map((type) => <option key={type.id} value={type.id}>{typeLabel(type.id)}</option>)}</select><select value={routeStatus || filters.status} disabled={Boolean(routeStatus)} onChange={(event) => setFilters({ ...filters, status: event.target.value })} className="focus-ring min-h-10 min-w-0 rounded-lg border border-sand px-3 text-sm disabled:bg-sand/30"><option value="">{t('common.status')}: {t('common.all')}</option>{['active', 'expiring_soon', 'expired', 'archived'].map((status) => <option key={status} value={status}>{t(`documents.status.${status}`)}</option>)}</select><label className="text-xs text-ink-soft">{t('documents.documentDate')}<input type="date" value={filters.document_date} onChange={(event) => setFilters({ ...filters, document_date: event.target.value })} className="focus-ring mt-1 block min-h-10 w-full rounded-lg border border-sand px-3 text-sm text-ink" /></label><label className="text-xs text-ink-soft">{t('documents.expiryDate')}<input type="date" value={filters.expiry_date} onChange={(event) => setFilters({ ...filters, expiry_date: event.target.value })} className="focus-ring mt-1 block min-h-10 w-full rounded-lg border border-sand px-3 text-sm text-ink" /></label><select value={filters.uploaded_by} onChange={(event) => setFilters({ ...filters, uploaded_by: event.target.value })} className="focus-ring min-h-10 min-w-0 self-end rounded-lg border border-sand px-3 text-sm"><option value="">{t('documents.uploadedBy')}: {t('common.all')}</option>{[...new Map(documents.filter((doc) => doc.uploadedByUser).map((doc) => [doc.uploadedByUser.id, doc.uploadedByUser])).values()].map((uploader) => <option key={uploader.id} value={uploader.id}>{uploader.first_name} {uploader.last_name}</option>)}</select><button onClick={() => setFilters({ ...emptyFilters, status: routeStatus })} className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 self-end rounded-lg border border-sand px-3 text-sm text-ink-soft"><RefreshCw className="h-4 w-4" />{t('documents.clearFilters')}</button></div>
      </section>

      <section className="overflow-hidden rounded-xl bg-white shadow-card">
        {isLoading ? <div className="flex min-h-40 items-center justify-center text-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('common.loading')}</div> : error ? <div className="p-6 text-sm text-clay" role="alert">{error}</div> : documents.length === 0 ? <div className="p-10 text-center text-sm text-ink-soft"><FileClock className="mx-auto mb-3 h-9 w-9" />{t(routeStatus === 'expiring_soon' ? 'documents.noExpiring' : filters.category || filters.document_type ? 'documents.noCategoryResults' : 'documents.empty')}</div> : <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="border-b border-sand bg-sand/30 text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">{t('documents.titleField')}</th><th className="px-4 py-3">{t('documents.organizationOwner')}</th><th className="px-4 py-3">{t('documents.category')}</th><th className="px-4 py-3">{t('documents.documentType')}</th><th className="px-4 py-3">{t('documents.documentDate')}</th><th className="px-4 py-3">{t('documents.expiryDate')}</th><th className="px-4 py-3">{t('common.status')}</th><th className="px-4 py-3"><span className="sr-only">{t('common.actions')}</span></th></tr></thead><tbody className="divide-y divide-sand">{documents.map((document) => <tr key={document.id} className="hover:bg-sand/20"><td className="px-4 py-3.5"><div className="flex items-start gap-2"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-forest" /><div className="min-w-0"><p className="max-w-64 break-words font-medium text-ink">{document.title || document.original_name}</p><p className="mt-0.5 text-xs text-ink-soft">{document.original_name} · {formatSize(document.file_size)}</p></div></div></td><td className="px-4 py-3.5 text-ink-soft">{ownerLabel(document)}</td><td className="px-4 py-3.5 text-ink-soft">{categoryLabel(document.category)}</td><td className="px-4 py-3.5 text-ink-soft">{typeLabel(document.document_type)}</td><td className="figure px-4 py-3.5 text-ink-soft">{document.document_date || '—'}</td><td className="figure px-4 py-3.5 text-ink-soft">{document.expiry_date || '—'}</td><td className="px-4 py-3.5"><Badge status={document.document_status}>{t(`documents.status.${document.document_status}`)}</Badge></td><td className="px-4 py-3.5"><div className="flex justify-end gap-1"><button onClick={() => viewDocument(document.id, document.original_name)} aria-label={t('common.view')} className="focus-ring rounded-lg p-2 text-ink-soft hover:bg-sand"><Eye className="h-4 w-4" /></button><button onClick={() => downloadDocument(document.id, document.original_name)} aria-label={t('documents.download')} className="focus-ring rounded-lg p-2 text-ink-soft hover:bg-sand"><Download className="h-4 w-4" /></button>{canEdit && <><button onClick={() => openEdit(document)} aria-label={t('documents.editMetadata')} className="focus-ring rounded-lg p-2 text-ink-soft hover:bg-sand"><FilePenLine className="h-4 w-4" /></button><button onClick={() => { setReplacement(document); setReplacementFile(null); setFormError(''); }} aria-label={t('documents.replaceFile')} className="focus-ring rounded-lg p-2 text-ink-soft hover:bg-sand"><Upload className="h-4 w-4" /></button></>}{canArchive && <button onClick={() => archive(document)} aria-label={document.document_status === 'archived' ? t('documents.restore') : t('documents.archive')} className="focus-ring rounded-lg p-2 text-ink-soft hover:bg-sand"><Archive className="h-4 w-4" /></button>}{canDelete && <button onClick={() => remove(document)} aria-label={t('common.delete')} className="focus-ring rounded-lg p-2 text-clay hover:bg-clay/10"><Trash2 className="h-4 w-4" /></button>}</div></td></tr>)}</tbody></table></div>}
      </section>

      <Modal title={editing ? t('documents.editMetadata') : t('documents.add')} isOpen={Boolean(form)} onClose={closeForm} maxWidth="max-w-3xl">
        {form && <form onSubmit={save} className="space-y-4">{formError && <div className="rounded-lg bg-clay/10 p-3 text-sm text-clay" role="alert">{formError}</div>}<div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('documents.titleField')} *<input required maxLength={255} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('documents.organization')} *<input readOnly disabled value={activeCooperative?.name || ''} className="mt-1.5 min-h-11 w-full rounded-lg border border-sand bg-sand/30 px-3 text-sm text-ink-soft" /></label><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('documents.category')} *<select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, document_type: '' })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm"><option value="">{t('documents.selectCategory')}</option>{classification?.categories.map((category) => <option key={category.id} value={category.id}>{categoryLabel(category.id)}</option>)}</select></label><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('documents.documentType')} *<select required disabled={!form.category} value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm disabled:bg-sand/30"><option value="">{t('documents.selectType')}</option>{selectedCategory?.types.map((type) => <option key={type.id} value={type.id}>{typeLabel(type.id)}</option>)}</select></label></div>
          {!editing && <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('documents.attachTo')}<select value={form.owner_type} onChange={(e) => setForm({ ...form, owner_type: e.target.value, owner_id: e.target.value === 'cooperative' ? activeCooperativeId : '' })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm"><option value="cooperative">{t('documents.ownerTypes.cooperative')}</option><option value="member">{t('documents.ownerTypes.member')}</option></select></label>{form.owner_type === 'member' && <label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('documents.member')} *<select required value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm"><option value="">{t('documents.selectMember')}</option>{members.map((member) => <option key={member.id} value={member.id}>{member.first_name} {member.last_name}</option>)}</select></label>}</div>}
          <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('documents.description')}<textarea rows={2} maxLength={255} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className="focus-ring mt-1.5 w-full rounded-lg border border-sand px-3 py-2 text-sm" /></label><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('documents.documentDate')}<input type="date" value={form.document_date || ''} onChange={(e) => setForm({ ...form, document_date: e.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('documents.expiryDate')}<input type="date" value={form.expiry_date || ''} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('documents.version')}<input maxLength={40} value={form.version || ''} onChange={(e) => setForm({ ...form, version: e.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('documents.tags')}<input maxLength={1000} value={form.tags || ''} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder={t('documents.tagsHint')} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('documents.visibility')}<select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm"><option value="organization">{t('documents.visibilityOptions.organization')}</option>{canArchive && <option value="restricted">{t('documents.visibilityOptions.restricted')}</option>}</select></label></div><label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('documents.notes')}<textarea rows={2} maxLength={3000} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="focus-ring mt-1.5 w-full rounded-lg border border-sand px-3 py-2 text-sm" /></label>
          {!editing && <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('documents.file')} *<input required type="file" accept={DOCUMENT_UPLOAD_ACCEPT} onChange={(e) => { setFile(e.target.files[0]); setFormError(''); }} className="focus-ring mt-1.5 w-full rounded-lg border border-sand px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-sand file:px-3 file:py-1 file:text-xs" /><span className="mt-1 block normal-case text-ink-soft">{t('documents.fileTypes')}</span></label>}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={closeForm} className="focus-ring min-h-11 rounded-lg border border-sand px-4 text-sm">{t('common.cancel')}</button><button disabled={isSaving} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-forest px-4 text-sm font-medium text-paper disabled:opacity-50">{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}{isSaving ? t('common.saving') : t('common.save')}</button></div>
        </form>}
      </Modal>

      <Modal title={t('documents.replaceFile')} isOpen={Boolean(replacement)} onClose={() => { setReplacement(null); setReplacementFile(null); }}>
        {replacement && <form onSubmit={replaceFile} className="space-y-4">{formError && <div className="rounded-lg bg-clay/10 p-3 text-sm text-clay" role="alert">{formError}</div>}<p className="text-sm text-ink-soft">{t('documents.replaceHint', { title: replacement.title })}</p><input required type="file" accept={DOCUMENT_UPLOAD_ACCEPT} onChange={(event) => { setReplacementFile(event.target.files[0]); setFormError(''); }} className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm" /><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setReplacement(null)} className="focus-ring min-h-11 rounded-lg border border-sand px-4 text-sm">{t('common.cancel')}</button><button disabled={isSaving} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-forest px-4 text-sm font-medium text-paper disabled:opacity-50">{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}{t('documents.replaceFile')}</button></div></form>}
      </Modal>
    </DashboardLayout>
  );
};

export default DocumentsPage;
