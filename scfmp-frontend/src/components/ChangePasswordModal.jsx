import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import PasswordInput from './PasswordInput';
import { changePassword } from '../api/auth';

const isStrongPassword = (value) => value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const reset = () => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setError(''); setSuccess(false); };
  const handleClose = () => { reset(); onClose(); };
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) return setError(t('auth.passwordsMismatch'));
    if (!isStrongPassword(newPassword)) return setError(t('auth.passwordHint'));
    setIsSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || t('common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal title={t('common.changePassword')} isOpen={isOpen} onClose={handleClose}>
      {success ? (
        <div className="text-center"><p className="mb-4 text-sm text-forest">{t('auth.changed')}</p><button onClick={handleClose} className="focus-ring min-h-11 w-full rounded-lg bg-forest px-4 text-sm font-medium text-paper">{t('auth.done')}</button></div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-clay/10 px-3.5 py-2.5 text-sm text-clay" role="alert">{error}</div>}
          <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('auth.currentPassword')}<PasswordInput required autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 py-2 text-sm" /></label>
          <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('auth.newPassword')}<PasswordInput required minLength={8} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 py-2 text-sm" /></label>
          <p className="text-xs text-ink-soft">{t('auth.passwordHint')}</p>
          <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('auth.confirmPassword')}<PasswordInput required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-sand px-3 py-2 text-sm" /></label>
          <button type="submit" disabled={isSaving} className="focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 text-sm font-medium text-paper disabled:opacity-60">{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}{isSaving ? t('auth.updating') : t('auth.updatePassword')}</button>
        </form>
      )}
    </Modal>
  );
};

export default ChangePasswordModal;
