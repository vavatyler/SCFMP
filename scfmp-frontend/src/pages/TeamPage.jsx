import { useCallback, useEffect, useState } from 'react';
import { Github, Linkedin, Loader2, Mail, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../components/DashboardLayout';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import { createTeamMember, deleteTeamMember, listTeamMembers, updateTeamMember } from '../api/teamMembers';

const emptyForm = {
  full_name: '', position: '', biography: '', responsibilities: '', skills: '', photo_url: '',
  linkedin_url: '', github_url: '', email: '', status: 'active', display_order: 0,
};
const splitItems = (value) => String(value || '').split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);

const TeamPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canManage = user?.role === 'super_admin';
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try { setMembers(await listTeamMembers(canManage ? { include_inactive: true } : {})); }
    catch { setError(t('team.loadError')); }
    finally { setIsLoading(false); }
  }, [canManage, t]);
  useEffect(() => { load(); }, [load]);

  const openForm = (member = null) => {
    setEditing(member);
    setForm(member ? { ...emptyForm, ...member } : { ...emptyForm });
    setFormError('');
  };
  const closeForm = () => { setEditing(null); setForm(null); };

  const save = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setFormError('');
    try {
      if (editing) await updateTeamMember(editing.id, form);
      else await createTeamMember(form);
      closeForm();
      await load();
    } catch (requestError) {
      setFormError(requestError.response?.data?.message || t('team.saveError'));
    } finally { setIsSaving(false); }
  };

  const remove = async (member) => {
    if (!window.confirm(t('team.deleteConfirm', { name: member.full_name }))) return;
    try { await deleteTeamMember(member.id); await load(); }
    catch { window.alert(t('team.deleteError')); }
  };

  return (
    <DashboardLayout title={t('team.title')} subtitle={t('team.subtitle')}>
      {canManage && <div className="mb-6 flex justify-end"><button onClick={() => openForm()} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg bg-forest px-4 text-sm font-medium text-paper"><Plus className="h-4 w-4" />{t('team.add')}</button></div>}
      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center rounded-xl bg-white text-ink-soft shadow-card"><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('common.loading')}</div>
      ) : error ? (
        <div className="rounded-xl bg-white p-6 text-sm text-clay shadow-card" role="alert">{error}</div>
      ) : members.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center shadow-card"><UserRound className="mx-auto mb-3 h-10 w-10 text-ink-soft" /><h2 className="font-display text-lg font-semibold text-ink">{t('team.emptyTitle')}</h2><p className="mx-auto mt-2 max-w-xl text-sm text-ink-soft">{t('team.emptyBody')}</p></div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => (
            <article key={member.id} className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-card">
              <div className="flex items-start gap-4 border-b border-sand p-5">
                {member.photo_url ? <img src={member.photo_url} alt={member.full_name} className="h-16 w-16 shrink-0 rounded-xl object-cover" /> : <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-forest/10 text-forest"><UserRound className="h-7 w-7" /></div>}
                <div className="min-w-0 flex-1"><h2 className="break-words font-display text-lg font-semibold text-ink">{member.full_name}</h2><p className="mt-1 text-sm font-medium text-forest">{member.position}</p>{canManage && <div className="mt-2"><Badge status={member.status}>{t(`common.${member.status}`)}</Badge></div>}</div>
              </div>
              <div className="space-y-4 p-5">
                {member.biography && <p className="text-sm leading-6 text-ink-soft">{member.biography}</p>}
                {splitItems(member.responsibilities).length > 0 && <div><h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{t('team.responsibilities')}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">{splitItems(member.responsibilities).map((item) => <li key={item}>{item}</li>)}</ul></div>}
                {splitItems(member.skills).length > 0 && <div className="flex flex-wrap gap-2">{splitItems(member.skills).map((skill) => <span key={skill} className="rounded-full bg-sand/50 px-2.5 py-1 text-xs text-ink-soft">{skill}</span>)}</div>}
                <div className="flex flex-wrap gap-2">
                  {member.linkedin_url && <a href={member.linkedin_url} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="focus-ring rounded-lg border border-sand p-2 text-ink-soft"><Linkedin className="h-4 w-4" /></a>}
                  {member.github_url && <a href={member.github_url} target="_blank" rel="noreferrer" aria-label="GitHub" className="focus-ring rounded-lg border border-sand p-2 text-ink-soft"><Github className="h-4 w-4" /></a>}
                  {member.email && <a href={`mailto:${member.email}`} aria-label={t('team.email')} className="focus-ring rounded-lg border border-sand p-2 text-ink-soft"><Mail className="h-4 w-4" /></a>}
                  {canManage && <><button onClick={() => openForm(member)} aria-label={t('common.edit')} className="focus-ring ml-auto rounded-lg border border-sand p-2 text-ink-soft"><Pencil className="h-4 w-4" /></button><button onClick={() => remove(member)} aria-label={t('common.delete')} className="focus-ring rounded-lg border border-sand p-2 text-clay"><Trash2 className="h-4 w-4" /></button></>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal title={editing ? t('team.edit') : t('team.add')} isOpen={Boolean(form)} onClose={closeForm} maxWidth="max-w-2xl">
        {form && <form onSubmit={save} className="space-y-4">
          {formError && <div className="rounded-lg bg-clay/10 p-3 text-sm text-clay" role="alert">{formError}</div>}
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('team.fullName')}<input required maxLength={150} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('team.position')}<input required list="team-role-concepts" maxLength={150} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /><datalist id="team-role-concepts"><option value="Founder & Managing Director" /><option value="Co-Founder & Lead Software Engineer" /><option value="Lead Software Engineer / Full-Stack Developer" /></datalist></label></div>
          <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('team.biography')}<textarea rows={3} maxLength={3000} value={form.biography || ''} onChange={(e) => setForm({ ...form, biography: e.target.value })} className="focus-ring mt-1.5 w-full rounded-lg border border-sand px-3 py-2 text-sm" /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('team.responsibilities')}<textarea rows={4} maxLength={3000} value={form.responsibilities || ''} onChange={(e) => setForm({ ...form, responsibilities: e.target.value })} placeholder={t('team.onePerLine')} className="focus-ring mt-1.5 w-full rounded-lg border border-sand px-3 py-2 text-sm" /></label><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('team.skills')}<textarea rows={4} maxLength={2000} value={form.skills || ''} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder={t('team.onePerLine')} className="focus-ring mt-1.5 w-full rounded-lg border border-sand px-3 py-2 text-sm" /></label></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('team.photoUrl')}<input type="url" value={form.photo_url || ''} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('team.email')}<input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">LinkedIn<input type="url" value={form.linkedin_url || ''} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">GitHub<input type="url" value={form.github_url || ''} onChange={(e) => setForm({ ...form, github_url: e.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('common.status')}<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm"><option value="active">{t('common.active')}</option><option value="inactive">{t('common.inactive')}</option></select></label><label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('team.displayOrder')}<input type="number" min="0" max="10000" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 text-sm" /></label></div>
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={closeForm} className="focus-ring min-h-11 rounded-lg border border-sand px-4 text-sm">{t('common.cancel')}</button><button disabled={isSaving} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-forest px-4 text-sm font-medium text-paper disabled:opacity-50">{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}{t('common.save')}</button></div>
        </form>}
      </Modal>
    </DashboardLayout>
  );
};

export default TeamPage;
