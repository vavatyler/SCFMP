import { useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCheck, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notifications';

const TYPE_ICONS = {
  warning: { icon: AlertTriangle, className: 'text-clay' },
  alert: { icon: AlertTriangle, className: 'text-clay' },
  success: { icon: CheckCircle2, className: 'text-forest' },
  info: { icon: Info, className: 'text-ink-soft' },
};

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const { data, unread_count } = await listNotifications();
      setNotifications(data);
      setUnreadCount(unread_count);
    } catch {
      // Silently fail — the bell just won't populate. Not critical enough to block the page.
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
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="focus-ring relative rounded-lg p-2 text-ink-soft transition-colors hover:bg-sand/40 hover:text-ink"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-clay px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-ink/5" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-[min(20rem,calc(100vw-1rem))] rounded-xl border border-sand bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-sand px-4 py-3">
            <h3 className="font-display text-sm font-semibold text-ink">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="focus-ring flex items-center gap-1 text-xs font-medium text-forest hover:text-forest-light"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <p className="p-4 text-center text-xs text-ink-soft">Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="p-6 text-center text-xs text-ink-soft">No notifications yet.</p>
            ) : (
              notifications.map((n) => {
                const { icon: Icon, className } = TYPE_ICONS[n.type] || TYPE_ICONS.info;
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 border-b border-sand px-4 py-3 last:border-0 ${
                      n.is_read ? '' : 'bg-gold/5'
                    }`}
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${className}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{n.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{n.message}</p>
                    </div>
                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        title="Mark as read"
                        className="focus-ring shrink-0 self-start rounded p-1 text-ink-soft hover:bg-sand/50 hover:text-forest"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
