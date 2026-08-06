import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Sprout, MapPin, FileText, Upload, Download, Trash2, Pencil } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import Badge from '../components/Badge';
import { getMember, updateMember, deleteMember } from '../api/members';
import { createFarmer, updateFarmer } from '../api/farmers';
import { listDocuments, uploadDocument, downloadDocument, deleteDocument } from '../api/documents';

const emptyFarmerForm = { farm_size_ha: '', location: '', crop_type: '' };

const MemberDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showFarmerForm, setShowFarmerForm] = useState(false);
  const [isEditingFarmer, setIsEditingFarmer] = useState(false);
  const [farmerForm, setFarmerForm] = useState(emptyFarmerForm);
  const [farmerError, setFarmerError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [documents, setDocuments] = useState([]);
  const [docFile, setDocFile] = useState(null);
  const [docDescription, setDocDescription] = useState('');
  const [docError, setDocError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fetchDocuments = async () => {
    try {
      const data = await listDocuments({ owner_type: 'member', owner_id: id });
      setDocuments(data);
    } catch {
      // non-critical — the rest of the page still works without documents loading
    }
  };

  const fetchMember = async () => {
    setIsLoading(true);
    try {
      const data = await getMember(id);
      setMember(data);
    } catch (err) {
      setError('Could not load this member.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMember();
    fetchDocuments();
  }, [id]);

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    setDocError('');
    if (!docFile) {
      setDocError('Choose a file to upload.');
      return;
    }
    setIsUploading(true);
    try {
      await uploadDocument({
        file: docFile,
        owner_type: 'member',
        owner_id: id,
        description: docDescription,
      });
      setDocFile(null);
      setDocDescription('');
      fetchDocuments();
    } catch (err) {
      setDocError(err.response?.data?.message || 'Could not upload this file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (doc) => {
    if (!window.confirm(`Delete "${doc.original_name}"?`)) return;
    try {
      await deleteDocument(doc.id);
      fetchDocuments();
    } catch {
      window.alert('Could not delete this document.');
    }
  };

  const handleCreateFarmer = async (e) => {
    e.preventDefault();
    setFarmerError('');
    setIsSaving(true);
    try {
      if (isEditingFarmer && member.farmerProfile) {
        await updateFarmer(member.farmerProfile.id, farmerForm);
      } else {
        await createFarmer({ ...farmerForm, member_id: Number(id) });
      }
      setShowFarmerForm(false);
      setIsEditingFarmer(false);
      setFarmerForm(emptyFarmerForm);
      fetchMember();
    } catch (err) {
      setFarmerError(
        err.response?.data?.message ||
          `Could not ${isEditingFarmer ? 'update' : 'create'} farmer profile.`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const startEditFarmer = () => {
    setFarmerForm({
      crop_type: member.farmerProfile.crop_type || '',
      farm_size_ha: member.farmerProfile.farm_size_ha || '',
      location: member.farmerProfile.location || '',
    });
    setIsEditingFarmer(true);
    setShowFarmerForm(true);
    setFarmerError('');
  };

  const startEdit = () => {
    setEditForm({
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      gender: member.gender || '',
      phone: member.phone || '',
      address: member.address || '',
      membership_date: member.membership_date || '',
    });
    setEditError('');
    setIsEditing(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditError('');
    setIsSavingEdit(true);
    try {
      const updated = await updateMember(id, editForm);
      setMember({ ...member, ...updated });
      setIsEditing(false);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Could not save these changes.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteMember = async () => {
    if (
      !window.confirm(
        `Delete ${member.first_name} ${member.last_name}? This also removes their farmer profile if they have one, and cannot be undone.`
      )
    ) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteMember(id);
      navigate('/members');
    } catch (err) {
      window.alert(err.response?.data?.message || 'Could not delete this member.');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center text-ink-soft">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      </DashboardLayout>
    );
  }

  if (error || !member) {
    return (
      <DashboardLayout>
        <div className="rounded-xl bg-clay/5 p-6 text-sm text-clay">{error || 'Member not found.'}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Link
        to="/members"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to members
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {member.first_name} {member.last_name}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <Badge status={member.status} />
            {member.cooperative && (
              <span className="text-sm text-ink-soft">{member.cooperative.name}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={startEdit}
            className="focus-ring flex items-center gap-1.5 rounded-lg border border-sand px-3 py-1.5 text-sm font-medium text-ink hover:bg-sand/30"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            onClick={handleDeleteMember}
            disabled={isDeleting}
            className="focus-ring flex items-center gap-1.5 rounded-lg border border-sand px-3 py-1.5 text-sm font-medium text-clay hover:bg-clay/5 disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Member details card */}
        <div className="rounded-xl bg-white p-6 shadow-card">
          <h2 className="mb-4 font-display text-base font-semibold text-ink">Member details</h2>

          {isEditing ? (
            <form onSubmit={handleSaveEdit}>
              {editError && (
                <div className="mb-3 rounded-lg bg-clay/10 px-3 py-2 text-xs text-clay">
                  {editError}
                </div>
              )}
              <div className="mb-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                    First name
                  </label>
                  <input
                    required
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                    Last name
                  </label>
                  <input
                    required
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                  Gender
                </label>
                <select
                  value={editForm.gender}
                  onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                  className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
                >
                  <option value="">Not specified</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                  Phone
                </label>
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
                />
              </div>
              <div className="mb-3">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                  Address
                </label>
                <input
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
                />
              </div>
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                  Membership date
                </label>
                <input
                  type="date"
                  value={editForm.membership_date}
                  onChange={(e) => setEditForm({ ...editForm, membership_date: e.target.value })}
                  className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60"
                >
                  {isSavingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="focus-ring rounded-lg border border-sand px-4 py-2 text-sm font-medium text-ink-soft hover:bg-sand/30"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-sand pb-3">
                <dt className="text-ink-soft">Phone</dt>
                <dd className="text-ink">{member.phone || '—'}</dd>
              </div>
              <div className="flex justify-between border-b border-sand pb-3">
                <dt className="text-ink-soft">Gender</dt>
                <dd className="capitalize text-ink">{member.gender || '—'}</dd>
              </div>
              <div className="flex justify-between border-b border-sand pb-3">
                <dt className="text-ink-soft">Address</dt>
                <dd className="text-ink">{member.address || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Membership date</dt>
                <dd className="text-ink">{member.membership_date || '—'}</dd>
              </div>
            </dl>
          )}
        </div>

        {/* Farmer profile card */}
        <div className="rounded-xl bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sprout className="h-4 w-4 text-gold-dark" />
              <h2 className="font-display text-base font-semibold text-ink">Farmer profile</h2>
            </div>
            {member.farmerProfile && !showFarmerForm && (
              <button
                onClick={startEditFarmer}
                className="focus-ring flex items-center gap-1 rounded-lg border border-sand px-2.5 py-1 text-xs font-medium text-ink hover:bg-sand/30"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
            )}
          </div>

          {member.farmerProfile && !showFarmerForm ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-sand pb-3">
                <dt className="text-ink-soft">Crop type</dt>
                <dd className="text-ink">{member.farmerProfile.crop_type || '—'}</dd>
              </div>
              <div className="flex justify-between border-b border-sand pb-3">
                <dt className="text-ink-soft">Farm size</dt>
                <dd className="figure text-ink">
                  {member.farmerProfile.farm_size_ha
                    ? `${member.farmerProfile.farm_size_ha} ha`
                    : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-1 text-ink-soft">
                  <MapPin className="h-3.5 w-3.5" /> Location
                </dt>
                <dd className="text-ink">{member.farmerProfile.location || '—'}</dd>
              </div>
            </dl>
          ) : showFarmerForm ? (
            <form onSubmit={handleCreateFarmer}>
              {farmerError && (
                <div className="mb-3 rounded-lg bg-clay/10 px-3 py-2 text-xs text-clay">
                  {farmerError}
                </div>
              )}
              <div className="mb-3">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                  Crop type
                </label>
                <input
                  value={farmerForm.crop_type}
                  onChange={(e) => setFarmerForm({ ...farmerForm, crop_type: e.target.value })}
                  placeholder="e.g. Coffee"
                  className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
                />
              </div>
              <div className="mb-3">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                  Farm size (hectares)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={farmerForm.farm_size_ha}
                  onChange={(e) => setFarmerForm({ ...farmerForm, farm_size_ha: e.target.value })}
                  className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
                />
              </div>
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                  Location
                </label>
                <input
                  value={farmerForm.location}
                  onChange={(e) => setFarmerForm({ ...farmerForm, location: e.target.value })}
                  placeholder="e.g. Nyamagabe, Gasaka"
                  className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowFarmerForm(false);
                    setIsEditingFarmer(false);
                  }}
                  className="focus-ring rounded-lg border border-sand px-4 py-2 text-sm font-medium text-ink-soft hover:bg-sand/30"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="py-4 text-center">
              <p className="mb-3 text-sm text-ink-soft">
                This member doesn't have a farmer profile yet.
              </p>
              <button
                onClick={() => setShowFarmerForm(true)}
                className="focus-ring rounded-lg bg-gold px-4 py-2 text-sm font-medium text-white hover:bg-gold-dark"
              >
                Add farmer profile
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Documents section */}
      <div className="mt-5 rounded-xl bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 text-ink-soft" />
          <h2 className="font-display text-base font-semibold text-ink">Documents</h2>
        </div>

        {documents.length > 0 && (
          <ul className="mb-4 divide-y divide-sand">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{doc.original_name}</p>
                  {doc.description && (
                    <p className="truncate text-xs text-ink-soft">{doc.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => downloadDocument(doc.id, doc.original_name)}
                    title="Download"
                    className="focus-ring rounded-lg p-1.5 text-ink-soft hover:bg-forest/10 hover:text-forest"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(doc)}
                    title="Delete"
                    className="focus-ring rounded-lg p-1.5 text-ink-soft hover:bg-clay/10 hover:text-clay"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleUploadDocument} className="flex flex-wrap items-end gap-3">
          {docError && (
            <div className="w-full rounded-lg bg-clay/10 px-3.5 py-2.5 text-sm text-clay">
              {docError}
            </div>
          )}
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              File
            </label>
            <input
              type="file"
              onChange={(e) => setDocFile(e.target.files[0])}
              className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-sand file:px-3 file:py-1 file:text-xs file:font-medium file:text-ink"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              Description (optional)
            </label>
            <input
              value={docDescription}
              onChange={(e) => setDocDescription(e.target.value)}
              placeholder="e.g. National ID copy"
              className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isUploading}
            className="focus-ring flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60"
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default MemberDetailPage;
