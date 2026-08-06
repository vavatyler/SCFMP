import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Loader2, Sprout, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { resetPasswordWithToken } from '../api/auth';
import PasswordInput from '../components/PasswordInput';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isDone, setIsDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('This reset link is missing its token. Please use the link from your email.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPasswordWithToken(token, newPassword);
      setIsDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset your password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-forest">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.18]"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path
            key={i}
            d={`M-100 ${560 - i * 70} C 200 ${460 - i * 80}, 350 ${640 - i * 60}, 600 ${520 - i * 70} S 950 ${420 - i * 60}, 1300 ${540 - i * 70}`}
            stroke="#E0BC6F"
            strokeWidth="1.5"
          />
        ))}
      </svg>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/15">
            <Sprout className="h-6 w-6 text-gold" strokeWidth={1.75} />
          </div>
          <h1 className="font-display text-2xl font-semibold text-paper">SCFMP</h1>
          <p className="mt-1 text-sm text-paper/60">Choose a new password</p>
        </div>

        <div className="rounded-2xl bg-paper p-8 shadow-2xl shadow-black/20">
          {isDone ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-forest/10">
                <CheckCircle2 className="h-6 w-6 text-forest" />
              </div>
              <h2 className="mb-2 font-display text-lg font-medium text-ink">Password reset</h2>
              <p className="mb-6 text-sm text-ink-soft">
                Your password has been updated. You can now log in with your new password.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="focus-ring w-full rounded-lg bg-forest px-4 py-2.5 text-sm font-medium text-paper hover:bg-forest-light"
              >
                Go to login
              </button>
            </div>
          ) : !token ? (
            <div className="text-center">
              <p className="mb-4 text-sm text-clay">
                This reset link is invalid or incomplete. Please request a new one.
              </p>
              <Link
                to="/forgot-password"
                className="focus-ring inline-block w-full rounded-lg bg-forest px-4 py-2.5 text-sm font-medium text-paper hover:bg-forest-light"
              >
                Request a new link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 className="mb-6 font-display text-lg font-medium text-ink">Set a new password</h2>

              {error && (
                <div className="mb-4 rounded-lg bg-clay/10 px-4 py-3 text-sm text-clay">{error}</div>
              )}

              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                New password
              </label>
              <PasswordInput
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="focus-ring mb-4 w-full rounded-lg border border-sand bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/50"
              />

              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Confirm new password
              </label>
              <PasswordInput
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="focus-ring mb-6 w-full rounded-lg border border-sand bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/50"
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Resetting…' : 'Reset password'}
              </button>
            </form>
          )}
        </div>

        {!isDone && (
          <Link
            to="/login"
            className="focus-ring mt-6 flex items-center justify-center gap-1.5 text-sm text-paper/60 hover:text-paper"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to login
          </Link>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
