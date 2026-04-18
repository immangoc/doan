import { useState } from 'react';
import {
  LayoutDashboard,
  Box,
  Truck,
  ChevronDown,
  AlertTriangle,
  Anchor,
} from 'lucide-react';
import { NavLink, Link, useLocation } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  OPERATOR: 'Vận hành',
  CUSTOMER: 'Khách hàng',
};

const navItems = [
  { icon: LayoutDashboard, label: 'Tổng quan', path: '/yard3d/tong-quan' },
  {
    icon: Box,
    label: 'Điều độ bãi & Tối ưu hóa',
    path: '#',
    subItems: [
      { label: 'Sơ đồ 3D trực quan', path: '/yard3d/3d' },
      { label: 'Sơ đồ mặt phẳng', path: '/yard3d/2d' },
    ],
  },
  { icon: Truck, label: 'Quản lý nhập bãi', path: '/yard3d/ha-bai' },
  { icon: Truck, label: 'Quản lý xuất bãi', path: '/yard3d/xuat-bai' },
  { icon: Box, label: 'Quản lý kho hỏng', path: '/yard3d/kho' },
  { icon: AlertTriangle, label: 'Kiểm soát & Sự cố', path: '/yard3d/kiem-soat' },
];

function NavItemRenderer({ item, location }: { item: typeof navItems[0]; location: any }) {
  const Icon = item.icon;
  const hasSub = !!item.subItems;
  const isSubActive =
    hasSub && item.subItems?.some((sub) => location.pathname === sub.path);
  
  const [isExpanded, setIsExpanded] = useState(isSubActive);

  return (
    <li className="nav-item">
      <NavLink
        to={item.path}
        onClick={(e) => {
          if (hasSub) {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
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
        {hasSub && (
          <ChevronDown
            size={16}
            style={{
              transition: 'transform 0.2s ease',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        )}
      </NavLink>

      {hasSub && (
        <ul 
          className="sub-menu"
          style={{
            maxHeight: isExpanded ? '200px' : '0',
            opacity: isExpanded ? 1 : 0,
            overflow: 'hidden',
            transition: 'all 0.3s ease-in-out',
            margin: isExpanded ? '4px 0 0 0' : '0',
          }}
        >
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
}

export function Sidebar() {
  const location = useLocation();
  const user = useAuth();
  const displayName = user?.username ?? 'Phạm Thị Lan';
  const displayRole = ROLE_LABELS[user?.role ?? ''] ?? 'Vận hành';
  const avatarChar = displayName.charAt(0).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link to="/warehouse/admin/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="logo-placeholder" style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
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
        </Link>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item, index) => (
            <NavItemRenderer key={index} item={item} location={location} />
          ))}
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
