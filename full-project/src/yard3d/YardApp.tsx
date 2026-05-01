import React, { useEffect } from 'react';
import { Toaster } from 'sonner';
import { Routes, Route, Navigate, useLocation } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import { WarehouseOverview } from './pages/WarehouseOverview';
import { Warehouse3D } from './pages/Warehouse3D';
import { Warehouse2D } from './pages/Warehouse2D';
import { HaBai } from './pages/HaBai';
import { XuatBai } from './pages/XuatBai';
import { Kho } from './pages/Kho';
import { KiemSoat } from './pages/KiemSoat';
import { BaoCaoSuCo } from './pages/BaoCaoSuCo';
import { fetchAllYards } from './services/yardService';
import { processApiYards, setYardData } from './store/yardStore';
import { fetchAndSetOccupancy } from './services/containerPositionService';

// Admin management pages (shared with operator)
import AdminDashboardPage from '../pages/warehouse/admin/Dashboard';
import BaoCaoThongKePage from '../pages/warehouse/admin/BaoCaoThongKe';
import DonHangPage from '../pages/warehouse/admin/DonHang';
import QuanLyLoaiContainerPage from '../pages/warehouse/admin/QuanLyLoaiContainer';
import QuanLyLoaiHangPage from '../pages/warehouse/admin/QuanLyLoaiHang';
import WithdrawalRequestsPage from '../pages/warehouse/admin/WithdrawalRequests';

import { DashboardLayout } from './components/layout/DashboardLayout';

// CSS for admin management pages
import '../styles/warehouse-management.css';

// Scoped CSS variables (no global resets — those come from TailwindCSS)
import './yard3d.css';

/** Wraps a management page inside the wm-shell styling context */
function WmPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="wm-shell" style={{ height: 'auto', overflow: 'visible', background: 'transparent' }}>
      <div style={{ flex: 1 }}>
        <div style={{ padding: 0 }}>
          <div className="page">{children}</div>
        </div>
      </div>
    </div>
  );
}

function currentRole(): string {
  try {
    const raw = localStorage.getItem('ht_user');
    if (!raw) return '';
    const u = JSON.parse(raw);
    return (u.role || '').toString().toUpperCase();
  } catch { return ''; }
}

export default function YardApp() {
  const location = useLocation();

  // Override global body styles while YardApp is mounted — but skip for operators
  // since they view yard3d pages embedded inside WarehouseLayout which manages body.
  // ALSO skip for dashboard pages like ha-bai, xuat-bai, kho, kiem-soat so they can scroll.
  useEffect(() => {
    if (currentRole() === 'OPERATOR') return;
    const is3DPage = ['/yard3d/tong-quan', '/yard3d/3d', '/yard3d/2d'].includes(location.pathname);
    if (is3DPage) {
      document.body.classList.add('yard3d-active-body');
    } else {
      document.body.classList.remove('yard3d-active-body');
    }
    return () => {
      document.body.classList.remove('yard3d-active-body');
    };
  }, [location.pathname]);

  // Fetch yard structure then container occupancy on boot.
  // Scenes fall back to mock seeded data until each store is populated.
  useEffect(() => {
    fetchAllYards()
      .then((yards) => {
        setYardData(processApiYards(yards));
        return fetchAndSetOccupancy(yards);
      })
      .catch(() => {
        // Fetch failed — scenes will continue using mock data from warehouse.ts
      });
  }, []);

  return (
    <AuthProvider>
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        <Route index element={<Navigate to="tong-quan" replace />} />
        <Route path="tong-quan" element={<WarehouseOverview />} />
        <Route path="3d" element={<Warehouse3D />} />
        <Route path="2d" element={<Warehouse2D />} />
        <Route path="ha-bai" element={<HaBai />} />
        <Route path="xuat-bai" element={<XuatBai />} />
        <Route path="kho" element={<Kho />} />
        <Route path="kiem-soat" element={<KiemSoat />} />
        <Route path="bao-cao-su-co" element={<BaoCaoSuCo />} />
        {/* Management pages (shared with admin) */}
        <Route path="dashboard" element={<DashboardLayout><WmPage><AdminDashboardPage /></WmPage></DashboardLayout>} />
        <Route path="bao-cao" element={<DashboardLayout><WmPage><BaoCaoThongKePage /></WmPage></DashboardLayout>} />
        <Route path="don-hang" element={<DashboardLayout><WmPage><DonHangPage /></WmPage></DashboardLayout>} />
        <Route path="loai-container" element={<DashboardLayout><WmPage><QuanLyLoaiContainerPage /></WmPage></DashboardLayout>} />
        <Route path="loai-hang" element={<DashboardLayout><WmPage><QuanLyLoaiHangPage /></WmPage></DashboardLayout>} />
        <Route path="yeu-cau-rut-tien" element={<DashboardLayout><WmPage><WithdrawalRequestsPage /></WmPage></DashboardLayout>} />
      </Routes>
    </AuthProvider>
  );
}
