import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NotFoundPage = () => {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 text-center">
      <h1 className="font-display text-4xl font-semibold text-ink">404</h1>
      <p className="mt-2 text-sm text-ink-soft">{t('common.pageNotFound')}</p>
      <Link
        to="/dashboard"
        className="focus-ring mt-6 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-paper hover:bg-forest-light"
      >
        {t('common.backToDashboard')}
      </Link>
    </div>
  );
};

export default NotFoundPage;
