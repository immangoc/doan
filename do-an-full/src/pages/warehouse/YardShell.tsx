import React, { type ReactNode, useEffect, useMemo } from 'react';
import './YardShell.css';
import '@yard3d/components/layout/DashboardLayout.css';
import '@yard3d/components/layout/Sidebar.css';
import '@yard3d/components/layout/Topbar.css';
import '@yard3d/pages/WarehouseOverview.css';
import '@yard3d/pages/Warehouse3D.css';
import '@yard3d/pages/Warehouse2D.css';
import '@yard3d/pages/management.css';
import { AuthProvider } from '../../../../3d/src/contexts/AuthContext';
import { decodeJwtUser } from '../../../../3d/src/services/apiClient';
import { fetchAllYards } from '../../../../3d/src/services/yardService';
import { processApiYards, setYardData } from '../../../../3d/src/store/yardStore';
import { fetchAndSetOccupancy } from '../../../../3d/src/services/containerPositionService';

type YardShellProps = {
  children: ReactNode;
};

export default function YardShell({ children }: YardShellProps) {
  const [ready, setReady] = React.useState(false);
  const user = useMemo(() => {
    const token = localStorage.getItem('ht_token');
    return token ? decodeJwtUser(token) : null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      try {
        const yards = await fetchAllYards();
        if (cancelled) return;
        setYardData(processApiYards(yards));
        await fetchAndSetOccupancy(yards);
      } catch (err) {
        // Keep UI alive with mock fallback when backend is temporarily unavailable.
        console.error('[YardShell] failed to bootstrap yard data', err);
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthProvider user={user}>
      <div className="yard-shell">
        {ready ? (
          children
        ) : (
          <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
            <div style={{ display: 'grid', justifyItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '999px',
                  border: '4px solid #dbeafe',
                  borderTopColor: '#1e3a8a',
                  animation: 'refresh-spin 1s linear infinite',
                }}
              />
              <div style={{ color: '#64748b', fontSize: 13 }}>Dang dong bo du lieu kho...</div>
            </div>
          </div>
        )}
      </div>
    </AuthProvider>
  );
}
