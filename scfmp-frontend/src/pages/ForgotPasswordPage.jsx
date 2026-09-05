import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Sprout, Mail, UserCog, ArrowLeft } from 'lucide-react';
import { forgotPassword } from '../api/auth';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { COMPANY_NAME, PRODUCT_NAME } from '../config/company';

const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  const [method, setMethod] = useState(null); // null | 'email' | 'admin'
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }
  const [devNote, setDevNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setDevNote('');
    setIsSubmitting(true);
    try {
      const result = await forgotPassword(email);
      setMessage({ type: 'success', text: result.message });
      if (result.devNote) setDevNote(result.devNote);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Could not process your request. Please try again.',
      });
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
        <div className="mb-4 flex justify-end"><LanguageSwitcher compact /></div>
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/15">
            <Sprout className="h-6 w-6 text-gold" strokeWidth={1.75} />
          </div>
          <h1 className="font-display text-2xl font-semibold text-paper">{PRODUCT_NAME}</h1>
          <p className="mt-1 text-sm text-paper/60">{t('auth.resetPassword')}</p>
        </div>

        <div className="rounded-2xl bg-paper p-8 shadow-2xl shadow-black/20">
          {!method && (
            <>
              <h2 className="mb-1 font-display text-lg font-medium text-ink">
                {t('auth.chooseReset')}
              </h2>
              <p className="mb-6 text-sm text-ink-soft">{t('auth.chooseResetHint')}</p>

              <button
                onClick={() => setMethod('email')}
                className="focus-ring mb-3 flex w-full items-center gap-3 rounded-xl border border-sand p-4 text-left transition-colors hover:border-forest hover:bg-forest/5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest/10">
                  <Mail className="h-4 w-4 text-forest" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{t('auth.resetViaEmail')}</p>
                  <p className="text-xs text-ink-soft">
                    {t('auth.resetEmailHint')}
                  </p>
                </div>
              </button>

              <button
                onClick={() => setMethod('admin')}
                className="focus-ring flex w-full items-center gap-3 rounded-xl border border-sand p-4 text-left transition-colors hover:border-forest hover:bg-forest/5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/15">
                  <UserCog className="h-4 w-4 text-gold-dark" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{t('auth.askAdmin')}</p>
                  <p className="text-xs text-ink-soft">
                    {t('auth.askAdminHint')}
                  </p>
                </div>
              </button>
            </>
          )}

          {method === 'email' && (
            <>
              <button
                onClick={() => {
                  setMethod(null);
                  setMessage(null);
                }}
                className="focus-ring mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t('auth.back')}
              </button>

              <h2 className="mb-1 font-display text-lg font-medium text-ink">{t('auth.resetViaEmail')}</h2>
              <p className="mb-6 text-sm text-ink-soft">
                {t('auth.enterEmail')}
              </p>

              {message && (
                <div
                  className={`mb-4 rounded-lg px-4 py-3 text-sm ${
                    message.type === 'success' ? 'bg-forest/10 text-forest' : 'bg-clay/10 text-clay'
                  }`}
                >
                  {message.text}
                </div>
              )}

              {devNote && (
                <div className="mb-4 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold-dark">
                  <p className="font-medium">⚠ {devNote}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    (This note only appears because email sending isn't configured on the backend
                    yet — real users would just get the email, with no note shown at all.)
                  </p>
                </div>
              )}

              {message?.type !== 'success' && (
                <form onSubmit={handleEmailSubmit}>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                    {t('auth.email')}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@cooperative.rw"
                    className="focus-ring mb-4 w-full rounded-lg border border-sand bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/50"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSubmitting ? t('auth.sending') : t('auth.sendReset')}
                  </button>
                </form>
              )}
            </>
          )}

          {method === 'admin' && (
            <>
              <button
                onClick={() => setMethod(null)}
                className="focus-ring mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t('auth.back')}
              </button>
              <h2 className="mb-1 font-display text-lg font-medium text-ink">{t('auth.askAdmin')}</h2>
              <p className="text-sm text-ink-soft">{t('auth.adminResetInstructions')}</p>
            </>
          )}
        </div>

        <Link
          to="/login"
          className="focus-ring mt-6 flex items-center justify-center gap-1.5 text-sm text-paper/60 hover:text-paper"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('auth.backToLogin')}
        </Link>
        <p className="mt-4 text-center text-xs text-paper/50">{COMPANY_NAME}</p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
