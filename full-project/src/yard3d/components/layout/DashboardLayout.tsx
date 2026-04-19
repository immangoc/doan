import type { ReactNode } from 'react';
import ChatBox from '../../../components/warehouse/ChatBox';
import WarehouseLayout from '../../../components/warehouse/WarehouseLayout';
import './DashboardLayout.css';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <WarehouseLayout>
      <div className="app-container yard3d-embedded">
        <main className="page-content">{children}</main>
      </div>
      <ChatBox hideToggleButton={true} />
    </WarehouseLayout>
  );
}
