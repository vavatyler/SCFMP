import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, Sprout } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.message === 'Invalid credentials'
          ? 'That email or password is incorrect.'
          : 'Could not sign in. Check that the server is running and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-forest">
      {/* Signature background: topographic contour lines, evoking "the land of a thousand hills" */}
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
        {[0, 1, 2, 3].map((i) => (
          <path
            key={`b-${i}`}
            d={`M-100 ${180 + i * 60} C 250 ${100 + i * 70}, 400 ${260 + i * 50}, 700 ${160 + i * 60} S 1000 ${80 + i * 50}, 1300 ${200 + i * 60}`}
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
          <p className="mt-1 text-sm text-paper/60">
            Smart Cooperative &amp; Farmer Management Platform
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-paper p-8 shadow-2xl shadow-black/20"
        >
          <h2 className="mb-6 font-display text-lg font-medium text-ink">Sign in</h2>

          {error && (
            <div className="mb-4 rounded-lg bg-clay/10 px-4 py-3 text-sm text-clay">{error}</div>
          )}

          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@cooperative.rw"
            className="focus-ring mb-4 w-full rounded-lg border border-sand bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/50"
          />

          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-medium uppercase tracking-wide text-ink-soft">
              Password
            </label>
            <Link to="/forgot-password" className="focus-ring text-xs font-medium text-forest hover:text-forest-light">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="focus-ring mb-6 w-full rounded-lg border border-sand bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/50"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-forest-light disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-paper/50">
          SmartNyamagabe Digital Solutions Ltd
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
