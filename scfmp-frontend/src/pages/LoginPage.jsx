import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Sprout } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import LanguageSwitcher from '../components/LanguageSwitcher';

const LoginPage = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (requestError) {
      setError(requestError.response?.data?.message === 'Invalid credentials' ? t('auth.invalidCredentials') : t('auth.signInError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-forest py-8">
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.18]" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((index) => <path key={index} d={`M-100 ${560 - index * 70} C 200 ${460 - index * 80}, 350 ${640 - index * 60}, 600 ${520 - index * 70} S 950 ${420 - index * 60}, 1300 ${540 - index * 70}`} stroke="#E0BC6F" strokeWidth="1.5" />)}
        {[0, 1, 2, 3].map((index) => <path key={`b-${index}`} d={`M-100 ${180 + index * 60} C 250 ${100 + index * 70}, 400 ${260 + index * 50}, 700 ${160 + index * 60} S 1000 ${80 + index * 50}, 1300 ${200 + index * 60}`} stroke="#E0BC6F" strokeWidth="1.5" />)}
      </svg>
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="mb-4 flex justify-end"><LanguageSwitcher compact /></div>
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/15"><Sprout className="h-6 w-6 text-gold" strokeWidth={1.75} /></div>
          <h1 className="font-display text-2xl font-semibold text-paper">SCFMP</h1>
          <p className="mt-1 text-sm text-paper/60">Smart Cooperative &amp; Farmer Management Platform</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-2xl bg-paper p-6 shadow-2xl shadow-black/20 sm:p-8">
          <h2 className="mb-6 font-display text-lg font-medium text-ink">{t('auth.signIn')}</h2>
          {error && <div className="mb-4 rounded-lg bg-clay/10 px-4 py-3 text-sm text-clay" role="alert">{error}</div>}
          <label htmlFor="login-email" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('auth.email')}</label>
          <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@cooperative.rw" className="focus-ring mb-4 min-h-11 w-full rounded-lg border border-sand bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/50" />
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="login-password" className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t('auth.password')}</label>
            <Link to="/forgot-password" className="focus-ring text-xs font-medium text-forest hover:text-forest-light">{t('auth.forgotPassword')}</Link>
          </div>
          <PasswordInput id="login-password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" className="focus-ring mb-6 min-h-11 w-full rounded-lg border border-sand bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/50" />
          <button type="submit" disabled={isSubmitting} className="focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}{isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-paper/50">SmartNyamagabe Digital Solutions Ltd</p>
      </div>
    </div>
  );
};

export default LoginPage;
