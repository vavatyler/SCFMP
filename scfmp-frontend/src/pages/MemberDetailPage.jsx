import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Loader2, MapPin, Pencil, Sprout, Trash2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Badge from '../components/Badge';
import DashboardLayout from '../components/DashboardLayout';
import FarmSizeFields from '../components/FarmSizeFields';
import MemberFormFields from '../components/MemberFormFields';
import RwandaLocationFields from '../components/RwandaLocationFields';
import { createFarmer, updateFarmer } from '../api/farmers';
import { deleteMember, getMember, updateMember } from '../api/members';
import { deleteDocument, downloadDocument, listDocuments, uploadDocument } from '../api/documents';
import { useAuth } from '../context/AuthContext';
import {
  hasAnyLocation,
  hasCompleteLocation,
  hasLocationChanged,
} from '../utils/locationHierarchy';
import {
  buildFarmerPayload,
  createEmptyFarmerForm,
  FARMER_WRITE_ROLES,
  farmerToForm,
  getFarmSizeDisplay,
  getFarmerLocationDisplay,
  isValidFarmSize,
  isValidFarmSizeUnit,
} from '../utils/farmerForm';
import {
  buildMemberPayload,
  getMemberAddressDisplay,
  getMemberAddressLocation,
  MEMBER_ADDRESS_FIELDS,
  MEMBER_DELETE_ROLES,
  MEMBER_GENDERS,
  MEMBER_WRITE_ROLES,
  memberToForm,
} from '../utils/memberForm';
import { isValidRwandaLocalPhone, isValidRwandaNationalId } from '../utils/validation';
import {
  DOCUMENT_DELETE_ROLES,
  DOCUMENT_UPLOAD_ACCEPT,
  DOCUMENT_UPLOAD_ROLES,
  getDocumentFileValidationKey,
  getDocumentUploadErrorKey,
} from '../utils/documentUpload';
import { PERMISSIONS } from '../config/permissions';

const MemberDetailPage = () => {
  const { t } = useTranslation();
  const { user, can } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editFieldErrors, setEditFieldErrors] = useState({});
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFarmerForm, setShowFarmerForm] = useState(false);
  const [isEditingFarmer, setIsEditingFarmer] = useState(false);
  const [farmerForm, setFarmerForm] = useState(createEmptyFarmerForm);
  const [farmerFieldErrors, setFarmerFieldErrors] = useState({});
  const [farmerError, setFarmerError] = useState('');
  const [isSavingFarmer, setIsSavingFarmer] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [docFile, setDocFile] = useState(null);
  const [docDescription, setDocDescription] = useState('');
  const [docError, setDocError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const editSubmitLockRef = useRef(false);
  const farmerSubmitLockRef = useRef(false);
  const documentSubmitLockRef = useRef(false);
  const documentInputRef = useRef(null);

  const canEditMember = can(PERMISSIONS.MEMBERS_MANAGE) && MEMBER_WRITE_ROLES.includes(user?.role);
  const canDeleteMember = can(PERMISSIONS.MEMBERS_MANAGE) && MEMBER_DELETE_ROLES.includes(user?.role);
  const canEditFarmer = can(PERMISSIONS.FARMERS_MANAGE) && FARMER_WRITE_ROLES.includes(user?.role);
  const canUploadDocument = can(PERMISSIONS.DOCUMENTS_MANAGE) && DOCUMENT_UPLOAD_ROLES.includes(user?.role);
  const canDeleteDocument = can(PERMISSIONS.DOCUMENTS_MANAGE) && DOCUMENT_DELETE_ROLES.includes(user?.role);

  const fetchDocuments = async () => {
    try {
      setDocuments(await listDocuments({ owner_type: 'member', owner_id: id }));
    } catch {
      // Documents are non-critical to loading the member profile.
    }
  };

  const fetchMember = async () => {
    setIsLoading(true);
    try {
      setMember(await getMember(id));
    } catch {
      setError(t('memberDetail.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMember();
    fetchDocuments();
  }, [id, t]);

  const handleUploadDocument = async (event) => {
    event.preventDefault();
    if (documentSubmitLockRef.current || !canUploadDocument) return;
    setDocError('');
    const validationKey = getDocumentFileValidationKey(docFile);
    if (validationKey) {
      setDocError(t(validationKey));
      return;
    }
    documentSubmitLockRef.current = true;
    setIsUploading(true);
    try {
      await uploadDocument({ file: docFile, owner_type: 'member', owner_id: id, description: docDescription });
      setDocFile(null);
      if (documentInputRef.current) documentInputRef.current.value = '';
      setDocDescription('');
      await fetchDocuments();
      setFeedback(t('documents.uploaded'));
    } catch (uploadError) {
      setDocError(t(getDocumentUploadErrorKey(uploadError)));
    } finally {
      documentSubmitLockRef.current = false;
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (document) => {
    if (!window.confirm(t('documents.deleteConfirm', { name: document.original_name }))) return;
    try {
      await deleteDocument(document.id);
      fetchDocuments();
    } catch {
      window.alert(t('documents.deleteError'));
    }
  };

  const handleSaveFarmer = async (event) => {
    event.preventDefault();
    if (farmerSubmitLockRef.current || !canEditFarmer) return;
    setFarmerError('');
    setFarmerFieldErrors({});
    const nextFarmerErrors = {};
    if (!isValidFarmSize(farmerForm.farm_size)) {
      nextFarmerErrors.farm_size = t('farmers.validation.farmSizeInvalid');
    }
    if (farmerForm.farm_size && !isValidFarmSizeUnit(farmerForm.farm_size_unit)) {
      nextFarmerErrors.farm_size_unit = t('farmers.validation.farmSizeUnitRequired');
    }
    if (Object.keys(nextFarmerErrors).length > 0) {
      setFarmerFieldErrors(nextFarmerErrors);
      return;
    }
    const existingFarmer = isEditingFarmer ? member.farmerProfile : null;
    const locationChanged = !existingFarmer || hasLocationChanged(
      farmerForm,
      existingFarmer,
      { includeVillage: true }
    );
    const hasAnyStructuredLocation = hasAnyLocation(farmerForm, { includeVillage: true });
    const hasCompleteStructuredLocation = hasCompleteLocation(farmerForm, { includeVillage: true });
    if (locationChanged && hasAnyStructuredLocation && !hasCompleteStructuredLocation) {
      setFarmerError(t('locations.farmerIncomplete'));
      return;
    }

    farmerSubmitLockRef.current = true;
    setIsSavingFarmer(true);
    try {
      const payload = buildFarmerPayload(farmerForm, existingFarmer);

      if (isEditingFarmer && member.farmerProfile) {
        await updateFarmer(member.farmerProfile.id, payload);
        setFeedback(t('farmers.updated'));
      } else {
        await createFarmer({ ...payload, member_id: Number(id) });
        setFeedback(t('farmers.created'));
      }
      setShowFarmerForm(false);
      setIsEditingFarmer(false);
      setFarmerForm(createEmptyFarmerForm());
      setFarmerFieldErrors({});
      await fetchMember();
    } catch (error) {
      setFarmerError(error.response?.status === 422 ? t('farmers.validation.invalid') : t('farmers.saveError'));
    } finally {
      farmerSubmitLockRef.current = false;
      setIsSavingFarmer(false);
    }
  };

  const startEditFarmer = () => {
    if (!canEditFarmer) return;
    setFarmerForm(farmerToForm(member.farmerProfile));
    setIsEditingFarmer(true);
    setShowFarmerForm(true);
    setFarmerFieldErrors({});
    setFarmerError('');
  };

  const startCreateFarmer = () => {
    if (!canEditFarmer) return;
    setFarmerForm(createEmptyFarmerForm());
    setIsEditingFarmer(false);
    setShowFarmerForm(true);
    setFarmerFieldErrors({});
    setFarmerError('');
  };

  const cancelFarmerForm = () => {
    if (farmerSubmitLockRef.current) return;
    setShowFarmerForm(false);
    setIsEditingFarmer(false);
    setFarmerForm(createEmptyFarmerForm());
    setFarmerFieldErrors({});
    setFarmerError('');
  };

  const startEdit = () => {
    if (!canEditMember) return;
    setEditForm(memberToForm(member));
    setEditFieldErrors({});
    setEditError('');
    setIsEditing(true);
  };

  const cancelEdit = () => {
    if (editSubmitLockRef.current) return;
    setIsEditing(false);
    setEditForm(null);
    setEditFieldErrors({});
    setEditError('');
  };

  const updateEditForm = (nextForm, field) => {
    setEditForm(nextForm);
    if (editFieldErrors[field]) {
      setEditFieldErrors((current) => ({ ...current, [field]: '' }));
    }
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    if (editSubmitLockRef.current || !canEditMember) return;
    setEditError('');
    const nextFieldErrors = {};
    if (!editForm.first_name.trim()) nextFieldErrors.first_name = t('members.validation.firstNameRequired');
    if (!editForm.last_name.trim()) nextFieldErrors.last_name = t('members.validation.lastNameRequired');
    const memberPayload = buildMemberPayload(editForm, member);
    if (
      Object.prototype.hasOwnProperty.call(memberPayload, 'national_id')
      && memberPayload.national_id !== null
      && !isValidRwandaNationalId(memberPayload.national_id)
    ) {
      nextFieldErrors.national_id = t('members.validation.nationalIdInvalid');
    }
    const addressChanged = MEMBER_ADDRESS_FIELDS.some((field) => (
      Object.prototype.hasOwnProperty.call(memberPayload, field)
    ));
    const addressLocation = getMemberAddressLocation(editForm);
    if (
      addressChanged
      && hasAnyLocation(addressLocation, { includeVillage: true })
      && !hasCompleteLocation(addressLocation, { includeVillage: true })
    ) {
      nextFieldErrors.address_location = t('locations.memberIncomplete');
    }
    setEditFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      return;
    }
    if (editForm.phone && !isValidRwandaLocalPhone(editForm.phone)) {
      setEditError(t('validation.phoneInvalid'));
      return;
    }

    editSubmitLockRef.current = true;
    setIsSavingEdit(true);
    try {
      const updated = await updateMember(id, memberPayload);
      setMember({ ...member, ...updated });
      setIsEditing(false);
      setEditForm(null);
      setEditFieldErrors({});
      setFeedback(t('memberDetail.updated'));
    } catch {
      setEditError(t('memberDetail.saveError'));
    } finally {
      editSubmitLockRef.current = false;
      setIsSavingEdit(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!canDeleteMember) return;
    if (!window.confirm(t('memberDetail.deleteConfirm', { name: `${member.first_name} ${member.last_name}` }))) return;
    setIsDeleting(true);
    try {
      await deleteMember(id);
      navigate('/members');
    } catch {
      window.alert(t('memberDetail.deleteError'));
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <DashboardLayout><div className="flex h-64 items-center justify-center text-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('common.loading')}</div></DashboardLayout>;
  }

  if (error || !member) {
    return <DashboardLayout><div className="rounded-xl bg-clay/5 p-6 text-sm text-clay">{error || t('memberDetail.notFound')}</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      {feedback && <div className="mb-5 rounded-lg border border-forest/20 bg-forest/5 px-4 py-3 text-sm text-forest" role="status">{feedback}</div>}
      <Link to="/members" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"><ArrowLeft className="h-4 w-4" />{t('memberDetail.back')}</Link>

      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{member.first_name} {member.last_name}</h1>
          <div className="mt-2 flex items-center gap-3"><Badge status={member.status} />{member.cooperative && <span className="text-sm text-ink-soft">{member.cooperative.name}</span>}</div>
        </div>
        <div className="flex gap-2">
          {canEditMember && <button type="button" onClick={startEdit} className="focus-ring flex items-center gap-1.5 rounded-lg border border-sand px-3 py-1.5 text-sm font-medium text-ink hover:bg-sand/30"><Pencil className="h-3.5 w-3.5" />{t('common.edit')}</button>}
          {canDeleteMember && <button type="button" onClick={handleDeleteMember} disabled={isDeleting} className="focus-ring flex items-center gap-1.5 rounded-lg border border-sand px-3 py-1.5 text-sm font-medium text-clay hover:bg-clay/5 disabled:opacity-50">{isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}{t('common.delete')}</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-card">
          <h2 className="mb-4 font-display text-base font-semibold text-ink">{isEditing ? t('members.edit') : t('memberDetail.details')}</h2>
          {isEditing ? (
            <form onSubmit={handleSaveEdit} noValidate>
              {editError && <div className="mb-3 rounded-lg bg-clay/10 px-3 py-2 text-xs text-clay" role="alert">{editError}</div>}
              <MemberFormFields idPrefix="member-edit" form={editForm} onChange={updateEditForm} errors={editFieldErrors} disabled={isSavingEdit} />
              <div className="flex gap-2"><button type="submit" disabled={isSavingEdit} className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60">{isSavingEdit && <Loader2 className="h-4 w-4 animate-spin" />}{t('common.save')}</button><button type="button" onClick={cancelEdit} disabled={isSavingEdit} className="focus-ring rounded-lg border border-sand px-4 py-2 text-sm font-medium text-ink-soft hover:bg-sand/30 disabled:opacity-60">{t('common.cancel')}</button></div>
            </form>
          ) : (
            <dl className="space-y-3 text-sm">
              {[[t('members.fields.nationalId'), member.national_id], [t('members.fields.phone'), member.phone], [t('members.fields.gender'), MEMBER_GENDERS.includes(member.gender) ? t(`members.gender.${member.gender}`) : member.gender], [t('members.fields.residentialAddress'), getMemberAddressDisplay(member)], [t('members.fields.membershipDate'), member.membership_date]].map(([label, value]) => <div key={label} className="flex justify-between border-b border-sand pb-3 last:border-0"><dt className="text-ink-soft">{label}</dt><dd className="text-right text-ink">{value || '—'}</dd></div>)}
            </dl>
          )}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2"><Sprout className="h-4 w-4 text-gold-dark" /><h2 className="font-display text-base font-semibold text-ink">{t('farmers.profile')}</h2></div>
            {member.farmerProfile && !showFarmerForm && canEditFarmer && <button type="button" onClick={startEditFarmer} className="focus-ring flex items-center gap-1 rounded-lg border border-sand px-2.5 py-1 text-xs font-medium text-ink hover:bg-sand/30"><Pencil className="h-3 w-3" />{t('common.edit')}</button>}
          </div>
          {member.farmerProfile && !showFarmerForm ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-sand pb-3"><dt className="text-ink-soft">{t('farmers.fields.cropType')}</dt><dd className="text-ink">{member.farmerProfile.crop_type || '—'}</dd></div>
              <div className="flex justify-between border-b border-sand pb-3"><dt className="text-ink-soft">{t('farmers.fields.farmSize')}</dt><dd className="figure text-ink">{getFarmSizeDisplay(member.farmerProfile) || '—'}</dd></div>
              <div className="flex items-center justify-between gap-4 border-b border-sand pb-3"><dt className="flex items-center gap-1 text-ink-soft"><MapPin className="h-3.5 w-3.5" />{t('farmers.fields.location')}</dt><dd className="text-right text-ink">{getFarmerLocationDisplay(member.farmerProfile) || '—'}</dd></div>
              {[
                [t('locations.district'), member.farmerProfile.district],
                [t('locations.sector'), member.farmerProfile.sector],
                [t('locations.cell'), member.farmerProfile.cell],
                [t('locations.village'), member.farmerProfile.village],
              ].map(([label, value]) => <div key={label} className="flex justify-between border-b border-sand pb-3 last:border-0"><dt className="text-ink-soft">{label}</dt><dd className="text-right text-ink">{value || '—'}</dd></div>)}
            </dl>
          ) : showFarmerForm ? (
            <form onSubmit={handleSaveFarmer} noValidate>
              {farmerError && <div className="mb-3 rounded-lg bg-clay/10 px-3 py-2 text-xs text-clay" role="alert">{farmerError}</div>}
              <div className="mb-3"><label htmlFor="crop-type" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('farmers.fields.cropType')}</label><input id="crop-type" maxLength={100} disabled={isSavingFarmer} value={farmerForm.crop_type} onChange={(event) => setFarmerForm({ ...farmerForm, crop_type: event.target.value })} placeholder={t('farmers.placeholders.cropType')} className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-sand/30" /></div>
              <FarmSizeFields
                idPrefix="farmer"
                form={farmerForm}
                onChange={(nextForm, field) => {
                  setFarmerForm(nextForm);
                  if (farmerFieldErrors[field]) {
                    setFarmerFieldErrors((current) => ({ ...current, [field]: '' }));
                  }
                }}
                errors={farmerFieldErrors}
                disabled={isSavingFarmer}
              />
              {farmerForm.legacy_location && <div className="mb-3 rounded-lg bg-sand/30 px-3 py-2 text-xs text-ink-soft">{t('locations.legacyPreserved', { location: farmerForm.legacy_location })}</div>}
              <div className="mb-4"><RwandaLocationFields idPrefix="farmer-location" value={farmerForm} onChange={setFarmerForm} includeVillage disabled={isSavingFarmer} /></div>
              <div className="flex gap-2"><button type="submit" disabled={isSavingFarmer} className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60">{isSavingFarmer && <Loader2 className="h-4 w-4 animate-spin" />}{t('common.save')}</button><button type="button" onClick={cancelFarmerForm} disabled={isSavingFarmer} className="focus-ring rounded-lg border border-sand px-4 py-2 text-sm font-medium text-ink-soft hover:bg-sand/30 disabled:opacity-60">{t('common.cancel')}</button></div>
            </form>
          ) : (
            <div className="py-4 text-center"><p className="mb-3 text-sm text-ink-soft">{t('farmers.noProfile')}</p>{canEditFarmer && <button type="button" onClick={startCreateFarmer} className="focus-ring rounded-lg bg-gold px-4 py-2 text-sm font-medium text-white hover:bg-gold-dark">{t('farmers.addProfile')}</button>}</div>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center gap-2"><FileText className="h-4 w-4 text-ink-soft" /><h2 className="font-display text-base font-semibold text-ink">{t('common.documents')}</h2></div>
        {documents.length > 0 && <ul className="mb-4 divide-y divide-sand">{documents.map((document) => <li key={document.id} className="flex items-center justify-between py-2.5 text-sm"><div className="min-w-0"><p className="truncate font-medium text-ink">{document.original_name}</p>{document.description && <p className="truncate text-xs text-ink-soft">{document.description}</p>}</div><div className="flex shrink-0 gap-1"><button onClick={() => downloadDocument(document.id, document.original_name)} title={t('documents.download')} className="focus-ring rounded-lg p-1.5 text-ink-soft hover:bg-forest/10 hover:text-forest"><Download className="h-4 w-4" /></button>{canDeleteDocument && <button onClick={() => handleDeleteDocument(document)} title={t('common.delete')} className="focus-ring rounded-lg p-1.5 text-ink-soft hover:bg-clay/10 hover:text-clay"><Trash2 className="h-4 w-4" /></button>}</div></li>)}</ul>}
        {canUploadDocument && <form onSubmit={handleUploadDocument} className="flex flex-wrap items-end gap-3">
          {docError && <div className="w-full rounded-lg bg-clay/10 px-3.5 py-2.5 text-sm text-clay" role="alert">{docError}</div>}
          <div className="min-w-[220px] flex-1"><label htmlFor="member-document" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('documents.file')}</label><input ref={documentInputRef} id="member-document" type="file" accept={DOCUMENT_UPLOAD_ACCEPT} disabled={isUploading} onChange={(event) => { setDocFile(event.target.files[0]); setDocError(''); }} className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-sand file:px-3 file:py-1 file:text-xs file:font-medium file:text-ink" /><p className="mt-1 text-xs text-ink-soft">{t('documents.fileTypes')}</p></div>
          <div className="min-w-[220px] flex-1"><label htmlFor="document-description" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('documents.description')} ({t('documents.optional')})</label><input id="document-description" disabled={isUploading} value={docDescription} onChange={(event) => setDocDescription(event.target.value)} placeholder={t('documents.example')} className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm" /></div>
          <button type="submit" disabled={isUploading} className="focus-ring flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60">{isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{isUploading ? t('documents.uploading') : t('documents.upload')}</button>
        </form>}
      </div>
    </DashboardLayout>
  );
};

export default MemberDetailPage;
