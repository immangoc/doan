import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CheckCircle2, Clock, X } from 'lucide-react';
import { useWarehouseAuth, API_BASE } from '../../contexts/WarehouseAuthContext';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

type Notification = {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
};

function inferType(title: string): Notification['type'] {
  const t = title.toLowerCase();
  if (t.includes('từ chối') || t.includes('lỗi') || t.includes('thất bại')) return 'error';
  if (t.includes('cảnh báo') || t.includes('quá hạn') || t.includes('đầy')) return 'warning';
  return 'info';
}

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN');
}

function typeBadgeClass(type: Notification['type']) {
  switch (type) {
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
    case 'error':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
  }
}

export default function NotificationsBell() {
  const { accessToken } = useWarehouseAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlyUnread, setOnlyUnread] = useState(true);
  const [selected, setSelected] = useState<Notification | null>(null);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken]);

  const fetchUnreadCount = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${API_BASE}/notifications/unread-count`, { headers });
      const d = await res.json();
      if (res.ok) setUnreadCount(d.data ?? 0);
    } catch {
      // ignore
    }
  }, [headers, accessToken]);

  const fetchNotifications = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/notifications/my?page=0&size=30&sort=createdAt,desc`, { headers });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Lỗi lấy thông báo');
      const items = (d.data?.content || d.data || []) as { notificationId: number; title: string; description: string; isRead: boolean; createdAt: string }[];
      setNotifications(items.map((n) => ({
        id: n.notificationId,
        title: n.title,
        message: n.description,
        type: inferType(n.title),
        read: n.isRead,
        createdAt: n.createdAt,
      })));
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  }, [headers, accessToken]);

  // Poll unread count every 10 seconds
  useEffect(() => {
    if (!accessToken) return;
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(id);
  }, [fetchUnreadCount, accessToken]);

  // Listen for approve/reject events to refresh immediately
  useEffect(() => {
    const handler = () => {
      fetchUnreadCount();
      if (open) fetchNotifications();
    };
    window.addEventListener('wms:notification-refresh', handler);
    return () => window.removeEventListener('wms:notification-refresh', handler);
  }, [open, fetchUnreadCount, fetchNotifications]);

  useEffect(() => {
    if (!open) return;
    fetchNotifications();
  }, [open]);

  const filtered = useMemo(() => {
    if (onlyUnread) return notifications.filter((n) => !n.read);
    return notifications;
  }, [notifications, onlyUnread]);

  const markRead = async (n: Notification) => {
    if (n.read) return;
    try {
      await fetch(`${API_BASE}/notifications/${n.id}/read`, { method: 'PUT', headers });
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await fetch(`${API_BASE}/notifications/read-all`, { method: 'PUT', headers });
      setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const onSelect = async (n: Notification) => {
    setSelected(n);
    await markRead(n);
  };

  useEffect(() => {
    if (!open) return;
    const onDocDown = (ev: MouseEvent) => {
      const t = ev.target as Node | null;
      if (!t) return;
      if (panelRef.current?.contains(t)) return;
      if (buttonRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  if (!accessToken) {
    return (
      <button
        className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        aria-label="Thông báo"
      >
        <Bell size={20} />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        onClick={() => setOpen((o) => !o)}
        aria-label="Thông báo"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 mt-2 w-[420px] max-w-[92vw] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden"
        >
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-blue-600" />
                <div className="font-semibold text-sm">Thông báo</div>
                {unreadCount > 0 && <Badge className="ml-1 bg-blue-50 text-blue-700">{unreadCount}</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={onlyUnread ? 'default' : 'outline'}
                  className={onlyUnread ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
                  onClick={() => setOnlyUnread((v) => !v)}
                >
                  {onlyUnread ? 'Chưa đọc' : 'Tất cả'}
                </Button>
                <Button size="sm" variant="outline" onClick={markAllRead}>
                  Đọc tất cả
                </Button>
              </div>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading && (
              <div className="p-4 text-sm text-gray-600 dark:text-gray-300">Đang tải...</div>
            )}

            {!loading && error && (
              <div className="p-4 text-sm text-red-600 dark:text-red-300">{error}</div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="p-4 text-sm text-gray-600 dark:text-gray-300">Không có thông báo phù hợp.</div>
            )}

            {!loading &&
              filtered.map((n) => (
                <button
                  key={n.id}
                  className={`w-full text-left px-3 py-3 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 flex items-start gap-3 ${
                    selected?.id === n.id ? 'bg-gray-50 dark:bg-gray-700/50' : ''
                  }`}
                  onClick={() => onSelect(n)}
                >
                  <span className="mt-1">
                    {!n.read ? (
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                    ) : (
                      <span className="inline-block w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                    )}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-sm truncate">{n.title}</div>
                      <Badge className={typeBadgeClass(n.type)}>{n.type}</Badge>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{n.message}</div>
                    <div className="text-[11px] text-gray-500 mt-2 flex items-center gap-2">
                      <Clock size={14} />
                      {formatTime(n.createdAt)}
                    </div>
                  </div>
                  {n.read ? <CheckCircle2 size={16} className="text-green-600 mt-1" /> : null}
                </button>
              ))}
          </div>

          {selected && (
            <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-sm">{selected.title}</div>
                  <div className="text-sm mt-1 text-gray-700 dark:text-gray-200 whitespace-pre-line">{selected.message}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
                  <X size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
