import React, { ReactNode, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useWarehouseAuth } from '../../contexts/WarehouseAuthContext';
import NotificationsBell from './NotificationsBell';
import ChatBox from './ChatBox';

type AdminNavItem = {
  id:
    | 'dashboard'
    | 'baocao'
    | 'donhang'
    | 'container'
    | 'loaihang'
    | 'hangtau'
    | 'lichTrinh'
    | 'cuocphi'
    | 'quanlykho'
    | 'quantritaikhoan'
    | 'taikhoan'
    | 'xuatbaocao';
  label: string;
  to: string;
  icon: ReactNode;
  badge?: string;
};

const IconDashboard = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </svg>
);
const IconPulse = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const IconDoc = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
  </svg>
);
const IconContainer = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
  </svg>
);
const IconTag = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);
const IconShip = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 17l2-7h14l2 7" />
    <path d="M5 10V5a2 2 0 012-2h10a2 2 0 012 2v5" />
    <path d="M12 21a2 2 0 100-4 2 2 0 000 4z" />
  </svg>
);
const IconCalendar = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IconDollar = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </svg>
);
const IconUser = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="4" />
    <path d="M20 21a8 8 0 10-16 0" />
  </svg>
);
const IconUsers = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IconWarehouse = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

function getTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem('ht_ui_theme');
    if (saved === 'dark') return 'dark';
  } catch {
    // ignore
  }
  return 'light';
}

export default function AdminWarehouseManagementLayout(
  props: React.PropsWithChildren<{
    headerTitle: string;
  }>,
) {
  const { children, headerTitle } = props;
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useWarehouseAuth();

  const navItems: AdminNavItem[] = useMemo(
    () => [
      { id: 'dashboard', label: 'Dashboard', to: '/warehouse/admin/dashboard', icon: IconDashboard },
      { id: 'baocao', label: 'Báo cáo & Thống kê', to: '/warehouse/admin/section/bao-cao-thong-ke', icon: IconPulse },
      // Trong demo HTML: "Đơn hàng" là 1 trang riêng. Ở app, phần danh sách đơn hàng đang ở xuat-bao-cao.
      { id: 'donhang', label: 'Đơn hàng', to: '/warehouse/admin/section/don-hang', icon: IconDoc, badge: '4' },
      { id: 'container', label: 'Loại Container', to: '/warehouse/admin/section/quan-ly-loai-container', icon: IconContainer },
      { id: 'loaihang', label: 'Loại Hàng', to: '/warehouse/admin/section/quan-ly-loai-hang', icon: IconTag },
      { id: 'hangtau', label: 'Hãng Tàu', to: '/warehouse/admin/section/quan-ly-hang-tau', icon: IconShip },
      { id: 'lichTrinh', label: 'Lịch Trình', to: '/warehouse/admin/section/quan-ly-lich', icon: IconCalendar },
      { id: 'cuocphi', label: 'Cước Phí', to: '/warehouse/admin/section/quan-ly-cuoc-phi-bieu-cuoc', icon: IconDollar },
      { id: 'quanlykho', label: 'Quản lý kho', to: '/warehouse/yard/tong-quan', icon: IconWarehouse },
      { id: 'quantritaikhoan', label: 'Quản trị hệ thống', to: '/warehouse/admin/section/quan-tri-he-thong', icon: IconUsers },
      { id: 'taikhoan', label: 'Tài khoản Admin', to: '/warehouse/admin/section/quan-ly-tai-khoan', icon: IconUser },
    ],
    [],
  );

  const activeTo = useMemo(() => {
    // Match longest prefix for section routes
    const current = location.pathname;
    const candidates = navItems
      .map((i) => i.to)
      .sort((a, b) => b.length - a.length)
      .find((to) => current === to || current.startsWith(to));
    return candidates || '/warehouse/admin/dashboard';
  }, [location.pathname, navItems]);

  // Ensure demo CSS responds to dark mode (html.dark already exists in app).
  useEffect(() => {
    const theme = getTheme();
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, []);

  const toggleDark = () => {
    const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem('ht_ui_theme', next);
    } catch {
      // ignore
    }
  };

  const onLogout = () => {
    logout();
    navigate('/');
  };

  const initials = (user?.name || 'Admin')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('');

  return (
    <div className="wm-shell">
      <aside id="sidebar">
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#fff',
              borderRadius: '10px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0
            }}
          >
            <img src="/logo-new.svg" alt="Hùng Thủy logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main, #333)', lineHeight: '1.2' }}>Hùng Thủy</span>
            <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-muted, #666)' }}>Port Logistics</span>
          </div>
        </div>

        <div className="sidebar-section">Tổng quan</div>
        {navItems.slice(0, 2).map((item) => (
          <Link key={item.id} to={item.to} className={`nav-item ${activeTo === item.to ? 'active' : ''}`}>
            {item.icon}
            {item.label}
          </Link>
        ))}

        <div className="sidebar-section">Quản lý</div>
        {navItems.slice(2, 9).map((item) => (
          <Link key={item.id} to={item.to} className={`nav-item ${activeTo === item.to ? 'active' : ''}`}>
            {item.icon}
            {item.label}
            {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
          </Link>
        ))}

        <div className="sidebar-section">Hệ thống</div>
        {navItems.slice(9).map((item) => (
          <Link key={item.id} to={item.to} className={`nav-item ${activeTo === item.to ? 'active' : ''}`}>
            {item.icon}
            {item.label}
          </Link>
        ))}

        <div className="sidebar-footer">
          <Link to="/warehouse/admin/section/quan-ly-tai-khoan" className="user-card">
            <div className="avatar">{initials || 'AD'}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name || 'Admin'}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Quản trị viên</div>
            </div>
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      <div id="main">
        <header id="header">
          <div className="header-title" id="header-title">
            {headerTitle}
          </div>
          <div className="header-actions">
            {/* Keep existing bell behavior, wrap to match demo icon button size */}
            <div className="icon-btn" aria-label="Thông báo">
              <NotificationsBell />
            </div>
            <div className="icon-btn" onClick={toggleDark} role="button" aria-label="Giao diện sáng/tối" tabIndex={0}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            </div>
          </div>
        </header>

        <div id="content">
          <div className="page">{children}</div>
        </div>
      </div>

      {/* Chatbox (existing component, positioned fixed) */}
      <ChatBox />
    </div>
  );
}

