import { Link } from 'react-router-dom';

const NotFoundPage = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-paper text-center">
    <h1 className="font-display text-4xl font-semibold text-ink">404</h1>
    <p className="mt-2 text-sm text-ink-soft">This page doesn't exist.</p>
    <Link
      to="/dashboard"
      className="focus-ring mt-6 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-paper hover:bg-forest-light"
    >
      Back to dashboard
    </Link>
  </div>
);

export default NotFoundPage;
