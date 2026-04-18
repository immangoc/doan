import { motion } from 'motion/react';
import { Link } from 'react-router';
import {
  LayoutDashboard, Package, Users, BarChart3, Shield, Settings,
  ArrowRight, CheckCircle2, Lock, ChevronRight, Container, Anchor
} from 'lucide-react';
import { useWarehouseAuth } from '../contexts/WarehouseAuthContext';
import MainLayout from '../components/MainLayout';

const roles = [
  {
    role: 'operator',
    label: 'Quản lý kho bãi',
    color: 'bg-green-50 border-green-200 text-green-700',
    badge: 'bg-green-100 text-green-700',
    icon: Settings,
    iconBg: 'bg-green-600',
    features: [
      'Quản lý kho bãi container',
      'Cập nhật trạng thái xuất hàng',
      'Ghi nhận hoạt động kho bãi',
      'Quản lý vị trí container',
      'Báo cáo ca làm việc',
      'Thông báo sự cố',
    ],
    dashboardPath: '/warehouse/operator/dashboard',
  },
  {
    role: 'planner',
    label: 'Điều phối vận chuyển',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
    icon: BarChart3,
    iconBg: 'bg-blue-600',
    features: [
      'Lập kế hoạch vận chuyển',
      'Thêm và cập nhật container',
      'Quản lý lịch tàu & ETD',
      'Theo dõi tuyến vận chuyển',
      'Báo cáo kế hoạch',
      'Quản lý hãng tàu',
    ],
    dashboardPath: '/warehouse/planner/dashboard',
  },
  {
    role: 'customer',
    label: 'Khách hàng',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    badge: 'bg-purple-100 text-purple-700',
    icon: Users,
    iconBg: 'bg-purple-600',
    features: [
      'Xem container của mình',
      'Theo dõi trạng thái hàng hóa',
      'Lịch sử vận chuyển',
      'Thông báo cập nhật',
      'Tải chứng từ vận chuyển',
      'Liên hệ hỗ trợ',
    ],
    dashboardPath: '/warehouse/customer/dashboard',
  },
  {
    role: 'admin',
    label: 'Quản trị viên',
    color: 'bg-red-50 border-red-200 text-red-700',
    badge: 'bg-red-100 text-red-700',
    icon: Shield,
    iconBg: 'bg-red-500',
    features: [
      'Toàn quyền quản lý hệ thống',
      'Quản lý người dùng và phân quyền',
      'Xem báo cáo & thống kê tổng hợp',
      'Thêm, sửa, xóa container',
      'Quản lý dữ liệu kho bãi',
      'Cài đặt hệ thống',
    ],
    dashboardPath: '/warehouse/admin/dashboard',
  },
];

const systemFeatures = [
  { icon: Package, title: 'Quản lý Container', desc: 'Theo dõi toàn bộ container từ khi nhập đến khi xuất kho với trạng thái thời gian thực.' },
  { icon: BarChart3, title: 'Báo cáo & Thống kê', desc: 'Dashboard trực quan với biểu đồ, số liệu và phân tích dữ liệu chuyên sâu.' },
  { icon: Users, title: 'Phân quyền RBAC', desc: 'Hệ thống phân quyền 4 cấp độ: Admin, Planner, Operator, Customer.' },
  { icon: Shield, title: 'Bảo mật JWT', desc: 'Xác thực JWT token + bcrypt encryption đảm bảo an toàn tuyệt đối.' },
  { icon: Container, title: 'Kho bãi thông minh', desc: 'Quản lý vị trí, khu vực, sức chứa và tối ưu hóa bố trí container.' },
  { icon: Anchor, title: 'Tích hợp cảng', desc: 'Kết nối trực tiếp với hệ thống cảng biển, cập nhật ETA/ETD tự động.' },
];

function getRoleLabel(role: string) {
  switch (role) {
    case 'admin': return 'Quản trị viên';
    case 'planner': return 'Điều phối vận chuyển';
    case 'operator': return 'Quản lý kho bãi';
    default: return 'Khách hàng';
  }
}

function getDashboardPath(role: string) {
  switch (role) {
    case 'admin': return '/warehouse/admin/dashboard';
    case 'planner': return '/warehouse/planner/dashboard';
    case 'operator': return '/warehouse/operator/dashboard';
    default: return '/warehouse/customer/dashboard';
  }
}

export default function ManagementSystemPage() {
  const { user } = useWarehouseAuth();

  return (
    <MainLayout>
      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-blue-950 to-blue-800 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-blue-700/30 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-blue-200 rounded-full text-sm font-semibold mb-6">
              <LayoutDashboard className="w-4 h-4" />
              Hệ thống quản lý
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">
              Hệ thống Quản lý<br />
              <span className="text-blue-300">Kho bãi Container</span>
            </h1>
            <p className="text-blue-100 text-xl max-w-2xl mx-auto mb-10">
              Giải pháp số hóa toàn diện cho quản lý kho bãi container, vận hành cảng biển và logistics hiện đại.
            </p>

            {user ? (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3 bg-white/10 px-5 py-3 rounded-xl text-white">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">
                    {user.name?.charAt(0)}
                  </div>
                  <span>Xin chào, <strong>{user.name}</strong> ({getRoleLabel(user.role)})</span>
                </div>
                <Link
                  to={getDashboardPath(user.role)}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-900 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-xl"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  Vào Dashboard của tôi
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/warehouse/login"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-900 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-xl"
                >
                  <Lock className="w-5 h-5" />
                  Đăng nhập hệ thống
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/warehouse/register"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 text-white font-bold rounded-xl border border-white/30 hover:bg-white/20 transition-all"
                >
                  Đăng ký tài khoản
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* System Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Tính năng hệ thống</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Hệ thống quản lý kho bãi container được xây dựng với công nghệ hiện đại, đáp ứng mọi yêu cầu vận hành của doanh nghiệp.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {systemFeatures.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all border border-gray-100 group"
              >
                <div className="w-12 h-12 bg-blue-900 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feat.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{feat.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Role-based Access */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Phân quyền theo vai trò</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Hệ thống RBAC (Role-Based Access Control) với 4 vai trò riêng biệt, đảm bảo mỗi người dùng chỉ truy cập được chức năng phù hợp.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {roles.map((r, i) => (
              <motion.div
                key={r.role}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`border-2 rounded-2xl p-6 ${r.color} hover:shadow-lg transition-all`}
              >
                <div className={`w-12 h-12 ${r.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                  <r.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-bold text-gray-900 text-lg">{r.label}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${r.badge}`}>
                    {r.role}
                  </span>
                </div>
                <ul className="space-y-2 mb-6">
                  {r.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                {user && user.role === r.role ? (
                  <Link
                    to={r.dashboardPath}
                    className="w-full flex items-center justify-center gap-1 px-4 py-2.5 bg-blue-900 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors"
                  >
                    Vào Dashboard <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <Link
                    to="/warehouse/login"
                    className="w-full flex items-center justify-center gap-1 px-4 py-2.5 bg-white/60 text-gray-700 rounded-xl text-sm font-medium hover:bg-white transition-colors border border-gray-200"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Đăng nhập để truy cập
                  </Link>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

    </MainLayout>
  );
}
