import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Settings, Home, ChevronRight, ChevronDown, Menu, CheckCircle2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChatBox } from '../chat/ChatBox';
import { yardPath, YARD_BASE } from '../../config/yardPaths';
import './Topbar.css';

interface TopbarProps {
  onMenuToggle?: () => void;
}

type PopupType = 'success' | 'error' | 'info';

function PopupModal({ open, type, title, message, onClose }: {
  open: boolean;
  type: PopupType;
  title: string;
  message: string;
  onClose: () => void;
}) {
  if (!open) return null;
  const palette =
    type === 'success'
      ? { bg: '#ECFDF5', border: '#86EFAC', fg: '#065F46', btn: '#10B981' }
      : type === 'error'
        ? { bg: '#FEF2F2', border: '#FCA5A5', fg: '#991B1B', btn: '#EF4444' }
        : { bg: '#EFF6FF', border: '#93C5FD', fg: '#1E40AF', btn: '#3B82F6' };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: '92vw',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '14px 16px', background: palette.bg, borderBottom: `1px solid ${palette.border}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontWeight: 800, color: palette.fg }}>{title}</div>
              <div style={{ fontSize: 12, color: palette.fg, opacity: 0.9, marginTop: 2 }}>{type.toUpperCase()}</div>
            </div>
            <button
              onClick={onClose}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: palette.fg, fontWeight: 900 }}
              aria-label="Đóng"
              title="Đóng"
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ padding: '14px 16px' }}>
          <div style={{ whiteSpace: 'pre-wrap', color: '#111827', fontSize: 13, lineHeight: 1.55, textAlign: 'center' }}>
            {message}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
            <button
              onClick={onClose}
              style={{
                padding: '9px 14px',
                borderRadius: 10,
                border: 'none',
                background: palette.btn,
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 800,
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const BREADCRUMB_MAP: Record<string, { parent: string; current: string }> = {
  [yardPath('/tong-quan')]: { parent: '', current: 'breadcrumbs.overview' },
  [yardPath('/3d')]: { parent: 'breadcrumbs.ops', current: 'breadcrumbs.map3d' },
  [yardPath('/2d')]: { parent: 'breadcrumbs.ops', current: 'breadcrumbs.map2d' },
  [yardPath('/ha-bai')]: { parent: 'breadcrumbs.ops', current: 'breadcrumbs.gateIn' },
  [yardPath('/xuat-bai')]: { parent: 'breadcrumbs.ops', current: 'breadcrumbs.gateOut' },
  [yardPath('/kho')]: { parent: 'breadcrumbs.warehouseParent', current: 'breadcrumbs.warehouse' },
};

export function Topbar({ onMenuToggle }: TopbarProps) {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const crumb = BREADCRUMB_MAP[pathname] ?? (pathname.startsWith(YARD_BASE) ? { parent: '', current: '' } : { parent: '', current: '' });

  const rootRef = useRef<HTMLElement | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [lang, setLang] = useState<'vi' | 'en'>(() => {
    const saved = localStorage.getItem('wms_lang');
    return saved === 'en' ? 'en' : 'vi';
  });

  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; createdAt: string; read: boolean }>>([
    { id: 'n1', title: 'Cảnh báo', message: 'Kho hỏng có container mới được báo hỏng.', createdAt: new Date().toISOString(), read: false },
    { id: 'n2', title: 'Nhắc việc', message: 'Kiểm tra các container “Đã hoàn thành” để chuyển về kho cũ.', createdAt: new Date(Date.now() - 3600_000).toISOString(), read: false },
    { id: 'n3', title: 'Thông tin', message: 'Dữ liệu 3D đã được đồng bộ từ backend.', createdAt: new Date(Date.now() - 24 * 3600_000).toISOString(), read: true },
  ]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const [toast, setToast] = useState<{ type: PopupType; title: string; message: string } | null>(null);

  function closeAll() {
    setLangOpen(false);
    setNotifOpen(false);
    setSettingsOpen(false);
  }

  useEffect(() => {
    function onDocDown(ev: MouseEvent) {
      const t = ev.target as Node | null;
      if (!t) return;
      if (rootRef.current?.contains(t)) return;
      closeAll();
    }

    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') closeAll();
    }

    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('wms_lang', lang);
    i18n.changeLanguage(lang);
  }, [lang]);

  useEffect(() => {
    const handler = () => {
      setNotifications((prev) => [{ id: crypto.randomUUID(), title: 'Thông báo', message: 'Có cập nhật mới từ hệ thống.', createdAt: new Date().toISOString(), read: false }, ...prev]);
    };
    window.addEventListener('wms:damaged-refresh', handler);
    return () => window.removeEventListener('wms:damaged-refresh', handler);
  }, []);

  // Global toast bus (used by pages/services)
  useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as { type?: PopupType; title?: string; message?: string } | undefined;
      if (!detail?.message) return;
      setToast({
        type: detail.type ?? 'info',
        title: detail.title ?? 'Thông báo',
        message: detail.message,
      });
    };
    window.addEventListener('wms:toast', handler as EventListener);
    return () => window.removeEventListener('wms:toast', handler as EventListener);
  }, []);

  return (
    <header className="topbar" ref={rootRef as any}>
      <PopupModal
        open={!!toast}
        type={toast?.type ?? 'info'}
        title={toast?.title ?? ''}
        message={toast?.message ?? ''}
        onClose={() => setToast(null)}
      />
      <div className="topbar-left">
        <button className="menu-toggle" onClick={onMenuToggle} aria-label="Toggle menu">
          <Menu size={20} />
        </button>
        <nav className="breadcrumbs" aria-label="breadcrumb">
          <span className="breadcrumb-item">
            <Home size={14} className="breadcrumb-home-icon" />
          </span>
          {crumb.parent && (
            <>
              <ChevronRight size={14} className="breadcrumb-chevron" />
              <span className="breadcrumb-item">{t(crumb.parent)}</span>
            </>
          )}
          {crumb.current && (
            <>
              <ChevronRight size={14} className="breadcrumb-chevron" />
              <span className="breadcrumb-item active">{t(crumb.current)}</span>
            </>
          )}
        </nav>
      </div>

      <div className="topbar-right">
        <div className="topbar-popover">
          <button
            className="icon-btn language-btn"
            onClick={() => { setLangOpen((v) => !v); setNotifOpen(false); setSettingsOpen(false); }}
            aria-haspopup="menu"
            aria-expanded={langOpen}
          >
            <span className="flag-icon">{lang === 'vi' ? '🇻🇳' : '🇬🇧'}</span>
            <span className="lang-label">{lang === 'vi' ? t('language.vietnamese') : t('language.english')}</span>
            <ChevronDown size={14} />
          </button>
          {langOpen && (
            <div className="topbar-menu" role="menu">
              <button className="topbar-menu-item" onClick={() => { setLang('vi'); setLangOpen(false); }}>
                <span className="topbar-menu-left"><span className="flag-icon">🇻🇳</span>{t('language.vietnamese')}</span>
                {lang === 'vi' ? <CheckCircle2 size={16} /> : null}
              </button>
              <button className="topbar-menu-item" onClick={() => { setLang('en'); setLangOpen(false); }}>
                <span className="topbar-menu-left"><span className="flag-icon">🇬🇧</span>{t('language.english')}</span>
                {lang === 'en' ? <CheckCircle2 size={16} /> : null}
              </button>
              <div className="topbar-menu-sep" />
              <button className="topbar-menu-item" onClick={() => { navigate(yardPath('/tong-quan')); setLangOpen(false); }}>
                {t('topbar.overview')}
              </button>
            </div>
          )}
        </div>

        <div className="topbar-icons">
          <div className="topbar-popover">
            <button
              className="icon-btn notification-btn"
              aria-label="Notifications"
              aria-haspopup="dialog"
              aria-expanded={notifOpen}
              onClick={() => { setNotifOpen((v) => !v); setLangOpen(false); setSettingsOpen(false); }}
            >
              <Bell size={20} />
              {unreadCount > 0 ? <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
            </button>
            {notifOpen && (
              <div className="topbar-panel" role="dialog" aria-label="Notifications panel">
                <div className="topbar-panel-header">
                  <div className="topbar-panel-title">{t('topbar.notifications')}</div>
                  <button
                    className="topbar-link"
                    onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
                  >
                    {t('topbar.markAllRead')}
                  </button>
                </div>
                <div className="topbar-panel-body">
                  {notifications.length === 0 ? (
                    <div className="topbar-empty">{t('topbar.emptyNotifications')}</div>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <button
                        key={n.id}
                        className={`topbar-notif ${n.read ? 'is-read' : ''}`}
                        onClick={() => setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))}
                      >
                        <div className="topbar-notif-title">
                          <span className={`topbar-dot ${n.read ? 'is-read' : ''}`} />
                          {n.title}
                        </div>
                        <div className="topbar-notif-msg">{n.message}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="topbar-popover">
            <ChatBox />
          </div>

          <div className="topbar-popover">
            <button
              className="icon-btn"
              aria-label="Settings"
              aria-haspopup="dialog"
              aria-expanded={settingsOpen}
              onClick={() => { setSettingsOpen((v) => !v); setLangOpen(false); setNotifOpen(false); }}
            >
              <Settings size={20} />
            </button>
            {settingsOpen && (
              <div className="topbar-panel" role="dialog" aria-label="Settings panel">
                <div className="topbar-panel-header">
                  <div className="topbar-panel-title">{t('topbar.settings')}</div>
                  <button className="topbar-link" onClick={() => setSettingsOpen(false)}>{t('topbar.close')}</button>
                </div>
                <div className="topbar-panel-body">
                  <button className="topbar-setting" onClick={() => { navigate(yardPath('/tong-quan')); setSettingsOpen(false); }}>
                    {t('topbar.overview')}
                  </button>
                  <button className="topbar-setting" onClick={() => setToast({ type: 'info', title: t('topbar.systemInfo'), message: t('topbar.systemInfoSoon') })}>
                    {t('topbar.systemInfo')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
