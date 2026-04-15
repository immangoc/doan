import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { WarehouseAuthProvider } from './contexts/WarehouseAuthContext';
import WarehouseLogin from './pages/warehouse/WarehouseLogin';
import WarehouseRegister from './pages/warehouse/WarehouseRegister';
import WarehouseDashboard from './pages/warehouse/WarehouseDashboard';
import WarehouseContainerManagement from './pages/warehouse/ContainerManagement';
import UserManagement from './pages/warehouse/UserManagement';
import PlannerDashboard from './pages/warehouse/role/PlannerDashboard';
import OperatorDashboard from './pages/warehouse/role/OperatorDashboard';
import CustomerDashboard from './pages/warehouse/role/CustomerDashboard';
import ProtectedRoute from './components/warehouse/ProtectedRoute';
import AdminWarehouseManagementLayout from './components/warehouse/AdminWarehouseManagementLayout';
import AdminDashboardPage from './pages/warehouse/admin/Dashboard';
import BaoCaoThongKePage from './pages/warehouse/admin/BaoCaoThongKe';
import DonHangPage from './pages/warehouse/admin/DonHang';
import QuanLyLoaiContainerPage from './pages/warehouse/admin/QuanLyLoaiContainer';
import QuanLyLoaiHangPage from './pages/warehouse/admin/QuanLyLoaiHang';
import QuanLyHangTauPage from './pages/warehouse/admin/QuanLyHangTau';
import QuanLyLichPage from './pages/warehouse/admin/QuanLyLich';
import QuanLyCuocPhiPage from './pages/warehouse/admin/QuanLyCuocPhi';
import QuanTriHeThongPage from './pages/warehouse/admin/QuanTriHeThong';
import QuanLyTaiKhoanPage from './pages/warehouse/admin/QuanLyTaiKhoan';
import CustomerAccount from './pages/warehouse/role/CustomerAccount';
import MyContainers from './pages/warehouse/role/MyContainers';
import Orders from './pages/warehouse/role/Orders';
import Payments from './pages/warehouse/role/Payments';
import Yard3DPage from './pages/warehouse/Yard3DPage';
import YardShell from './pages/warehouse/YardShell';
import { Warehouse2D } from '@yard3d/pages/Warehouse2D';
import { WarehouseOverview } from '@yard3d/pages/WarehouseOverview';
import { HaBai } from '@yard3d/pages/HaBai';
import { XuatBai } from '@yard3d/pages/XuatBai';
import { Kho } from '@yard3d/pages/Kho';
import { KiemSoat } from '@yard3d/pages/KiemSoat';

// Public Pages
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import NewsPage from './pages/NewsPage';
import NewsDetailPage from './pages/NewsDetailPage';
import ManagementSystemPage from './pages/ManagementSystemPage';

export default function App() {
  return (
    <WarehouseAuthProvider>
      <Router>
        <Routes>
          {/* Public Website Pages */}
          <Route path="/" element={<HomePage />} />
          <Route path="/gioi-thieu" element={<AboutPage />} />
          <Route path="/lien-he" element={<ContactPage />} />
          <Route path="/tin-tuc" element={<NewsPage />} />
          <Route path="/tin-tuc/:newsId" element={<NewsDetailPage />} />
          <Route path="/he-thong-quan-ly" element={<ManagementSystemPage />} />

          {/* Auth Routes */}
          <Route path="/warehouse/login" element={<WarehouseLogin />} />
          <Route path="/warehouse/register" element={<WarehouseRegister />} />

          {/* Protected Routes */}
          <Route
            path="/warehouse"
            element={
              <ProtectedRoute>
                <WarehouseDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouse/containers"
            element={
              <ProtectedRoute allowedRoles={['admin', 'planner', 'operator']}>
                <WarehouseContainerManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouse/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouse/yard"
            element={<Navigate to="/warehouse/yard/tong-quan" replace />}
          />
          <Route
            path="/warehouse/yard/3d"
            element={
              <ProtectedRoute allowedRoles={['admin', 'planner', 'operator']}>
                <YardShell>
                  <Yard3DPage />
                </YardShell>
              </ProtectedRoute>
            }
          />
          <Route path="/warehouse/yard-3d" element={<Navigate to="/warehouse/yard/3d" replace />} />
          <Route
            path="/warehouse/yard/tong-quan"
            element={
              <ProtectedRoute allowedRoles={['admin', 'planner', 'operator']}>
                <YardShell>
                  <WarehouseOverview />
                </YardShell>
              </ProtectedRoute>
            }
          />
          {/* Backward-compatible aliases from standalone 3d app */}
          <Route path="/tong-quan" element={<Navigate to="/warehouse/yard/tong-quan" replace />} />
          <Route path="/3d" element={<Navigate to="/warehouse/yard/3d" replace />} />
          <Route path="/2d" element={<Navigate to="/warehouse/yard/2d" replace />} />
          <Route path="/ha-bai" element={<Navigate to="/warehouse/yard/ha-bai" replace />} />
          <Route path="/xuat-bai" element={<Navigate to="/warehouse/yard/xuat-bai" replace />} />
          <Route path="/kho" element={<Navigate to="/warehouse/yard/kho" replace />} />
          <Route path="/kiem-soat" element={<Navigate to="/warehouse/yard/kiem-soat" replace />} />
          <Route
            path="/warehouse/yard/2d"
            element={
              <ProtectedRoute allowedRoles={['admin', 'planner', 'operator']}>
                <YardShell>
                  <Warehouse2D />
                </YardShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouse/yard/ha-bai"
            element={
              <ProtectedRoute allowedRoles={['admin', 'planner', 'operator']}>
                <YardShell>
                  <HaBai />
                </YardShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouse/yard/xuat-bai"
            element={
              <ProtectedRoute allowedRoles={['admin', 'planner', 'operator']}>
                <YardShell>
                  <XuatBai />
                </YardShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouse/yard/kho"
            element={
              <ProtectedRoute allowedRoles={['admin', 'planner', 'operator']}>
                <YardShell>
                  <Kho />
                </YardShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouse/yard/kiem-soat"
            element={
              <ProtectedRoute allowedRoles={['admin', 'planner', 'operator']}>
                <YardShell>
                  <KiemSoat />
                </YardShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouse/yard/*"
            element={<Navigate to="/warehouse/yard/tong-quan" replace />}
          />

          {/* Role-based Dashboards */}
          <Route
            path="/warehouse/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminWarehouseManagementLayout headerTitle="Hùng Thủy">
                  <Outlet />
                </AdminWarehouseManagementLayout>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/warehouse/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="section/bao-cao-thong-ke" element={<BaoCaoThongKePage />} />
            <Route path="section/don-hang" element={<DonHangPage />} />
            <Route path="section/quan-ly-loai-container" element={<QuanLyLoaiContainerPage />} />
            <Route path="section/quan-ly-loai-hang" element={<QuanLyLoaiHangPage />} />
            <Route path="section/quan-ly-hang-tau" element={<QuanLyHangTauPage />} />
            <Route path="section/quan-ly-lich" element={<QuanLyLichPage />} />
            <Route path="section/quan-ly-cuoc-phi-bieu-cuoc" element={<QuanLyCuocPhiPage />} />
            <Route path="section/quan-tri-he-thong" element={<QuanTriHeThongPage />} />
            <Route path="section/quan-ly-tai-khoan" element={<QuanLyTaiKhoanPage />} />
            <Route path="*" element={<Navigate to="/warehouse/admin/dashboard" replace />} />
          </Route>
          <Route
            path="/warehouse/planner/dashboard"
            element={
              <ProtectedRoute allowedRoles={['planner']}>
                <PlannerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouse/operator/dashboard"
            element={
              <ProtectedRoute allowedRoles={['operator']}>
                <OperatorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouse/customer/dashboard"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouse/customer/account"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerAccount />
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouse/customer/my-containers"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <MyContainers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouse/customer/orders"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouse/customer/payments"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <Payments />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </Router>
    </WarehouseAuthProvider>
  );
}
