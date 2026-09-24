import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Bell, Check, CheckCheck, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../components/DashboardLayout';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../api/notifications';

const TYPE_ICONS = {
  warning: { icon: AlertTriangle, className: 'text-clay' },
  alert: { icon: AlertTriangle, className: 'text-clay' },
  success: { icon: CheckCircle2, className: 'text-forest' },
  info: { icon: Info, className: 'text-ink-soft' },
};

const formatDate = (value, language) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  } catch {
    return date.toLocaleString();
  }
};

const NotificationsPage = () => {
  const { t, i18n } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState('');

  const loadPage = useCallback(async (page) => {
    setIsLoading(true);
    setError('');
    try {
      const result = await listNotifications({ page, limit: 20 });
      setNotifications(result.data || []);
      setUnreadCount(result.unread_count || 0);
      setPagination(result.pagination || { page, limit: 20, total: 0 });
    } catch {
      setError(t('notifications.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => { loadPage(pagination.page); }, [loadPage, pagination.page]);

  const markRead = async (notification) => {
    try {
      await markNotificationRead(notification.id);
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, is_read: true } : item));
      if (!notification.is_read) setUnreadCount((current) => Math.max(0, current - 1));
    } catch {
      setError(t('notifications.updateError'));
    }
  };

  const markAllRead = async () => {
    setIsMarkingAll(true);
    setError('');
    try {
      await markAllNotificationsRead();
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch {
      setError(t('notifications.updateError'));
    } finally {
      setIsMarkingAll(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));

  return (
    <DashboardLayout title={t('common.notifications')} subtitle={t('notifications.subtitle')}>
      <section className="overflow-hidden rounded-2xl border border-sand/80 bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand/80 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest/10 text-forest"><Bell className="h-5 w-5" /></span>
            <div><h2 className="font-display text-lg font-semibold text-ink">{t('notifications.inbox')}</h2><p className="text-xs text-ink-soft">{t('notifications.unreadCount', { count: unreadCount })}</p></div>
          </div>
          {unreadCount > 0 && <button type="button" onClick={markAllRead} disabled={isMarkingAll} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-sand px-3 text-sm font-medium text-forest hover:bg-sand/30 disabled:opacity-60"><CheckCheck className="h-4 w-4" />{isMarkingAll ? t('common.saving') : t('notifications.markAllRead')}</button>}
        </div>

        {error && <p className="mx-4 mt-4 rounded-lg border border-clay/20 bg-clay/5 px-4 py-3 text-sm text-clay sm:mx-6" role="alert">{error}</p>}

        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center text-sm text-ink-soft" role="status"><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('common.loading')}</div>
        ) : notifications.length === 0 ? (
          <div className="px-6 py-14 text-center"><Bell className="mx-auto h-8 w-8 text-ink-soft/60" /><h3 className="mt-3 font-display text-lg font-semibold text-ink">{t('notifications.emptyTitle')}</h3><p className="mt-1 text-sm text-ink-soft">{t('notifications.emptyBody')}</p></div>
        ) : (
          <ul className="divide-y divide-sand/70">
            {notifications.map((notification) => {
              const { icon: Icon, className } = TYPE_ICONS[notification.type] || TYPE_ICONS.info;
              return (
                <li key={notification.id} className={`flex gap-3 px-4 py-4 sm:gap-4 sm:px-6 ${notification.is_read ? '' : 'bg-gold/5'}`}>
                  <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${className}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-ink">{notification.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${notification.is_read ? 'bg-sand/60 text-ink-soft' : 'bg-forest/10 text-forest'}`}>{notification.is_read ? t('notifications.read') : t('notifications.unread')}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-line break-words text-sm leading-6 text-ink-soft">{notification.message}</p>
                    {notification.created_at && <time className="mt-2 block text-xs text-ink-soft" dateTime={notification.created_at}>{formatDate(notification.created_at, i18n.language)}</time>}
                  </div>
                  {!notification.is_read && <button type="button" onClick={() => markRead(notification)} className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-lg text-ink-soft hover:bg-forest/10 hover:text-forest" aria-label={t('notifications.markRead')}><Check className="h-4 w-4" /></button>}
                </li>
              );
            })}
          </ul>
        )}

        {!isLoading && pagination.total > pagination.limit && <div className="flex items-center justify-between border-t border-sand/80 px-4 py-3 text-sm sm:px-6"><p className="text-xs text-ink-soft">{t('notifications.pageSummary', { page: pagination.page, pages: totalPages, total: pagination.total })}</p><div className="flex gap-2"><button type="button" disabled={pagination.page <= 1} onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))} className="focus-ring min-h-10 rounded-lg border border-sand px-3 text-sm text-ink-soft disabled:opacity-40">{t('common.previous')}</button><button type="button" disabled={pagination.page >= totalPages} onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))} className="focus-ring min-h-10 rounded-lg border border-sand px-3 text-sm text-ink-soft disabled:opacity-40">{t('common.next')}</button></div></div>}
      </section>
    </DashboardLayout>
  );
};

export default NotificationsPage;
