import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from './Modal';
import PasswordInput from './PasswordInput';
import { changePassword } from '../api/auth';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setIsSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not change your password.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal title="Change password" isOpen={isOpen} onClose={handleClose}>
      {success ? (
        <div className="text-center">
          <p className="mb-4 text-sm text-forest">Your password has been updated.</p>
          <button
            onClick={handleClose}
            className="focus-ring w-full rounded-lg bg-forest px-4 py-2.5 text-sm font-medium text-paper hover:bg-forest-light"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 rounded-lg bg-clay/10 px-3.5 py-2.5 text-sm text-clay">{error}</div>
          )}

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              Current password
            </label>
            <PasswordInput
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              New password
            </label>
            <PasswordInput
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
            />
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              Confirm new password
            </label>
            <PasswordInput
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? 'Updating…' : 'Update password'}
          </button>
        </form>
      )}
    </Modal>
  );
};

export default ChangePasswordModal;
