import React, { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Package,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  Search,
  Calendar,
  FileText,
  DollarSign,
  Box,
  Truck,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import HungThuyLogo from './HungThuyLogo';
import { useWarehouseAuth } from '../../contexts/WarehouseAuthContext';
import NotificationsBell from './NotificationsBell';
import CustomerChatBox from './CustomerChatBox';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface WarehouseLayoutProps {
  children: ReactNode;
}

export default function WarehouseLayout({ children }: WarehouseLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, accessToken } = useWarehouseAuth();

  // Get user role and name from context
  const userRole = user?.role || 'customer';
  const userName = user?.name || 'User';

  // Navigation items based on role
  const getNavigationItems = () => {
    type UserRole = 'admin' | 'planner' | 'operator' | 'yard_staff' | 'customer';
    type NavItem = {
      name: string;
      path: string;
      icon: React.ComponentType<{ size?: number }>;
      roles?: UserRole[];
    };

    const roleBasedDashboards: Record<UserRole, Omit<NavItem, 'roles'>> = {
      admin:      { name: 'Dashboard', path: '/warehouse/admin/dashboard',      icon: LayoutDashboard },
      planner:    { name: 'Dashboard', path: '/warehouse/planner/dashboard',    icon: LayoutDashboard },
      operator:   { name: 'Dashboard', path: '/yard3d/dashboard',               icon: LayoutDashboard },
      yard_staff: { name: 'Dashboard', path: '/warehouse/yard-staff/dashboard', icon: LayoutDashboard },
      customer:   { name: 'Dashboard', path: '/warehouse/customer/dashboard',   icon: LayoutDashboard },
    };

    const allItems: NavItem[] = [
      // Dashboard - role specific
      roleBasedDashboards[userRole as keyof typeof roleBasedDashboards],

      // Admin items
      { name: 'Quản lý tài khoản', path: '/warehouse/admin/section/quan-ly-tai-khoan', icon: Users, roles: ['admin'] },
      { name: 'Quản lý Container', path: '/warehouse/containers', icon: Package, roles: ['admin', 'planner', 'operator', 'yard_staff'] },
      { name: 'Quản lý Loại Container', path: '/warehouse/admin/section/quan-ly-loai-container', icon: Box, roles: ['admin'] },
      { name: 'Quản lý Loại hàng', path: '/warehouse/admin/section/quan-ly-loai-hang', icon: Package, roles: ['admin'] },
      { name: 'Quản lý Lịch trình', path: '/warehouse/admin/section/quan-ly-lich', icon: Calendar, roles: ['admin'] },
      { name: 'Quản lý Hãng tàu', path: '/warehouse/admin/section/quan-ly-hang-tau', icon: Truck, roles: ['admin'] },
      { name: 'Quản lý cước phí', path: '/warehouse/admin/section/quan-ly-cuoc-phi-bieu-cuoc', icon: DollarSign, roles: ['admin'] },
      { name: 'Báo cáo & Thống kê', path: '/warehouse/admin/section/bao-cao-thong-ke', icon: BarChart3, roles: ['admin', 'planner'] },
      { name: 'Quản trị hệ thống', path: '/warehouse/admin/section/quan-tri-he-thong', icon: Settings, roles: ['admin'] },

      // Operator items
      { name: 'Báo cáo & Thống kê', path: '/yard3d/bao-cao', icon: BarChart3, roles: ['operator'] },
      { name: 'Đơn hàng', path: '/yard3d/don-hang', icon: FileText, roles: ['operator'] },
      { name: 'Loại Container', path: '/yard3d/loai-container', icon: Box, roles: ['operator'] },
      { name: 'Loại Hàng', path: '/yard3d/loai-hang', icon: Package, roles: ['operator'] },
      { name: 'Sơ đồ bãi 3D', path: '/yard3d/3d', icon: Box, roles: ['operator'] },
      { name: 'Sơ đồ mặt phẳng', path: '/yard3d/2d', icon: Box, roles: ['operator'] },
      { name: 'Quản lý nhập bãi', path: '/yard3d/ha-bai', icon: Truck, roles: ['operator'] },
      { name: 'Quản lý xuất bãi', path: '/yard3d/xuat-bai', icon: Truck, roles: ['operator'] },
      { name: 'Quản lý kho hỏng', path: '/yard3d/kho', icon: Package, roles: ['operator'] },
      { name: 'Kiểm soát & Sự cố', path: '/yard3d/kiem-soat', icon: AlertTriangle, roles: ['operator'] },
      { name: 'Yêu cầu rút tiền', path: '/yard3d/yeu-cau-rut-tien', icon: DollarSign, roles: ['operator'] },

      // Yard staff items (Nhân viên kho bãi)
      { name: 'Sơ đồ bãi 3D',       path: '/yard3d/3d',          icon: Box,           roles: ['yard_staff'] },
      { name: 'Sơ đồ mặt phẳng',    path: '/yard3d/2d',          icon: Box,           roles: ['yard_staff'] },
      { name: 'Hạ bãi',             path: '/yard3d/ha-bai',      icon: Truck,         roles: ['yard_staff'] },
      { name: 'Xuất bãi',           path: '/yard3d/xuat-bai',    icon: Truck,         roles: ['yard_staff'] },
      { name: 'Kho hỏng',           path: '/yard3d/kho',         icon: Package,       roles: ['yard_staff'] },
      { name: 'Kiểm soát & Sự cố',  path: '/yard3d/kiem-soat',   icon: AlertTriangle, roles: ['yard_staff'] },

      // Planner items
      { name: 'Lập lịch trình', path: '/warehouse/schedule', icon: Calendar, roles: ['planner'] },

      // Customer items
      { name: 'Tài khoản', path: '/warehouse/customer/account', icon: Users, roles: ['customer'] },
      { name: 'Container của tôi', path: '/warehouse/customer/my-containers', icon: Package, roles: ['customer'] },
      { name: 'Đơn hàng', path: '/warehouse/customer/orders', icon: FileText, roles: ['customer'] },
      { name: 'Ví', path: '/warehouse/customer/wallet', icon: DollarSign, roles: ['customer'] },
      { name: 'Tra cứu & tiện ích', path: '/warehouse/customer/payments', icon: Search, roles: ['customer'] },
    ];

    return allItems.filter(item => {
      if (!item) return false;
      if (!item.roles) return true;
      return item.roles.includes(userRole as UserRole);
    });
  };

  const navigationItems = getNavigationItems();

  const getRoleBadge = (role: string) => {
    const badges = {
      admin:      { text: 'Quản trị viên',      color: 'bg-red-500' },
      planner:    { text: 'Kế hoạch',           color: 'bg-blue-500' },
      operator:   { text: 'Vận hành',           color: 'bg-green-500' },
      yard_staff: { text: 'Nhân viên kho bãi',  color: 'bg-amber-500' },
      customer:   { text: 'Khách hàng',         color: 'bg-purple-500' },
    };
    return badges[role as keyof typeof badges] || badges.customer;
  };

  const roleBadge = getRoleBadge(userRole);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Apply saved theme (light/dark) globally so all pages switch instantly.
  useEffect(() => {
    const applyTheme = (theme?: string | null) => {
      const t = theme || 'light';
      document.documentElement.classList.toggle('dark', t === 'dark');
      try {
        localStorage.setItem('ht_ui_theme', t);
      } catch {
        // ignore
      }
    };

    // Prefer localStorage for immediate UX.
    try {
      const saved = localStorage.getItem('ht_ui_theme');
      if (saved) applyTheme(saved);
    } catch {
      // ignore
    }
  }, []);

  // Sync theme/language from backend preferences (when logged in).
  useEffect(() => {
    if (!accessToken) return;
    const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-ce1eb60c`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken || publicAnonKey}`,
    };

    (async () => {
      try {
        const res = await fetch(`${apiUrl}/auth/preferences`, { headers });
        const data = await res.json();
        if (!res.ok) return;

        const prefs = data?.preferences;
        if (prefs?.theme) {
          document.documentElement.classList.toggle('dark', prefs.theme === 'dark');
          try {
            localStorage.setItem('ht_ui_theme', prefs.theme);
          } catch {
            // ignore
          }
        }
        if (prefs?.language) {
          try {
            localStorage.setItem('ht_ui_lang', prefs.language);
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    })();
  }, [accessToken]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={false}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-40 overflow-y-auto shadow-xl"
          >
            {/* Logo with Close Button */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <Link to="/"><HungThuyLogo size="md" showText={true} /></Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors lg:hidden"
              >
                <X size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="p-4 space-y-1">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                      ? 'bg-blue-900 text-white shadow-lg'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                  >
                    <item.icon size={20} />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Info */}
            <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (userRole === 'customer') navigate('/warehouse/customer/account');
                  else navigate('/warehouse/account');
                }}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-[#7C3AED] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                    {userName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {roleBadge.text}
                  </div>
                </div>
              </button>
              <button
                onClick={handleLogout}
                className="w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Đăng xuất
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden md:block">
                Hệ thống Quản lý Kho bãi Container
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="flex items-center gap-2">
                <NotificationsBell />
              </div>

              {/* Quick Action Button */}
              {userRole === 'admin' && (
                <Link to="/warehouse/containers">
                  <button className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors text-sm font-medium">
                    <Package size={16} />
                    Quản lý Container
                  </button>
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* Customer-only chat widget */}
      {userRole === 'customer' && <CustomerChatBox />}
    </div>
  );
}