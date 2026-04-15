import { useEffect, useMemo, useState } from 'react';
import { useWarehouseAuth, API_BASE } from '../../../contexts/WarehouseAuthContext';

type ContainerStatusCount = { statusName: string; count: number };
type ZoneOccupancy = {
  zoneId: number; zoneName: string; yardName: string;
  capacitySlots: number; occupiedSlots: number; occupancyRate: number;
};
type AdminDashData = {
  gateInToday: number; gateOutToday: number;
  containersInYard: number; totalContainers: number; overdueContainers: number;
  pendingOrders: number; totalOrders: number;
  openAlerts: number; criticalAlerts: number;
  containersByStatus: ContainerStatusCount[];
  zoneOccupancy: ZoneOccupancy[];
};

export default function Dashboard() {
  const { accessToken } = useWarehouseAuth();
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken]);

  const [dash, setDash] = useState<AdminDashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/dashboard`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tải dashboard');
      setDash(data.data);
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const statCards = dash ? [
    { title: 'Tổng đơn hàng', value: String(dash.totalOrders), subtitle: `${dash.pendingOrders} đơn chờ xử lý`, color: 'si-blue' },
    { title: 'Container trong kho', value: String(dash.containersInYard), subtitle: `${dash.totalContainers} tổng cộng`, color: 'si-green' },
    { title: 'Container quá hạn', value: String(dash.overdueContainers), subtitle: 'Cần xử lý ngay', color: 'si-purple' },
    { title: 'Cảnh báo mở', value: String(dash.openAlerts), subtitle: `${dash.criticalAlerts} nghiêm trọng`, color: dash.criticalAlerts > 0 ? 'si-red' : '' },
  ] : [];

  return (
    <>
      <div className="page-title">Dashboard</div>
      <div className="page-subtitle">Chào mừng trở lại! Đây là tổng quan hệ thống của bạn.</div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', marginBottom: 16 }}>
          <div style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: 8 }}>Có lỗi xảy ra</div>
          <div style={{ color: 'var(--text2)' }}>{error}</div>
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={fetchData} disabled={loading}>Thử lại</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card"><div className="card-subtitle">Đang tải dữ liệu...</div></div>
      ) : dash && (
        <>
          <div className="stats-grid">
            {statCards.map((card) => (
              <div className="stat-card" key={card.title}>
                <div>
                  <div className="stat-label">{card.title}</div>
                  <div className="stat-value">{card.value}</div>
                  <div className="stat-sub">{card.subtitle}</div>
                </div>
                <div className={`stat-icon ${card.color}`}>
                  <span style={{ fontSize: 20 }}>•</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div className="stat-card" style={{ flex: 1 }}>
              <div>
                <div className="stat-label">Gate-In hôm nay</div>
                <div className="stat-value">{dash.gateInToday}</div>
              </div>
            </div>
            <div className="stat-card" style={{ flex: 1 }}>
              <div>
                <div className="stat-label">Gate-Out hôm nay</div>
                <div className="stat-value">{dash.gateOutToday}</div>
              </div>
            </div>
          </div>

          <div className="two-col">
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Phân bố trạng thái container</div>
                  <div className="card-subtitle">Số container theo từng trạng thái</div>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Trạng thái</th><th>Số lượng</th></tr>
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
                <div>
                  <div className="card-title">Công suất khu vực</div>
                  <div className="card-subtitle">Tình trạng sử dụng yard</div>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Khu vực</th><th>Đã dùng</th><th>%</th></tr>
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
  );
}
