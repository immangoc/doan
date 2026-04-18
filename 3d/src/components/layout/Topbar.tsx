import { Bell, MessageCircle, Settings, Home, ChevronRight, ChevronDown, Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import './Topbar.css';

interface TopbarProps {
  onMenuToggle?: () => void;
}

const BREADCRUMB_MAP: Record<string, { parent: string; current: string }> = {
  '/tong-quan': { parent: '', current: 'Tổng quan 3D kho bãi' },
  '/3d': { parent: 'Điều độ bãi & Tối ưu hóa', current: 'Sơ đồ 3D trực quan' },
  '/2d': { parent: 'Điều độ bãi & Tối ưu hóa', current: 'Sơ đồ 2D mặt phẳng' },
  '/ha-bai': { parent: 'Điều độ bãi & Tối ưu hóa', current: 'Quản lý nhập bãi' },
  '/xuat-bai': { parent: 'Điều độ bãi & Tối ưu hóa', current: 'Quản lý xuất bãi' },
  '/kho': { parent: 'Quản lý Kho & Container', current: 'Quản lý Kho' },
};

export function Topbar({ onMenuToggle }: TopbarProps) {
  const { pathname } = useLocation();
  const crumb = BREADCRUMB_MAP[pathname] ?? { parent: '', current: '' };

  return (
    <header className="topbar">
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
              <span className="breadcrumb-item">{crumb.parent}</span>
            </>
          )}
          {crumb.current && (
            <>
              <ChevronRight size={14} className="breadcrumb-chevron" />
              <span className="breadcrumb-item active">{crumb.current}</span>
            </>
          )}
        </nav>
      </div>

      <div className="topbar-right">
        <button className="icon-btn language-btn">
          <span className="flag-icon">🇻🇳</span>
          <span className="lang-label">Tiếng Việt</span>
          <ChevronDown size={14} />
        </button>
        <div className="topbar-icons">
          <button className="icon-btn notification-btn" aria-label="Notifications">
            <Bell size={20} />
            <span className="notif-badge">3</span>
          </button>
          <button className="icon-btn" aria-label="Messages"><MessageCircle size={20} /></button>
          <button className="icon-btn" aria-label="Settings"><Settings size={20} /></button>
        </div>
      </div>
    </header>
  );
}
