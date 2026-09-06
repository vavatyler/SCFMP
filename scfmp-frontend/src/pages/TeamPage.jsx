import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Eye,
  Github,
  Linkedin,
  Loader2,
  Mail,
  Pencil,
  Plus,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../components/DashboardLayout';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import { createTeamMember, deleteTeamMember, listTeamMembers, updateTeamMember, uploadTeamMemberPhoto } from '../api/teamMembers';
import { listUsers } from '../api/users';
import { TEAM_ROLES } from '../config/teamRoles';
import {
  PERMISSION_MODULES,
  PERMISSIONS,
  PLATFORM_ROLES,
  SYSTEM_ROLE_LABELS,
  accessibleModules,
  permissionsForRole,
} from '../config/permissions';

const emptyForm = {
  full_name: '',
  position: '',
  biography: '',
  responsibilities: '',
  skills: '',
  photo_url: '',
  linkedin_url: '',
  github_url: '',
  email: '',
  status: 'active',
  profile_visibility: 'visible',
  linked_user_id: '',
  display_order: 0,
  access: {
    system_access_enabled: false,
    account_status: 'active',
    platform_role: 'technical_admin',
    permissions: permissionsForRole('technical_admin'),
  },
};

const splitItems = (value) => String(value || '')
  .split(/\r?\n|,/)
  .map((item) => item.trim())
  .filter(Boolean);

const validOptionalHttpsUrl = (value) => {
  if (!String(value || '').trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || (
      url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    );
  } catch {
    return false;
  }
};

const ProfileImage = ({ member, large = false }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [member.photo_url]);
  const sizeClass = large ? 'aspect-[4/3] w-full' : 'aspect-[4/3] w-full';
  if (!member.photo_url || failed) {
    return (
      <div className={`grid ${sizeClass} place-items-center bg-forest/10 text-forest`}>
        <UserRound className={large ? 'h-16 w-16' : 'h-12 w-12'} />
      </div>
    );
  }
  return (
    <img
      src={member.photo_url}
      alt={member.full_name}
      onError={() => setFailed(true)}
      className={`${sizeClass} bg-sand/30 object-cover object-center`}
    />
  );
};

const SectionHeading = ({ children }) => (
  <h3 className="border-b border-sand pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-forest">
    {children}
  </h3>
);

const fieldClass = 'focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand bg-white px-3 text-sm text-ink';
const textAreaClass = 'focus-ring mt-1.5 w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm text-ink';
const labelClass = 'text-xs font-medium uppercase tracking-wide text-ink-soft';

const TeamPage = () => {
  const { t } = useTranslation();
  const { user, can } = useAuth();
  const canManage = user?.role === 'super_admin' && can(PERMISSIONS.TEAM_MANAGE);
  const [members, setMembers] = useState([]);
  const [userAccounts, setUserAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      if (canManage) {
        const [team, accounts] = await Promise.all([
          listTeamMembers({ include_inactive: true, include_hidden: true }),
          listUsers({ account_scope: 'platform' }),
        ]);
        setMembers(team);
        setUserAccounts(accounts);
      } else {
        setMembers(await listTeamMembers());
        setUserAccounts([]);
      }
    } catch {
      setError(t('team.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [canManage, t]);

  useEffect(() => { load(); }, [load]);

  const openForm = (member = null) => {
    setEditing(member);
    setForm(member ? {
      ...emptyForm,
      ...member,
      linked_user_id: member.linked_user_id || '',
      access: {
        ...emptyForm.access,
        ...member.access,
        permissions: [...(member.access?.permissions || [])],
      },
    } : {
      ...emptyForm,
      access: { ...emptyForm.access, permissions: [...emptyForm.access.permissions] },
    });
    setFormError('');
  };

  const closeForm = () => {
    setEditing(null);
    setForm(null);
  };

  const updateAccess = (changes) => setForm((current) => ({
    ...current,
    access: { ...current.access, ...changes },
  }));

  const chooseAccount = (value) => {
    const account = userAccounts.find((item) => String(item.id) === value);
    if (!account) {
      setForm({
        ...form,
        linked_user_id: '',
        access: { ...emptyForm.access, permissions: [...emptyForm.access.permissions] },
      });
      return;
    }
    setForm({
      ...form,
      linked_user_id: value,
      access: {
        system_access_enabled: account.system_access_enabled !== false,
        account_status: account.status,
        platform_role: account.role,
        last_login_at: account.last_login_at || null,
        permissions: [...(account.effective_permissions || permissionsForRole(account.role))],
      },
    });
  };

  const choosePlatformRole = (role) => updateAccess({
    platform_role: role,
    permissions: permissionsForRole(role),
  });

  const togglePermission = (permission, checked, module) => {
    const selected = new Set(form.access.permissions);
    if (checked) {
      selected.add(permission);
      if (permission === module.manage) selected.add(module.view);
    } else {
      selected.delete(permission);
      if (permission === module.view && module.manage) selected.delete(module.manage);
    }
    updateAccess({ permissions: [...selected] });
  };

  const needsAccessConfirmation = () => {
    if (!editing?.access || !form.linked_user_id) return false;
    return (
      (editing.access.system_access_enabled && !form.access.system_access_enabled)
      || (editing.access.account_status === 'active' && form.access.account_status === 'inactive')
      || form.access.permissions.length < editing.access.permissions.length
    );
  };

  const save = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!validOptionalHttpsUrl(form.photo_url)) {
      setFormError(t('team.photoUrlInvalid'));
      return;
    }
    if (needsAccessConfirmation() && !window.confirm(t('team.accessChangeConfirm'))) return;

    setIsSaving(true);
    try {
      const payload = {
        full_name: form.full_name,
        position: form.position,
        biography: form.biography,
        responsibilities: form.responsibilities,
        skills: form.skills,
        photo_url: form.photo_url,
        linkedin_url: form.linkedin_url,
        github_url: form.github_url,
        email: form.email,
        status: form.status,
        profile_visibility: form.profile_visibility,
        display_order: Number(form.display_order) || 0,
        linked_user_id: form.linked_user_id ? Number(form.linked_user_id) : null,
      };
      if (form.linked_user_id) {
        payload.access = {
          system_access_enabled: form.access.system_access_enabled,
          account_status: form.access.account_status,
          platform_role: form.access.platform_role,
          permissions: form.access.permissions,
        };
      }
      if (editing) await updateTeamMember(editing.id, payload);
      else await createTeamMember(payload);
      closeForm();
      await load();
    } catch (requestError) {
      const validationMessage = requestError.response?.data?.errors?.[0]?.msg;
      setFormError(validationMessage || requestError.response?.data?.message || t('team.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const choosePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFormError('');
    setIsUploadingPhoto(true);
    try {
      const photo_url = await uploadTeamMemberPhoto(file);
      setForm((current) => ({ ...current, photo_url }));
    } catch (requestError) {
      setFormError(requestError.response?.data?.message || t('team.photoUploadError'));
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const archive = async (member) => {
    if (!window.confirm(t('team.archiveConfirm', { name: member.full_name }))) return;
    try {
      await deleteTeamMember(member.id);
      await load();
    } catch {
      window.alert(t('team.archiveError'));
    }
  };

  const selectedModules = useMemo(
    () => accessibleModules(form?.access?.permissions || []),
    [form?.access?.permissions]
  );
  const isOwnAccount = Number(form?.linked_user_id) === Number(user?.id);

  return (
    <DashboardLayout title={t('team.title')} subtitle={t('team.subtitle')}>
      {canManage && (
        <div className="mb-6 flex justify-end">
          <button onClick={() => openForm()} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg bg-forest px-4 text-sm font-medium text-paper">
            <Plus className="h-4 w-4" />
            {t('team.add')}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center rounded-xl bg-white text-ink-soft shadow-card">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('common.loading')}
        </div>
      ) : error ? (
        <div className="rounded-xl bg-white p-6 text-sm text-clay shadow-card" role="alert">{error}</div>
      ) : members.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center shadow-card">
          <UserRound className="mx-auto mb-3 h-10 w-10 text-ink-soft" />
          <h2 className="font-display text-lg font-semibold text-ink">{t('team.emptyTitle')}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-ink-soft">{t('team.emptyBody')}</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => (
            <article key={member.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl bg-white shadow-card">
              <ProfileImage member={member} />
              <div className="flex flex-1 flex-col p-5">
                <div className="min-w-0">
                  <h2 className="break-words font-display text-lg font-semibold text-ink">{member.full_name}</h2>
                  <p className="mt-1 break-words text-sm font-medium leading-5 text-forest">{member.position}</p>
                  {canManage && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge status={member.status}>{t(`common.${member.status}`)}</Badge>
                      <span className="rounded-full bg-sand/50 px-2.5 py-1 text-xs text-ink-soft">
                        {t(`team.${member.profile_visibility}`)}
                      </span>
                    </div>
                  )}
                </div>
                {member.biography && <p className="mt-4 break-words text-sm leading-6 text-ink-soft">{member.biography}</p>}
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                  <button onClick={() => setViewing(member)} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-sand px-3 text-sm font-medium text-forest">
                    <Eye className="h-4 w-4" />{t('team.viewProfile')}
                  </button>
                  {canManage && (
                    <>
                      <button onClick={() => openForm(member)} aria-label={t('common.edit')} className="focus-ring ml-auto rounded-lg border border-sand p-2.5 text-ink-soft">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => archive(member)} aria-label={t('team.archive')} className="focus-ring rounded-lg border border-sand p-2.5 text-clay">
                        <Archive className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal title={viewing?.full_name || ''} isOpen={Boolean(viewing)} onClose={() => setViewing(null)} maxWidth="max-w-2xl">
        {viewing && (
          <article className="grid overflow-hidden rounded-xl border border-sand sm:grid-cols-[220px_1fr]">
            <ProfileImage member={viewing} large />
            <div className="min-w-0 space-y-4 p-5">
              <div>
                <h2 className="break-words font-display text-xl font-semibold text-ink">{viewing.full_name}</h2>
                <p className="mt-1 break-words text-sm font-medium text-forest">{viewing.position}</p>
              </div>
              {viewing.biography && <p className="break-words text-sm leading-6 text-ink-soft">{viewing.biography}</p>}
              {splitItems(viewing.responsibilities).length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{t('team.responsibilities')}</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
                    {splitItems(viewing.responsibilities).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}
              {splitItems(viewing.skills).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {splitItems(viewing.skills).map((skill) => <span key={skill} className="rounded-full bg-sand/50 px-2.5 py-1 text-xs text-ink-soft">{skill}</span>)}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {viewing.linkedin_url && <a href={viewing.linkedin_url} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="focus-ring rounded-lg border border-sand p-2 text-ink-soft"><Linkedin className="h-4 w-4" /></a>}
                {viewing.github_url && <a href={viewing.github_url} target="_blank" rel="noreferrer" aria-label="GitHub" className="focus-ring rounded-lg border border-sand p-2 text-ink-soft"><Github className="h-4 w-4" /></a>}
                {viewing.email && <a href={`mailto:${viewing.email}`} aria-label={t('team.email')} className="focus-ring rounded-lg border border-sand p-2 text-ink-soft"><Mail className="h-4 w-4" /></a>}
              </div>
            </div>
          </article>
        )}
      </Modal>

      <Modal title={editing ? t('team.edit') : t('team.add')} isOpen={Boolean(form)} onClose={closeForm} maxWidth="max-w-4xl">
        {form && (
          <form onSubmit={save} className="space-y-6">
            {formError && <div className="rounded-lg bg-clay/10 p-3 text-sm text-clay" role="alert">{formError}</div>}

            <section className="space-y-4">
              <SectionHeading>{t('team.personalInformation')}</SectionHeading>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>{t('team.fullName')}
                  <input required maxLength={150} value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} className={fieldClass} />
                </label>
                <label className={labelClass}>{t('team.photoUrl')}
                  <div className="mt-1.5 flex gap-2">
                    <input type="url" inputMode="url" placeholder="https://" value={form.photo_url || ''} onChange={(event) => setForm({ ...form, photo_url: event.target.value })} className={fieldClass.replace('mt-1.5 ', '')} />
                    <button type="button" onClick={() => photoInputRef.current?.click()} disabled={isUploadingPhoto || isSaving} className="focus-ring shrink-0 rounded-lg border border-sand px-3 text-sm font-medium text-forest disabled:opacity-60">
                      {isUploadingPhoto ? t('team.uploadingPhoto') : t('team.choosePhoto')}
                    </button>
                  </div>
                  <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} className="sr-only" />
                </label>
              </div>
              <label className={`block ${labelClass}`}>{t('team.biography')}
                <textarea rows={3} maxLength={3000} value={form.biography || ''} onChange={(event) => setForm({ ...form, biography: event.target.value })} className={textAreaClass} />
              </label>
            </section>

            <section className="space-y-4">
              <SectionHeading>{t('team.professionalInformation')}</SectionHeading>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>{t('team.officialRole')}
                  <select required value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} className={fieldClass}>
                    <option value="">{t('team.selectOfficialRole')}</option>
                    {TEAM_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                  </select>
                </label>
                <label className={labelClass}>{t('team.profileVisibility')}
                  <select value={form.profile_visibility} onChange={(event) => setForm({ ...form, profile_visibility: event.target.value })} className={fieldClass}>
                    <option value="visible">{t('team.visible')}</option>
                    <option value="hidden">{t('team.hidden')}</option>
                  </select>
                </label>
                <label className={labelClass}>{t('team.profileStatus')}
                  <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className={fieldClass}>
                    <option value="active">{t('common.active')}</option>
                    <option value="inactive">{t('common.inactive')}</option>
                  </select>
                </label>
                <label className={labelClass}>{t('team.displayOrder')}
                  <input type="number" min="0" max="10000" value={form.display_order} onChange={(event) => setForm({ ...form, display_order: event.target.value })} className={fieldClass} />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>{t('team.responsibilities')}
                  <textarea rows={4} maxLength={3000} value={form.responsibilities || ''} onChange={(event) => setForm({ ...form, responsibilities: event.target.value })} placeholder={t('team.onePerLine')} className={textAreaClass} />
                </label>
                <label className={labelClass}>{t('team.skills')}
                  <textarea rows={4} maxLength={2000} value={form.skills || ''} onChange={(event) => setForm({ ...form, skills: event.target.value })} placeholder={t('team.onePerLine')} className={textAreaClass} />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className={labelClass}>{t('team.email')}
                  <input type="email" value={form.email || ''} onChange={(event) => setForm({ ...form, email: event.target.value })} className={fieldClass} />
                </label>
                <label className={labelClass}>LinkedIn
                  <input type="url" value={form.linkedin_url || ''} onChange={(event) => setForm({ ...form, linkedin_url: event.target.value })} className={fieldClass} />
                </label>
                <label className={labelClass}>GitHub
                  <input type="url" value={form.github_url || ''} onChange={(event) => setForm({ ...form, github_url: event.target.value })} className={fieldClass} />
                </label>
              </div>
            </section>

            {canManage && (
              <section className="space-y-4 rounded-xl border border-sand bg-sand/10 p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-forest" />
                  <SectionHeading>{t('team.manageSystemAccess')}</SectionHeading>
                </div>
                <p className="text-sm text-ink-soft">{t('team.systemAccessHelp')}</p>
                <p className="text-xs text-ink-soft">{t('team.platformAccountsOnly')}</p>
                <label className={`block ${labelClass}`}>{t('team.linkedAccount')}
                  <select value={form.linked_user_id} onChange={(event) => chooseAccount(event.target.value)} className={fieldClass}>
                    <option value="">{t('team.noLinkedAccount')}</option>
                    {userAccounts
                      .filter((account) => !account.official_role || Number(account.id) === Number(form.linked_user_id))
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.first_name} {account.last_name} — {account.email}
                        </option>
                      ))}
                  </select>
                </label>

                <fieldset disabled={!form.linked_user_id} className="space-y-4 disabled:opacity-55">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <label className={labelClass}>{t('team.accessStatus')}
                      <input readOnly value={form.linked_user_id ? (form.access.system_access_enabled && form.access.account_status === 'active' ? t('team.enabled') : t('team.disabled')) : t('team.notLinked')} className={`${fieldClass} bg-sand/20`} />
                    </label>
                    <label className={labelClass}>{t('team.systemAccess')}
                      <select disabled={isOwnAccount} value={form.access.system_access_enabled ? 'enabled' : 'disabled'} onChange={(event) => updateAccess({ system_access_enabled: event.target.value === 'enabled' })} className={fieldClass}>
                        <option value="enabled">{t('team.enabled')}</option>
                        <option value="disabled">{t('team.disabled')}</option>
                      </select>
                    </label>
                    <label className={labelClass}>{t('team.accountActivationStatus')}
                      <select disabled={isOwnAccount} value={form.access.account_status} onChange={(event) => updateAccess({ account_status: event.target.value })} className={fieldClass}>
                        <option value="active">{t('common.active')}</option>
                        <option value="inactive">{t('common.inactive')}</option>
                      </select>
                    </label>
                    <label className={labelClass}>{t('team.platformRole')}
                      <select disabled={isOwnAccount} value={form.access.platform_role} onChange={(event) => choosePlatformRole(event.target.value)} className={fieldClass}>
                        {PLATFORM_ROLES.map((role) => <option key={role} value={role}>{SYSTEM_ROLE_LABELS[role]}</option>)}
                      </select>
                    </label>
                    <label className={labelClass}>{t('team.lastLogin')}
                      <input readOnly value={form.access.last_login_at ? new Date(form.access.last_login_at).toLocaleString() : t('team.neverSignedIn')} className={`${fieldClass} bg-sand/20`} />
                    </label>
                  </div>

                  <div>
                    <h4 className={labelClass}>{t('team.permissions')}</h4>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {PERMISSION_MODULES.map((module) => (
                        <div key={module.id} className="rounded-lg border border-sand bg-white p-3">
                          <p className="text-sm font-medium text-ink">{t(`team.modules.${module.id}`)}</p>
                          <div className="mt-2 flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 text-xs text-ink-soft">
                              <input type="checkbox" checked={form.access.permissions.includes(module.view)} onChange={(event) => togglePermission(module.view, event.target.checked, module)} className="h-4 w-4 accent-forest" />
                              {t('team.viewPermission')}
                            </label>
                            {module.manage && (
                              <label className="flex items-center gap-2 text-xs text-ink-soft">
                                <input type="checkbox" checked={form.access.permissions.includes(module.manage)} onChange={(event) => togglePermission(module.manage, event.target.checked, module)} className="h-4 w-4 accent-forest" />
                                {t('team.managePermission')}
                              </label>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className={labelClass}>{t('team.accessibleModules')}</h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedModules.length > 0
                        ? selectedModules.map((module) => <span key={module} className="rounded-full bg-forest/10 px-2.5 py-1 text-xs text-forest">{t(`team.modules.${module}`)}</span>)
                        : <span className="text-sm text-ink-soft">{t('team.noAccessibleModules')}</span>}
                    </div>
                  </div>
                </fieldset>
              </section>
            )}

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeForm} className="focus-ring min-h-11 rounded-lg border border-sand px-4 text-sm">{t('common.cancel')}</button>
              <button disabled={isSaving} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-forest px-4 text-sm font-medium text-paper disabled:opacity-50">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}{t('common.save')}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </DashboardLayout>
  );
};

export default TeamPage;
