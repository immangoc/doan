import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CheckCircle2, Clock, X } from 'lucide-react';
import { useWarehouseAuth, API_BASE } from '../../contexts/WarehouseAuthContext';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

type Notification = {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
};

type BackendNotification = {
  notificationId?: number;
  title?: string;
  description?: string;
  isRead?: boolean;
  createdAt?: string;
};

function translateNotificationLabel(text: string) {
  const t = text.toLowerCase();
  const replacements: Array<[RegExp, string]> = [
    [/notification/g, 'thông báo'],
    [/alert/g, 'cảnh báo'],
    [/warning/g, 'cảnh báo'],
    [/critical/g, 'nghiêm trọng'],
    [/read all/g, 'đọc tất cả'],
    [/mark.*read/g, 'đánh dấu đã đọc'],
    [/my notifications/g, 'thông báo của tôi'],
    [/unread count/g, 'chưa đọc'],
    [/exit deadline/g, 'hạn xuất'],
    [/late check[- ]?in/g, 'nhập bãi trễ'],
    [/zone occupancy/g, 'lấp đầy khu'],
  ];
  let out = text;
  for (const [pattern, value] of replacements) out = out.replace(pattern, value);
  if (!out.trim()) return text || 'Không có nội dung';
  return out;
}

function inferType(title: string): Notification['type'] {
  const t = title.toLowerCase();
  if (t.includes('từ chối') || t.includes('lỗi') || t.includes('thất bại') || t.includes('hư hỏng') || t.includes('bị hủy') || t.includes('error')) return 'error';
  if (t.includes('cảnh báo') || t.includes('quá hạn') || t.includes('đầy') || t.includes('báo động') || t.includes('quá ngày') || t.includes('lưu bãi quá') || t.includes('warning') || t.includes('critical')) return 'warning';
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
  const toastedIds = useRef<Set<number>>(new Set());

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken]);

  const markRead = async (n: Notification | number) => {
    const id = typeof n === 'number' ? n : n.id;
    if (typeof n !== 'number' && n.read) return;
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, { method: 'PUT', headers });
      setNotifications((prev) => prev.map((x) => (x.id === id ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const fetchUnreadAndToast = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${API_BASE}/notifications/my?page=0&size=10&sort=createdAt,desc`, { headers });
      const d = await res.json();
      if (!res.ok) return;
      
      const raw = (d.data?.content || d.data || []) as BackendNotification[];
      const unread = raw.filter(n => n.isRead === false && n.notificationId);
      
      // Update unread count based on actual response or another endpoint
      // To be safe, we also fetch the precise count
      const countRes = await fetch(`${API_BASE}/notifications/unread-count`, { headers });
      const countData = await countRes.json();
      if (countRes.ok) setUnreadCount(countData.data ?? 0);
      
      // Do not popup floating toasts for background notifications
      // User requested them to only appear in the dropdown menu
      const latestIds = new Set(unread.map(n => n.notificationId!));
      toastedIds.current = latestIds;
      
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
      const raw = (d.data?.content || d.data || []) as BackendNotification[];
      setNotifications(raw.map((n) => ({
        id: Number(n.notificationId ?? 0),
        title: translateNotificationLabel(String(n.title ?? '')),
        message: translateNotificationLabel(String(n.description ?? '')),
        type: inferType(String(n.title ?? '')),
        read: Boolean(n.isRead),
        createdAt: String(n.createdAt ?? ''),
      })));
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  }, [headers, accessToken]);

  // Poll for new notifications every 10 seconds
  useEffect(() => {
    if (!accessToken) return;
    fetchUnreadAndToast();
    const id = setInterval(fetchUnreadAndToast, 10000);
    return () => clearInterval(id);
  }, [fetchUnreadAndToast, accessToken]);

  // Listen for manual trigger (if needed elsewhere)
  useEffect(() => {
    const handler = () => {
      fetchUnreadAndToast();
      if (open) fetchNotifications();
    };
    window.addEventListener('wms:notification-refresh', handler);
    return () => window.removeEventListener('wms:notification-refresh', handler);
  }, [open, fetchUnreadAndToast, fetchNotifications]);

  useEffect(() => {
    if (!open) return;
    fetchNotifications();
  }, [open]);

  const filtered = useMemo(() => {
    if (onlyUnread) return notifications.filter((n) => !n.read);
    return notifications;
  }, [notifications, onlyUnread]);

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

  const triggerButton = (
    <button
      ref={buttonRef}
      className="relative h-10 w-10 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      onClick={() => setOpen((o) => !o)}
      aria-label="Thông báo"
      type="button"
    >
      <Bell size={18} />
      {unreadCount > 0 && (
        <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500 dark:border-gray-800" />
      )}
    </button>
  );

  if (!accessToken) {
    return triggerButton;
  }

  return (
    <div className="relative">
      {triggerButton}

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-3 w-[392px] max-w-[92vw] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900 z-50"
        >
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                  <Bell size={16} />
                </div>
                <div>
                  <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">Thông báo</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Không có thông báo chưa đọc'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={onlyUnread ? 'default' : 'outline'}
                  className={onlyUnread ? 'h-8 rounded-full bg-blue-600 px-3 text-xs text-white hover:bg-blue-700' : 'h-8 rounded-full px-3 text-xs'}
                  onClick={() => setOnlyUnread((v) => !v)}
                >
                  {onlyUnread ? 'Chưa đọc' : 'Tất cả'}
                </Button>
                <Button size="sm" variant="outline" onClick={markAllRead} className="h-8 rounded-full px-3 text-xs">
                  Đọc tất cả
                </Button>
              </div>
            </div>
          </div>

          <div className="max-h-[460px] overflow-y-auto bg-slate-50/40 dark:bg-slate-950/20">
            {loading && (
              <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">Đang tải...</div>
            )}

            {!loading && error && (
              <div className="px-4 py-6 text-sm text-red-600 dark:text-red-300">{error}</div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">Không có thông báo phù hợp.</div>
            )}

            {!loading &&
              filtered.map((n) => (
                <button
                  key={n.id}
                  className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-blue-50/70 dark:border-slate-800 dark:hover:bg-slate-800/60 ${
                    selected?.id === n.id ? 'bg-blue-50/80 dark:bg-slate-800/80' : 'bg-transparent'
                  }`}
                  onClick={() => onSelect(n)}
                >
                  <span className="mt-1">
                    {!n.read ? (
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500 ring-4 ring-blue-500/10" />
                    ) : (
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{n.title}</div>
                      <Badge className={`${typeBadgeClass(n.type)} rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide`}>{n.type}</Badge>
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{n.message}</div>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <Clock size={13} />
                      {formatTime(n.createdAt)}
                    </div>
                  </div>
                  {n.read ? <CheckCircle2 size={16} className="mt-1 text-emerald-600" /> : null}
                </button>
              ))}
          </div>

          {selected && (
            <div className="border-t border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selected.title}</div>
                  <div className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700 dark:text-slate-200">{selected.message}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelected(null)} className="h-8 w-8 rounded-full p-0 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
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
