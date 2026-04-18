import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import { WarehouseOverview } from './pages/WarehouseOverview';
import { Warehouse3D } from './pages/Warehouse3D';
import { Warehouse2D } from './pages/Warehouse2D';
import { HaBai } from './pages/HaBai';
import { XuatBai } from './pages/XuatBai';
import { Kho } from './pages/Kho';
import { KiemSoat } from './pages/KiemSoat';
import { fetchAllYards } from './services/yardService';
import { processApiYards, setYardData } from './store/yardStore';
import { fetchAndSetOccupancy } from './services/containerPositionService';

// Scoped CSS variables (no global resets — those come from TailwindCSS)
import './yard3d.css';

export default function YardApp() {
  // Override global body styles while YardApp is mounted
  useEffect(() => {
    document.body.classList.add('yard3d-active-body');
    return () => {
      document.body.classList.remove('yard3d-active-body');
    };
  }, []);

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
      <Routes>
        <Route index element={<Navigate to="tong-quan" replace />} />
        <Route path="tong-quan" element={<WarehouseOverview />} />
        <Route path="3d" element={<Warehouse3D />} />
        <Route path="2d" element={<Warehouse2D />} />
        <Route path="ha-bai" element={<HaBai />} />
        <Route path="xuat-bai" element={<XuatBai />} />
        <Route path="kho" element={<Kho />} />
        <Route path="kiem-soat" element={<KiemSoat />} />
      </Routes>
    </AuthProvider>
  );
}
