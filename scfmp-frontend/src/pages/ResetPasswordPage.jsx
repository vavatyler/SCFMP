import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Sprout } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { resetPasswordWithToken } from '../api/auth';
import PasswordInput from '../components/PasswordInput';
import LanguageSwitcher from '../components/LanguageSwitcher';

const isStrongPassword = (value) => value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);

const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isDone, setIsDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!token) return setError(t('auth.invalidResetLink'));
    if (newPassword !== confirmPassword) return setError(t('auth.passwordsMismatch'));
    if (!isStrongPassword(newPassword)) return setError(t('auth.passwordHint'));
    setIsSubmitting(true);
    try {
      await resetPasswordWithToken(token, newPassword);
      setIsDone(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-forest py-8">
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="mb-4 flex justify-end"><LanguageSwitcher compact /></div>
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/15"><Sprout className="h-6 w-6 text-gold" /></div>
          <h1 className="font-display text-2xl font-semibold text-paper">SCFMP</h1>
          <p className="mt-1 text-sm text-paper/60">{t('auth.chooseNew')}</p>
        </div>
        <div className="rounded-2xl bg-paper p-6 shadow-2xl shadow-black/20 sm:p-8">
          {isDone ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-forest/10"><CheckCircle2 className="h-6 w-6 text-forest" /></div>
              <h2 className="mb-2 font-display text-lg font-medium text-ink">{t('auth.passwordReset')}</h2>
              <p className="mb-6 text-sm text-ink-soft">{t('auth.resetSuccess')}</p>
              <button onClick={() => navigate('/login')} className="focus-ring min-h-11 w-full rounded-lg bg-forest px-4 text-sm font-medium text-paper hover:bg-forest-light">{t('auth.goToLogin')}</button>
            </div>
          ) : !token ? (
            <div className="text-center">
              <p className="mb-4 text-sm text-clay">{t('auth.invalidResetLink')}</p>
              <Link to="/forgot-password" className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-forest px-4 text-sm font-medium text-paper hover:bg-forest-light">{t('auth.requestNewLink')}</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 className="mb-6 font-display text-lg font-medium text-ink">{t('auth.setNewPassword')}</h2>
              {error && <div className="mb-4 rounded-lg bg-clay/10 px-4 py-3 text-sm text-clay" role="alert">{error}</div>}
              <label htmlFor="new-password" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('auth.newPassword')}</label>
              <PasswordInput id="new-password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="focus-ring mb-2 min-h-11 w-full rounded-lg border border-sand bg-white px-3.5 py-2.5 text-sm text-ink" />
              <p className="mb-4 text-xs text-ink-soft">{t('auth.passwordHint')}</p>
              <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('auth.confirmPassword')}</label>
              <PasswordInput id="confirm-password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="focus-ring mb-6 min-h-11 w-full rounded-lg border border-sand bg-white px-3.5 py-2.5 text-sm text-ink" />
              <button type="submit" disabled={isSubmitting} className="focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60">{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}{isSubmitting ? t('common.loading') : t('auth.resetPassword')}</button>
            </form>
          )}
        </div>
        {!isDone && <Link to="/login" className="focus-ring mt-6 flex items-center justify-center gap-1.5 text-sm text-paper/60 hover:text-paper"><ArrowLeft className="h-3.5 w-3.5" />{t('auth.backToLogin')}</Link>}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
