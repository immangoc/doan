import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, ChevronDown, Ship, LogOut, Settings, LayoutDashboard } from 'lucide-react';
import { useWarehouseAuth } from '../contexts/WarehouseAuthContext';
import HungThuyLogo from './warehouse/HungThuyLogo';
import ChatBox from './warehouse/ChatBox';

const navLinks = [
  { href: '/', label: 'Trang chủ' },
  { href: '/gioi-thieu', label: 'Giới thiệu' },
  { href: '/tin-tuc', label: 'Tin tức' },
  { href: '/he-thong-quan-ly', label: 'Hệ thống quản lý' },
  { href: '/lien-he', label: 'Liên hệ' },
];

function getRoleDashboard(role: string) {
  switch (role) {
    case 'admin': return '/warehouse/admin/dashboard';
    case 'planner': return '/warehouse/planner/dashboard';
    case 'operator': return '/warehouse/operator/dashboard';
    default: return '/warehouse/customer/dashboard';
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case 'admin': return 'Quản trị viên';
    case 'planner': return 'Lập kế hoạch';
    case 'operator': return 'Vận hành';
    default: return 'Khách hàng';
  }
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const { user, logout } = useWarehouseAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setUserDropdown(false);
    navigate('/');
  };

  const isActive = (href: string) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-lg'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <HungThuyLogo size="md" showText={true} />
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? 'bg-blue-900 text-white'
                      : scrolled
                      ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-900'
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right Section */}
            <div className="hidden lg:flex items-center gap-3">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdown(!userDropdown)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                      scrolled ? 'hover:bg-gray-100' : 'hover:bg-white/20'
                    }`}
                  >
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-900 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="text-left">
                      <div className={`text-sm font-semibold ${scrolled ? 'text-gray-800' : 'text-white'}`}>
                        {user.name}
                      </div>
                      <div className={`text-xs ${scrolled ? 'text-gray-500' : 'text-blue-200'}`}>
                        {getRoleLabel(user.role)}
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${userDropdown ? 'rotate-180' : ''} ${scrolled ? 'text-gray-500' : 'text-blue-200'}`} />
                  </button>

                  <AnimatePresence>
                    {userDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
                      >
                        <div className="p-3 border-b border-gray-100 bg-blue-50">
                          <div className="text-sm font-semibold text-blue-900">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                        <Link
                          to={getRoleDashboard(user.role)}
                          onClick={() => setUserDropdown(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-900 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Dashboard
                        </Link>
                        <Link
                          to="/he-thong-quan-ly"
                          onClick={() => setUserDropdown(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-900 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          Hệ thống quản lý
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                        >
                          <LogOut className="w-4 h-4" />
                          Đăng xuất
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <>
                  <Link
                    to="/warehouse/login"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      scrolled
                        ? 'text-blue-900 hover:bg-blue-50'
                        : 'text-white hover:bg-white/20'
                    }`}
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/warehouse/register"
                    className="px-5 py-2 bg-white text-blue-900 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors shadow-sm"
                  >
                    Đăng ký
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className={`lg:hidden p-2 rounded-lg ${scrolled ? 'text-gray-700' : 'text-white'}`}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white border-t border-gray-100 shadow-lg overflow-hidden"
            >
              <div className="px-4 py-4 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive(link.href)
                        ? 'bg-blue-900 text-white'
                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-900'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
                  {user ? (
                    <>
                      <div className="flex items-center gap-3 px-4 py-2">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-900 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-800">{user.name}</div>
                          <div className="text-xs text-gray-500">{getRoleLabel(user.role)}</div>
                        </div>
                      </div>
                      <Link
                        to={getRoleDashboard(user.role)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-blue-900 font-medium hover:bg-blue-50 rounded-lg"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 font-medium hover:bg-red-50 rounded-lg"
                      >
                        <LogOut className="w-4 h-4" />
                        Đăng xuất
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/warehouse/login" className="block px-4 py-2 text-center text-sm font-medium text-blue-900 border border-blue-200 rounded-lg hover:bg-blue-50">
                        Đăng nhập
                      </Link>
                      <Link to="/warehouse/register" className="block px-4 py-2 text-center text-sm font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800">
                        Đăng ký
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <HungThuyLogo size="md" showText variant="white" />
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Công ty Vận tải Cảng biển Hùng Thủy - Đối tác logistics hàng đầu Việt Nam với hơn 15 năm kinh nghiệm trong ngành vận tải biển và quản lý kho bãi container.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Dịch vụ</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                {['Quản lý Container', 'Vận tải biển', 'Logistics tích hợp', 'Thủ tục hải quan', 'Kho bãi'].map(s => (
                  <li key={s}><a href="#" className="hover:text-blue-300 transition-colors">{s}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Liên kết</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                {navLinks.map(l => (
                  <li key={l.href}><Link to={l.href} className="hover:text-blue-300 transition-colors">{l.label}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Liên hệ</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>📍 Số 26A Lê Thánh Tông, Phường Ngô Quyền, Hải Phòng</li>
                <li>📞 Hotline: 02253768278</li>
                <li>📞 VP: 0904156269</li>
                <li>📧 vantai.hungthuy@gmail.com</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-gray-500 text-sm">© 2025 Công ty Vận tải Cảng biển Hùng Thủy. All rights reserved.</p>
            <p className="text-gray-600 text-xs">Giấy phép kinh doanh số: 0312345678 - Cấp bởi Sở KHĐT Hải Phòng</p>
          </div>
        </div>
      </footer>

      {/* Chatbox */}
      <ChatBox />

      {/* Click outside to close dropdown */}
      {userDropdown && (
        <div className="fixed inset-0 z-30" onClick={() => setUserDropdown(false)} />
      )}
    </div>
  );
}
