import { useEffect, useState } from 'react';
import { Plus, Loader2, UserCog, Power, KeyRound } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import PasswordInput from '../components/PasswordInput';
import RwandaPhoneInput from '../components/RwandaPhoneInput';
import { listUsers, registerUser, updateUserStatus, resetUserPassword } from '../api/users';
import { listMembers } from '../api/members';
import { useAuth } from '../context/AuthContext';
import { useCooperative } from '../context/CooperativeContext';
import { useTranslation } from 'react-i18next';
import { isValidEmail, isValidRwandaLocalPhone, normalizeRwandaPhone, toLocalRwandaPhone } from '../utils/validation';

const emptyForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: '',
  role: 'cooperative_manager',
  member_id: '',
};

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  cooperative_manager: 'Cooperative Manager',
  accountant: 'Accountant',
  field_officer: 'Field Officer',
  farmer: 'Farmer',
};

const UsersPage = () => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { cooperativeScope, activeCooperativeId, activeCooperative, isSuperAdmin } = useCooperative();

  const [users, setUsers] = useState([]);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [data, memberResult] = await Promise.all([
        listUsers(cooperativeScope),
        listMembers({ ...cooperativeScope, limit: 100 }),
      ]);
      setUsers(data);
      setAvailableMembers(memberResult.data.filter((member) => !member.user_id));
    } catch (err) {
      setError('Could not load team members. Is the backend server running?');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeCooperativeId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    if (form.password.length < 8 || !/[a-z]/.test(form.password) || !/[A-Z]/.test(form.password) || !/\d/.test(form.password)) {
      setFormError('Password must be at least 8 characters and include uppercase, lowercase, and a number.');
      return;
    }
    if (form.role === 'farmer' && !form.member_id) {
      setFormError('Select the member who owns this farmer account.');
      return;
    }
    if (!isValidEmail(form.email)) {
      setFormError(t('validation.emailInvalid'));
      return;
    }
    if (form.phone && !isValidRwandaLocalPhone(form.phone)) {
      setFormError(t('validation.phoneInvalid'));
      return;
    }
    setIsSaving(true);
    try {
      const normalizedForm = { ...form, phone: normalizeRwandaPhone(form.phone) };
      const payload = isSuperAdmin ? { ...normalizedForm, ...cooperativeScope } : normalizedForm;
      await registerUser(payload);
      setIsModalOpen(false);
      setForm(emptyForm);
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not create this account.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (targetUser) => {
    const nextStatus = targetUser.status === 'active' ? 'inactive' : 'active';
    if (
      !window.confirm(
        `${nextStatus === 'active' ? 'Reactivate' : 'Deactivate'} ${targetUser.first_name} ${targetUser.last_name}?`
      )
    ) {
      return;
    }
    try {
      await updateUserStatus(targetUser.id, nextStatus);
      fetchUsers();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Could not update this account.');
    }
  };

  const canManage = isSuperAdmin || currentUser?.role === 'cooperative_manager';
  const emailState = form.email ? isValidEmail(form.email) ? 'valid' : 'invalid' : 'empty';

  const [resettingUser, setResettingUser] = useState(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    if (resetPasswordValue.length < 8 || !/[a-z]/.test(resetPasswordValue) || !/[A-Z]/.test(resetPasswordValue) || !/\d/.test(resetPasswordValue)) {
      setResetError('Password must be at least 8 characters and include uppercase, lowercase, and a number.');
      return;
    }
    setIsResetting(true);
    try {
      await resetUserPassword(resettingUser.id, resetPasswordValue);
      setResettingUser(null);
      setResetPasswordValue('');
      window.alert(
        `Password reset for ${resettingUser.first_name} ${resettingUser.last_name}. Share the new password with them securely.`
      );
    } catch (err) {
      setResetError(err.response?.data?.message || 'Could not reset this password.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <DashboardLayout
      title={t('common.team')}
      subtitle={
        isSuperAdmin && activeCooperative
          ? `Staff accounts for ${activeCooperative.name}.`
          : t('modules.teamSubtitle')
      }
    >
      {canManage && (
        <div className="mb-5 flex items-center justify-end">
          <button
            onClick={() => {
              setForm({ ...emptyForm, role: isSuperAdmin ? 'cooperative_manager' : 'accountant' });
              setFormError('');
              setIsModalOpen(true);
            }}
            disabled={isSuperAdmin && !activeCooperativeId}
            className="focus-ring flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add team member
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-ink-soft">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading team…
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-clay">{error}</div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-soft">No team members yet.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-sand bg-sand/30 text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                {isSuperAdmin && <th className="px-5 py-3 font-medium">Organization</th>}
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {users.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-sand/20">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <UserCog className="h-4 w-4 shrink-0 text-ink-soft" />
                      <span className="font-medium text-ink">
                        {u.first_name} {u.last_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-ink-soft">{u.email}</td>
                  <td className="px-5 py-3.5 text-ink-soft">{ROLE_LABELS[u.role] || u.role}</td>
                  {isSuperAdmin && (
                    <td className="px-5 py-3.5 text-ink-soft">{u.cooperative?.name || '—'}</td>
                  )}
                  <td className="px-5 py-3.5">
                    <Badge status={u.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {canManage && u.id !== currentUser.id && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setResettingUser(u)}
                          title="Reset password"
                          className="focus-ring inline-flex items-center gap-1 rounded-lg border border-sand px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-sand/30"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          Reset password
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          title={u.status === 'active' ? 'Deactivate' : 'Reactivate'}
                          className={`focus-ring inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                            u.status === 'active'
                              ? 'border-sand text-clay hover:bg-clay/5'
                              : 'border-sand text-forest hover:bg-forest/5'
                          }`}
                        >
                          <Power className="h-3.5 w-3.5" />
                          {u.status === 'active' ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal title="Add team member" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleCreate}>
          {formError && (
            <div className="mb-4 rounded-lg bg-clay/10 px-3.5 py-2.5 text-sm text-clay">
              {formError}
            </div>
          )}

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                First name
              </label>
              <input
                required
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Last name
              </label>
              <input
                required
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              Email
            </label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              aria-invalid={emailState === 'invalid'}
              className={`focus-ring w-full rounded-lg border px-3 py-2 text-sm ${emailState === 'valid' ? 'border-forest' : emailState === 'invalid' ? 'border-clay' : 'border-sand'}`}
            />
            {emailState !== 'empty' && (
              <p className={`mt-1 text-xs ${emailState === 'valid' ? 'text-forest' : 'text-clay'}`}>
                {emailState === 'valid' ? t('validation.emailValid') : t('validation.emailInvalid')}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              Phone (optional)
            </label>
            <RwandaPhoneInput
              id="user-phone"
              value={form.phone}
              onChange={(phone) => setForm({ ...form, phone })}
            />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              Role
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
            >
              {isSuperAdmin && <option value="cooperative_manager">Cooperative Manager</option>}
              <option value="accountant">Accountant</option>
              <option value="field_officer">Field Officer</option>
              <option value="farmer">Farmer</option>
            </select>
          </div>

          {form.role === 'farmer' && (
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">Linked member</label>
              <select required value={form.member_id} onChange={(e) => {
                const member = availableMembers.find((item) => String(item.id) === e.target.value);
                setForm({ ...form, member_id: e.target.value, first_name: member?.first_name || form.first_name, last_name: member?.last_name || form.last_name, phone: member?.phone ? toLocalRwandaPhone(member.phone) : form.phone });
              }} className="focus-ring min-h-11 w-full rounded-lg border border-sand px-3 py-2 text-sm">
                <option value="">Select a member…</option>
                {availableMembers.map((member) => <option key={member.id} value={member.id}>{member.first_name} {member.last_name}</option>)}
              </select>
              <p className="mt-1 text-xs text-ink-soft">This link enforces that the farmer can only see their own records.</p>
            </div>
          )}

          <div className="mb-6">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              Temporary password
            </label>
            <PasswordInput
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters, with upper/lowercase and a number"
              className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-ink-soft">
              Share this with them directly — they should change it after logging in.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? 'Creating…' : 'Create account'}
          </button>
        </form>
      </Modal>

      <Modal
        title={`Reset password${resettingUser ? ` — ${resettingUser.first_name} ${resettingUser.last_name}` : ''}`}
        isOpen={!!resettingUser}
        onClose={() => setResettingUser(null)}
      >
        {resettingUser && (
          <form onSubmit={handleResetPassword}>
            {resetError && (
              <div className="mb-4 rounded-lg bg-clay/10 px-3.5 py-2.5 text-sm text-clay">
                {resetError}
              </div>
            )}
            <div className="mb-6">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                New password
              </label>
              <PasswordInput
                required
                minLength={8}
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                placeholder="At least 8 characters, with upper/lowercase and a number"
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-ink-soft">
                This doesn't require their old password — use this if they're locked out.
              </p>
            </div>
            <button
              type="submit"
              disabled={isResetting}
              className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60"
            >
              {isResetting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isResetting ? 'Resetting…' : 'Reset password'}
            </button>
          </form>
        )}
      </Modal>
    </DashboardLayout>
  );
};

export default UsersPage;
