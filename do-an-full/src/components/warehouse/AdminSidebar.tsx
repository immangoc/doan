import { NavLink } from 'react-router-dom';
import { useWarehouseAuth } from '../../contexts/WarehouseAuthContext';

const navGroups = [
  {
    section: 'Tổng quan',
    items: [
      { label: 'Dashboard', to: '/warehouse/admin/dashboard', icon: 'dashboard' },
      { label: 'Báo cáo & Thống kê', to: '/warehouse/admin/section/bao-cao-thong-ke', icon: 'report' },
    ],
  },
  {
    section: 'Quản lý',
    items: [
      { label: 'Đơn hàng', to: '/warehouse/admin/section/don-hang', icon: 'orders', badge: '4' },
      { label: 'Loại Container', to: '/warehouse/admin/section/quan-ly-loai-container', icon: 'container' },
      { label: 'Loại Hàng', to: '/warehouse/admin/section/quan-ly-loai-hang', icon: 'tag' },
      { label: 'Hãng Tàu', to: '/warehouse/admin/section/quan-ly-hang-tau', icon: 'ship' },
      { label: 'Lịch Trình', to: '/warehouse/admin/section/quan-ly-lich', icon: 'calendar' },
      { label: 'Cước Phí', to: '/warehouse/admin/section/quan-ly-cuoc-phi-bieu-cuoc', icon: 'dollar' },
      { label: 'Quản lý kho', to: '/warehouse/yard/tong-quan', icon: 'warehouse' },
    ],
  },
  {
    section: 'Hệ thống',
    items: [
      { label: 'Quản trị hệ thống', to: '/warehouse/admin/section/quan-tri-he-thong', icon: 'users' },
      { label: 'Tài khoản Admin', to: '/warehouse/admin/section/quan-ly-tai-khoan', icon: 'user' },
    ],
  },
];

function renderIcon(name: string) {
  switch (name) {
    case 'dashboard':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
      );
    case 'report':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case 'orders':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
        </svg>
      );
    case 'container':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
        </svg>
      );
    case 'tag':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      );
    case 'ship':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 17l2-7h14l2 7" />
          <path d="M5 10V5a2 2 0 012-2h10a2 2 0 012 2v5" />
          <path d="M12 21a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      );
    case 'calendar':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case 'dollar':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      );
    case 'warehouse':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'users':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case 'user':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="4" />
          <path d="M20 21a8 8 0 10-16 0" />
        </svg>
      );
    default:
      return null;
  }
}

export default function AdminSidebar() {
  const { user, logout } = useWarehouseAuth();

  const initials = (user?.name || 'Admin')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('');

  return (
    <aside className="sidebar">
      <NavLink to="/warehouse/admin/dashboard" className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
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
      </NavLink>

      {navGroups.map((group) => (
        <div key={group.section}>
          <div className="sidebar-section">{group.section}</div>
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              {renderIcon(item.icon)}
              {item.label}
              {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
            </NavLink>
          ))}
        </div>
      ))}

      <div className="sidebar-footer">
        <button className="user-card" type="button" onClick={() => window.location.assign('/warehouse/admin/section/quan-ly-tai-khoan')}>
          <div className="avatar">{initials || 'AD'}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name || 'Admin'}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>Quản trị viên</div>
          </div>
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={logout}>
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
