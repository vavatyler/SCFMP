import { useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCheck, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notifications';

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

const NotificationBell = () => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const { data, unread_count } = await listNotifications({ page: 1, limit: 8 });
      setNotifications(data || []);
      setUnreadCount(unread_count || 0);
    } catch {
      // The bell is a convenience surface; the full inbox reports loading errors.
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
    };
    const closeOnEscape = (event) => { if (event.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const handleMarkRead = async (notification) => {
    try {
      await markNotificationRead(notification.id);
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, is_read: true } : item));
      if (!notification.is_read) setUnreadCount((current) => Math.max(0, current - 1));
    } catch {
      // The inbox page can retry and display an actionable error.
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch {
      // The inbox page can retry and display an actionable error.
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="focus-ring relative flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-sand/40 hover:text-ink"
        aria-label={unreadCount > 0 ? `${t('common.notifications')}, ${t('notifications.unreadCount', { count: unreadCount })}` : t('common.notifications')}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell className="h-5 w-5" strokeWidth={1.75} />
        {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-clay px-1 text-[10px] font-semibold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <>
          <button type="button" className="fixed inset-0 z-30 bg-ink/5" onClick={() => setIsOpen(false)} aria-label={t('common.close')} />
          <section className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-sand bg-white shadow-2xl" role="dialog" aria-label={t('common.notifications')}>
            <div className="flex items-center justify-between gap-3 border-b border-sand px-4 py-3">
              <h2 className="font-display text-sm font-semibold text-ink">{t('common.notifications')}</h2>
              {unreadCount > 0 && <button type="button" onClick={handleMarkAllRead} className="focus-ring flex min-h-8 items-center gap-1 text-xs font-medium text-forest hover:text-forest-light"><CheckCheck className="h-3.5 w-3.5" />{t('notifications.markAllRead')}</button>}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <p className="p-5 text-center text-xs text-ink-soft" role="status">{t('common.loading')}</p>
              ) : notifications.length === 0 ? (
                <p className="p-6 text-center text-xs text-ink-soft">{t('notifications.emptyBody')}</p>
              ) : notifications.map((notification) => {
                const { icon: Icon, className } = TYPE_ICONS[notification.type] || TYPE_ICONS.info;
                return (
                  <article key={notification.id} className={`flex gap-3 border-b border-sand px-4 py-3 last:border-0 ${notification.is_read ? '' : 'bg-gold/5'}`}>
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${className}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5"><p className="text-sm font-medium text-ink">{notification.title}</p><span className="text-[9px] font-semibold uppercase tracking-wide text-ink-soft">{notification.is_read ? t('notifications.read') : t('notifications.unread')}</span></div>
                      <p className="mt-0.5 break-words text-xs leading-relaxed text-ink-soft">{notification.message}</p>
                      {notification.created_at && <time className="mt-1 block text-[10px] text-ink-soft" dateTime={notification.created_at}>{formatDate(notification.created_at, i18n.language)}</time>}
                    </div>
                    {!notification.is_read && <button type="button" onClick={() => handleMarkRead(notification)} title={t('notifications.markRead')} aria-label={t('notifications.markRead')} className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center self-start rounded text-ink-soft hover:bg-sand/50 hover:text-forest"><Check className="h-3.5 w-3.5" /></button>}
                  </article>
                );
              })}
            </div>
            <div className="border-t border-sand px-4 py-2.5 text-right"><Link to="/notifications" onClick={() => setIsOpen(false)} className="focus-ring text-xs font-semibold text-forest hover:text-forest-light">{t('notifications.viewAll')}</Link></div>
          </section>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
