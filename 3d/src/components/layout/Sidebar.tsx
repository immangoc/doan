import {
  LayoutDashboard,
  Box,
  Truck,
  ChevronDown,
  AlertTriangle,
  Anchor,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  OPERATOR: 'Vận hành',
  CUSTOMER: 'Khách hàng',
};

const navItems = [
  { icon: LayoutDashboard, label: 'Tổng quan', path: '/tong-quan' },
  {
    icon: Box,
    label: 'Điều độ bãi & Tối ưu hóa',
    path: '#',
    subItems: [
      { label: 'Sơ đồ 3D trực quan', path: '/3d' },
      { label: 'Sơ đồ mặt phẳng', path: '/2d' },
    ],
  },
  { icon: Truck, label: 'Quản lý nhập bãi', path: '/ha-bai' },
  { icon: Truck, label: 'Quản lý xuất bãi', path: '/xuat-bai' },
  { icon: Box, label: 'Quản lý Kho & Container', path: '/kho' },
  { icon: AlertTriangle, label: 'Kiểm soát & Sự cố', path: '/kiem-soat' },
];

export function Sidebar() {
  const location = useLocation();
  const user = useAuth();
  const displayName = user?.username ?? 'Phạm Thị Lan';
  const displayRole = ROLE_LABELS[user?.role ?? ''] ?? 'Vận hành';
  const avatarChar = displayName.charAt(0).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-placeholder" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className="logo-icon-img"
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
              overflow: 'hidden'
            }}
          >
            <img src="/logo-new.svg" alt="Hùng Thủy logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div className="logo-text">
            <span className="logo-name">Hùng Thủy</span>
            <span className="logo-sub">Port Logistics</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const hasSub = !!item.subItems;
            const isSubActive =
              hasSub && item.subItems?.some((sub) => location.pathname === sub.path);

            return (
              <li key={index} className="nav-item">
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    isActive && !hasSub
                      ? 'active-link'
                      : isSubActive
                        ? 'parent-active'
                        : ''
                  }
                >
                  <Icon size={20} className="nav-icon" />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {hasSub && <ChevronDown size={16} />}
                </NavLink>

                {hasSub && (
                  <ul className="sub-menu">
                    {item.subItems!.map((sub, sIdx) => (
                      <li key={sIdx}>
                        <NavLink
                          to={sub.path}
                          className={({ isActive }) => (isActive ? 'sub-active' : '')}
                        >
                          {sub.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">{avatarChar}</div>
          <div className="user-info">
            <p className="user-name">{displayName}</p>
            <span className="user-role-badge">{displayRole}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
