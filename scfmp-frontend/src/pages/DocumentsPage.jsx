import { useEffect, useState } from 'react';
import { Plus, Loader2, FileText, Download, Trash2 } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import Modal from '../components/Modal';
import { listDocuments, uploadDocument, downloadDocument, deleteDocument } from '../api/documents';
import { listMembers } from '../api/members';
import { useAuth } from '../context/AuthContext';
import { useCooperative } from '../context/CooperativeContext';
import { useTranslation } from 'react-i18next';

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

const DocumentsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { cooperativeScope, activeCooperativeId } = useCooperative();
  const canUpload = ['super_admin', 'cooperative_manager', 'field_officer', 'accountant'].includes(user?.role);
  const canDelete = ['super_admin', 'cooperative_manager'].includes(user?.role);

  const [documents, setDocuments] = useState([]);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [ownerId, setOwnerId] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchAll = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [docsRes, membersRes] = await Promise.all([
        listDocuments({ owner_type: 'member', ...cooperativeScope }),
        listMembers(cooperativeScope),
      ]);
      setDocuments(docsRes);
      setMembers(membersRes.data);
    } catch (err) {
      setError(t('documents.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [activeCooperativeId]);

  const memberName = (id) => {
    const m = members.find((mem) => mem.id === Number(id));
    return m ? `${m.first_name} ${m.last_name}` : `Member #${id}`;
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!file) {
      setFormError(t('documents.chooseFile'));
      return;
    }
    setIsSaving(true);
    try {
      await uploadDocument({ file, owner_type: 'member', owner_id: ownerId, description });
      setIsModalOpen(false);
      setFile(null);
      setOwnerId('');
      setDescription('');
      fetchAll();
    } catch (err) {
      setFormError(err.response?.data?.message || t('documents.uploadError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = (doc) => downloadDocument(doc.id, doc.original_name);

  const handleDelete = async (doc) => {
    if (!window.confirm(t('documents.deleteConfirm', { name: doc.original_name }))) return;
    try {
      await deleteDocument(doc.id);
      fetchAll();
    } catch {
      window.alert(t('documents.deleteError'));
    }
  };

  return (
    <DashboardLayout title={t('common.documents')} subtitle={t('modules.documentsSubtitle')}>
      {canUpload && <div className="mb-5 flex items-center justify-end">
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={members.length === 0}
          className="focus-ring flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {t('documents.upload')}
        </button>
      </div>}

      <div className="overflow-hidden rounded-xl bg-white shadow-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-ink-soft">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {t('common.loading')}
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-clay">{error}</div>
        ) : documents.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-soft">
            {t('documents.empty')}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-sand bg-sand/30 text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-5 py-3 font-medium">{t('documents.file')}</th>
                <th className="px-5 py-3 font-medium">{t('documents.member')}</th>
                <th className="px-5 py-3 font-medium">{t('documents.description')}</th>
                <th className="px-5 py-3 font-medium">{t('documents.size')}</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {documents.map((doc) => (
                <tr key={doc.id} className="transition-colors hover:bg-sand/20">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-ink-soft" />
                      <span className="font-medium text-ink">{doc.original_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-ink-soft">{memberName(doc.owner_id)}</td>
                  <td className="px-5 py-3.5 text-ink-soft">{doc.description || '—'}</td>
                  <td className="figure px-5 py-3.5 text-ink-soft">{formatSize(doc.file_size)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleDownload(doc)}
                        title={t('documents.download')}
                        aria-label={`${t('documents.download')} ${doc.original_name}`}
                        className="focus-ring rounded-lg p-1.5 text-ink-soft hover:bg-forest/10 hover:text-forest"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {canDelete && <button
                        onClick={() => handleDelete(doc)}
                        title={t('common.delete')}
                        aria-label={`${t('common.delete')} ${doc.original_name}`}
                        className="focus-ring rounded-lg p-1.5 text-ink-soft hover:bg-clay/10 hover:text-clay"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <Modal title={t('documents.upload')} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleUpload}>
          {formError && (
            <div className="mb-4 rounded-lg bg-clay/10 px-3.5 py-2.5 text-sm text-clay">
              {formError}
            </div>
          )}

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              {t('documents.member')}
            </label>
            <select
              required
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
            >
              <option value="">{t('documents.selectMember')}</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.first_name} {m.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              {t('documents.file')}
            </label>
            <input
              required
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-sand file:px-3 file:py-1 file:text-xs file:font-medium file:text-ink"
            />
            <p className="mt-1 text-xs text-ink-soft">{t('documents.fileTypes')}</p>
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              {t('documents.description')} ({t('documents.optional')})
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('documents.example')}
              className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? t('documents.uploading') : t('documents.upload')}
          </button>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default DocumentsPage;
