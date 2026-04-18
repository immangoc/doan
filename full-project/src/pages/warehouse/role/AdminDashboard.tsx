import { useEffect, useMemo, useState } from 'react';
import { useWarehouseAuth, API_BASE } from '../../../contexts/WarehouseAuthContext';
import {
  Package,
  Activity,
  RefreshCw,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingUp,
  LogIn,
  LogOut,
} from 'lucide-react';
import AdminWarehouseManagementLayout from '../../../components/warehouse/AdminWarehouseManagementLayout';
import { Link } from 'react-router';

type ZoneOccupancy = {
  zoneId: number;
  zoneName: string;
  yardName: string;
  capacitySlots: number;
  occupiedSlots: number;
  occupancyRate: number;
};

type ContainerStatusCount = {
  statusName: string;
  count: number;
};

type AdminDashData = {
  gateInToday: number;
  gateOutToday: number;
  containersInYard: number;
  totalContainers: number;
  overdueContainers: number;
  pendingOrders: number;
  totalOrders: number;
  openAlerts: number;
  criticalAlerts: number;
  containersByStatus: ContainerStatusCount[];
  zoneOccupancy: ZoneOccupancy[];
};

export default function AdminDashboard() {
  const { accessToken } = useWarehouseAuth();
  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    [accessToken],
  );

  const [dash, setDash]   = useState<AdminDashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${API_BASE}/admin/dashboard`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tải dashboard');
      setDash(data.data);
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statCards = dash ? [
    { title: 'Tổng đơn hàng', value: dash.totalOrders, icon: FileText, sub: `${dash.pendingOrders} đang chờ duyệt`, si: 'si-blue' },
    { title: 'Container trong kho', value: dash.containersInYard, icon: Package, sub: `${dash.totalContainers} tổng cộng`, si: 'si-green' },
    { title: 'Tổng container', value: dash.totalContainers, icon: TrendingUp, sub: `${dash.overdueContainers} quá hạn`, si: 'si-purple' },
    { title: 'Cảnh báo mở', value: dash.openAlerts, icon: AlertCircle, sub: `${dash.criticalAlerts} nghiêm trọng`, si: dash.criticalAlerts > 0 ? 'si-red' : '' },
  ] : [];

  return (
    <AdminWarehouseManagementLayout
      headerTitle="Dashboard"
      children={
        <>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Tổng quan hoạt động hệ thống.</div>

          {error && (
            <div className="card" style={{ borderColor: 'var(--danger)' }}>
              <div style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: 8 }}>Có lỗi</div>
              <div style={{ color: 'var(--text2)' }}>{error}</div>
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-secondary btn-sm" onClick={fetchData} disabled={loading}>
                  Thử lại
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="card">
              <div className="card-subtitle">Đang tải dữ liệu...</div>
            </div>
          ) : dash && (
            <>
              {/* Gate activity summary */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <LogIn style={{ color: 'var(--primary)', width: 22, height: 22 }} />
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>Gate-In hôm nay</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{dash.gateInToday}</div>
                  </div>
                </div>
                <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <LogOut style={{ color: '#f97316', width: 22, height: 22 }} />
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>Gate-Out hôm nay</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{dash.gateOutToday}</div>
                  </div>
                </div>
              </div>

              <div className="stats-grid">
                {statCards.map((stat, idx) => (
                  <div className="stat-card" key={stat.title}>
                    <div>
                      <div className="stat-label">{stat.title}</div>
                      <div className="stat-value">{stat.value}</div>
                      <div className={`stat-sub ${idx === 3 && dash.criticalAlerts > 0 ? 'danger' : ''}`}>{stat.sub}</div>
                    </div>
                    <div className={`stat-icon ${stat.si}`}>
                      <stat.icon width={22} height={22} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="two-col">
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">Phân bố trạng thái container</div>
                    <Link to="/warehouse/admin/section/quan-ly-container" className="btn btn-secondary btn-sm">
                      Xem tất cả
                    </Link>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Trạng thái</th>
                          <th>Số lượng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dash.containersByStatus.length === 0 ? (
                          <tr><td colSpan={2} style={{ color: 'var(--text2)' }}>Chưa có dữ liệu</td></tr>
                        ) : (
                          dash.containersByStatus.map((s) => (
                            <tr key={s.statusName}>
                              <td>{s.statusName}</td>
                              <td><strong>{s.count}</strong></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <div className="card-title">Công suất khu vực</div>
                    <Link to="/warehouse/admin/section/quan-ly-yard" className="btn btn-secondary btn-sm">
                      Xem tất cả
                    </Link>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Khu vực</th>
                          <th>Đã dùng</th>
                          <th>Công suất</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dash.zoneOccupancy.length === 0 ? (
                          <tr><td colSpan={3} style={{ color: 'var(--text2)' }}>Chưa có dữ liệu</td></tr>
                        ) : (
                          dash.zoneOccupancy.slice(0, 8).map((z) => (
                            <tr key={z.zoneId}>
                              <td>{z.yardName} — {z.zoneName}</td>
                              <td>{z.occupiedSlots} / {z.capacitySlots}</td>
                              <td>
                                <span className={`badge ${
                                  z.occupancyRate > 0.9 ? 'badge-danger' :
                                  z.occupancyRate > 0.7 ? 'badge-warning' : 'badge-info'
                                }`}>
                                  {Math.round(z.occupancyRate * 100)}%
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      }
    />
  );
}
