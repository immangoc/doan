import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WarehouseOverview } from './pages/WarehouseOverview';
import { Warehouse3D } from './pages/Warehouse3D';
import { Warehouse2D } from './pages/Warehouse2D';
import { Unauthorized } from './pages/Unauthorized';
import { HaBai } from './pages/HaBai';
import { XuatBai } from './pages/XuatBai';
import { Kho } from './pages/Kho';
import { KiemSoat } from './pages/KiemSoat';
import { AuthProvider } from './contexts/AuthContext';
import { getToken, decodeJwtUser } from './services/apiClient';
import { fetchAllYards } from './services/yardService';
import { processApiYards, setYardData } from './store/yardStore';
import { fetchAndSetOccupancy } from './services/containerPositionService';

function App() {
  const token = getToken();
  const user = token ? decodeJwtUser(token) : null;

  // Phase 3+4: fetch yard structure then container occupancy on boot.
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
    <AuthProvider user={user}>
      <BrowserRouter>
        <Routes>
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/" element={<Navigate to="/tong-quan" replace />} />
          <Route path="/tong-quan" element={<WarehouseOverview />} />
          <Route path="/3d" element={<Warehouse3D />} />
          <Route path="/2d" element={<Warehouse2D />} />
          <Route path="/ha-bai" element={<HaBai />} />
          <Route path="/xuat-bai" element={<XuatBai />} />
          <Route path="/kho" element={<Kho />} />
          <Route path="/kiem-soat" element={<KiemSoat />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
