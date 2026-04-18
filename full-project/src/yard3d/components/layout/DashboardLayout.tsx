import { useState } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import ChatBox from '../../../components/warehouse/ChatBox';
import './DashboardLayout.css';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
    <div className="app-container">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className={`sidebar-wrapper${sidebarOpen ? ' open' : ''}`}>
        <Sidebar />
      </div>

      <div className="main-content">
        <Topbar onMenuToggle={() => setSidebarOpen((v) => !v)} />
        <main className="page-content">{children}</main>
      </div>
    </div>

    {/* Global ChatBox driven by Topbar icon - moved OUTSIDE app-container to bypass Yard3D CSS resets */}
    <ChatBox hideToggleButton={true} />
    </>
  );
}
