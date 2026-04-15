import { useEffect, useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Pie, PieChart, Cell,
} from 'recharts';
import { useWarehouseAuth, API_BASE } from '../../../contexts/WarehouseAuthContext';
import PageHeader from '../../../components/warehouse/PageHeader';

/* ─── Types ─────────────────────────────────────────────────── */
type RevenueReport = {
  totalInvoices: number;
  totalAmount: number;
  overdueAmount: number;
  overdueInvoices: number;
};
type DailyGate = { date: string; gateIn: number; gateOut: number };
type GateReport = { totalGateIn: number; totalGateOut: number; daily: DailyGate[] };
type InventoryReport = {
  totalContainers: number;
  byStatus: Record<string, number>;
  byCargoType: Record<string, number>;
  byContainerType: Record<string, number>;
};
type OrderReport = { totalOrders: number; ordersInPeriod: number; byStatus: Record<string, number> };
type ZoneReport = { totalCapacity: number; totalOccupied: number; overallOccupancyRate: number };
type AlertItem = {
  alertId: number; zoneId?: number; zoneName?: string;
  levelName?: string; description?: string; createdAt?: string; status?: number;
};
type ContainerItem = {
  containerId: string; containerTypeName?: string; statusName?: string;
  cargoTypeName?: string; grossWeight?: number; createdAt?: string;
};

/* ─── Constants ─────────────────────────────────────────────── */
const PIE_COLORS = ['#10b981', '#06b6d4', '#a855f7', '#3b82f6', '#f59e0b', '#ef4444', '#84cc16'];

const REPORT_TABS = [
  { id: 'tongquan',  label: 'Tổng quan' },
  { id: 'hanghong',  label: 'Tổng hợp hàng hỏng' },
  { id: 'kho-lanh',  label: 'Tổng hợp kho lạnh' },
  { id: 'kho-kho',   label: 'Tổng hợp kho khô' },
  { id: 'kho-de-vo', label: 'Tổng hợp kho dễ vỡ' },
  { id: 'kho-khac',  label: 'Tổng hợp kho khác' },
] as const;

type TabId = (typeof REPORT_TABS)[number]['id'];

const KHO_KEYWORDS: Record<string, string[]> = {
  'kho-lanh':  ['lạnh', 'lanh', 'cold', 'reefer'],
  'kho-kho':   ['khô', 'kho'],
  'kho-de-vo': ['vỡ', 'vo', 'fragile'],
};

function matchesKho(cargoTypeName: string | undefined, tabId: string): boolean {
  if (!cargoTypeName) return tabId === 'kho-khac';
  const lower = cargoTypeName.toLowerCase();
  const khoKeys = Object.values(KHO_KEYWORDS).flat();
  if (tabId === 'kho-khac') {
    return !khoKeys.some((k) => lower.includes(k));
  }
  return (KHO_KEYWORDS[tabId] || []).some((k) => lower.includes(k));
}

function getCargoCountForTab(byCargoType: Record<string, number> | undefined, tabId: string): number {
  if (!byCargoType) return 0;
  return Object.entries(byCargoType).reduce((sum, [name, count]) => {
    return matchesKho(name, tabId) ? sum + count : sum;
  }, 0);
}

function getDefaultDates() {
  const now = new Date();
  const from = `${now.getFullYear()}-01-01`;
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

/* ─── Component ─────────────────────────────────────────────── */
export default function BaoCaoThongKe() {
  const { accessToken } = useWarehouseAuth();
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken]);

  const def = getDefaultDates();
  const [tab, setTab]         = useState<TabId>('tongquan');
  const [from, setFrom]       = useState(def.from);
  const [to, setTo]           = useState(def.to);

  // shared inventory (loaded once)
  const [inventory, setInventory] = useState<InventoryReport | null>(null);
  const [invLoading, setInvLoading] = useState(true);

  // tongquan
  const [revenue, setRevenue]         = useState<RevenueReport | null>(null);
  const [gateReport, setGateReport]   = useState<GateReport | null>(null);
  const [orderReport, setOrderReport] = useState<OrderReport | null>(null);
  const [tqLoading, setTqLoading]     = useState(false);
  const [tqError, setTqError]         = useState('');

  // hanghong
  const [alerts, setAlerts]         = useState<AlertItem[]>([]);
  const [alertTotal, setAlertTotal] = useState(0);
  const [alertPage, setAlertPage]   = useState(0);
  const [alertTotalPages, setAlertTotalPages] = useState(0);
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertError, setAlertError] = useState('');

  // kho tabs
  const [containers, setContainers]   = useState<ContainerItem[]>([]);
  const [khoLoading, setKhoLoading]   = useState(false);
  const [khoError, setKhoError]       = useState('');

  /* ── fetch inventory on mount ── */
  useEffect(() => {
    const load = async () => {
      setInvLoading(true);
      try {
        const res = await fetch(`${API_BASE}/admin/reports/container-inventory`, { headers });
        const d = await res.json();
        if (res.ok) setInventory(d.data);
      } catch { /* silently fail */ } finally {
        setInvLoading(false);
      }
    };
    load();
  }, []);

  /* ── fetch tongquan reports ── */
  const fetchTongQuan = async (f = from, t = to) => {
    setTqLoading(true);
    setTqError('');
    try {
      const [revRes, gateRes, ordRes] = await Promise.all([
        fetch(`${API_BASE}/admin/reports/revenue?from=${f}&to=${t}`, { headers }),
        fetch(`${API_BASE}/admin/reports/gate-activity?from=${f}&to=${t}`, { headers }),
        fetch(`${API_BASE}/admin/reports/orders?from=${f}&to=${t}`, { headers }),
      ]);
      const [revData, gateData, ordData] = await Promise.all([
        revRes.json(), gateRes.json(), ordRes.json(),
      ]);
      if (revRes.ok)  setRevenue(revData.data);
      if (gateRes.ok) setGateReport(gateData.data);
      if (ordRes.ok)  setOrderReport(ordData.data);
      if (!revRes.ok && !gateRes.ok) throw new Error(revData.message || 'Lỗi tải báo cáo');
    } catch (e: any) {
      setTqError(e.message || 'Lỗi không xác định');
    } finally {
      setTqLoading(false);
    }
  };

  /* ── fetch alerts (hanghong) ── */
  const fetchAlerts = async (pg = 0) => {
    setAlertLoading(true);
    setAlertError('');
    try {
      const res = await fetch(`${API_BASE}/admin/alerts?page=${pg}&size=20`, { headers });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Lỗi tải cảnh báo');
      setAlerts(d.data?.content || []);
      setAlertTotal(d.data?.totalElements ?? 0);
      setAlertTotalPages(d.data?.totalPages ?? 0);
      setAlertPage(pg);
    } catch (e: any) {
      setAlertError(e.message || 'Lỗi');
    } finally {
      setAlertLoading(false);
    }
  };

  /* ── fetch containers (kho tabs) ── */
  const fetchContainers = async () => {
    setKhoLoading(true);
    setKhoError('');
    try {
      const res = await fetch(`${API_BASE}/admin/containers?page=0&size=100&sortBy=createdAt&direction=desc`, { headers });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Lỗi tải container');
      setContainers(d.data?.content || []);
    } catch (e: any) {
      setKhoError(e.message || 'Lỗi');
    } finally {
      setKhoLoading(false);
    }
  };

  /* ── tab switch ── */
  useEffect(() => {
    if (tab === 'tongquan') fetchTongQuan();
    else if (tab === 'hanghong') { if (alerts.length === 0) fetchAlerts(0); }
    else if (tab.startsWith('kho-')) { if (containers.length === 0) fetchContainers(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  /* ── chart data ── */
  const monthlyGate = useMemo(() => {
    if (!gateReport?.daily?.length) return [];
    const map: Record<string, { name: string; gateIn: number; gateOut: number }> = {};
    gateReport.daily.forEach(({ date, gateIn, gateOut }) => {
      const m = new Date(date + 'T00:00:00').getMonth() + 1;
      const key = `T${m}`;
      if (!map[key]) map[key] = { name: key, gateIn: 0, gateOut: 0 };
      map[key].gateIn  += gateIn;
      map[key].gateOut += gateOut;
    });
    return Object.values(map);
  }, [gateReport]);

  const pieSeries = useMemo(() => {
    if (!inventory?.byCargoType) return [];
    const total = Object.values(inventory.byCargoType).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(inventory.byCargoType).map(([name, count], i) => ({
      name,
      value: Math.round((count / total) * 100),
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [inventory]);

  const orderStatusData = useMemo(() => {
    if (!orderReport?.byStatus) return [];
    return Object.entries(orderReport.byStatus).map(([name, value]) => ({ name, value }));
  }, [orderReport]);

  /* ── kho tab containers ── */
  const khoContainers = useMemo(() => {
    return containers.filter((c) => matchesKho(c.cargoTypeName, tab));
  }, [containers, tab]);

  const khoCount     = getCargoCountForTab(inventory?.byCargoType, tab);
  const khoTabLabel  = REPORT_TABS.find((t) => t.id === tab)?.label || '';

  return (
    <>
      <PageHeader
        title="Báo cáo & Thống kê"
        subtitle="Phân tích dữ liệu theo thời gian thực"
        action={null}
      />

      <div className="tabs">
        {REPORT_TABS.map((item) => (
          <button
            key={item.id}
            className={`tab-btn${tab === item.id ? ' active' : ''}`}
            type="button"
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ── TỔNG QUAN ── */}
      {tab === 'tongquan' && (
        <>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <label className="form-label" style={{ margin: 0 }}>Từ:</label>
            <input className="form-input" type="date" style={{ width: 160 }} value={from} onChange={(e) => setFrom(e.target.value)} />
            <label className="form-label" style={{ margin: 0 }}>Đến:</label>
            <input className="form-input" type="date" style={{ width: 160 }} value={to} onChange={(e) => setTo(e.target.value)} />
            <button className="btn btn-secondary btn-sm" onClick={() => fetchTongQuan(from, to)} disabled={tqLoading}>
              {tqLoading ? 'Đang tải...' : 'Cập nhật'}
            </button>
          </div>

          {tqError && (
            <div className="card" style={{ borderColor: 'var(--danger)', marginBottom: 12 }}>
              <div style={{ color: 'var(--danger)' }}>{tqError}</div>
            </div>
          )}

          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginBottom: 16 }}>
            <div className="card">
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Tổng thu (hóa đơn lưu kho)</div>
              <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700, color: 'var(--success)' }}>
                {tqLoading ? '...' : revenue ? `${Number(revenue.totalAmount ?? 0).toLocaleString('vi-VN')}` : '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>
                {revenue ? `${revenue.totalInvoices} hóa đơn | phạt quá hạn: ${Number(revenue.overdueAmount ?? 0).toLocaleString('vi-VN')}` : ''}
              </div>
            </div>
            <div className="card">
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Hóa đơn quá hạn</div>
              <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700, color: 'var(--danger)' }}>
                {tqLoading ? '...' : revenue ? revenue.overdueInvoices : '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>
                {revenue ? `Tiền phạt: ${Number(revenue.overdueAmount ?? 0).toLocaleString('vi-VN')}` : ''}
              </div>
            </div>
            <div className="card">
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Tổng container (kho)</div>
              <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>
                {invLoading ? '...' : inventory ? inventory.totalContainers : '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>
                {inventory ? `${Object.keys(inventory.byCargoType ?? {}).length} loại hàng` : ''}
              </div>
            </div>
          </div>

          <div className="charts-grid" style={{ marginBottom: 16 }}>
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Hoạt động Gate theo tháng</div>
                  <div className="card-subtitle">Gate vào / Gate ra</div>
                </div>
              </div>
              {tqLoading ? (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontSize: 13 }}>Đang tải...</div>
              ) : monthlyGate.length === 0 ? (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontSize: 13 }}>Không có dữ liệu trong khoảng thời gian này.</div>
              ) : (
                <div style={{ width: '100%', height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyGate} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="gateIn"  name="Gate-In"  fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="gateOut" name="Gate-Out" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Phân bổ container theo loại hàng</div>
                  <div className="card-subtitle">Số lượng container theo loại</div>
                </div>
              </div>
              {invLoading ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontSize: 13 }}>Đang tải...</div>
              ) : pieSeries.length === 0 ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontSize: 13 }}>Chưa có dữ liệu.</div>
              ) : (
                <div className="two-col" style={{ gap: 14, alignItems: 'center' }}>
                  <div style={{ width: '100%', height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieSeries} dataKey="value" innerRadius={60} outerRadius={90} paddingAngle={4}>
                          {pieSeries.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ minWidth: 160 }}>
                    {pieSeries.map((entry) => (
                      <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: entry.color, flexShrink: 0, display: 'inline-block' }} />
                        <span>{entry.name}: {entry.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Tổng hợp đơn hàng theo trạng thái</div>
                <div className="card-subtitle">Kỳ từ {from} đến {to}</div>
              </div>
            </div>
            {tqLoading ? (
              <div style={{ padding: '24px', color: 'var(--text2)' }}>Đang tải...</div>
            ) : orderReport ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={orderStatusData} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={80} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#6c47ff" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Chi tiết trạng thái đơn hàng</div>
                  <div style={{ marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: 'var(--text2)' }}>Tổng đơn (hệ thống):</span>{' '}
                    <strong>{orderReport.totalOrders}</strong>
                  </div>
                  <div style={{ marginBottom: 12, fontSize: 13 }}>
                    <span style={{ color: 'var(--text2)' }}>Đơn trong kỳ:</span>{' '}
                    <strong>{orderReport.ordersInPeriod}</strong>
                  </div>
                  {orderStatusData.map(({ name, value }) => (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <span>{name}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: '24px', color: 'var(--text2)', fontSize: 13 }}>Chưa có dữ liệu đơn hàng.</div>
            )}
          </div>
        </>
      )}

      {/* ── HÀNG HỎNG ── */}
      {tab === 'hanghong' && (
        <div className="card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="card-title">Tổng hợp hàng hỏng / Cảnh báo</div>
              <div className="card-subtitle">Danh sách cảnh báo và sự cố đang theo dõi</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => fetchAlerts(0)} disabled={alertLoading}>Làm mới</button>
          </div>

          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginBottom: 16 }}>
            <div className="stat-card"><div><div className="stat-label">Tổng cảnh báo</div><div className="stat-value">{alertLoading ? '...' : alertTotal}</div></div></div>
            <div className="stat-card"><div><div className="stat-label">Đang mở (OPEN)</div><div className="stat-value">{alertLoading ? '...' : alerts.filter((a) => a.status === 0).length}</div></div></div>
            <div className="stat-card"><div><div className="stat-label">Đã xử lý</div><div className="stat-value">{alertLoading ? '...' : alerts.filter((a) => a.status === 1).length}</div></div></div>
            <div className="stat-card"><div><div className="stat-label">Nghiêm trọng</div><div className="stat-value">{alertLoading ? '...' : alerts.filter((a) => a.levelName === 'CRITICAL').length}</div></div></div>
          </div>

          {alertError && <div style={{ color: 'var(--danger)', marginBottom: 8 }}>{alertError}</div>}

          {alertLoading ? (
            <div style={{ padding: '24px', color: 'var(--text2)' }}>Đang tải...</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th><th>Khu vực</th><th>Mô tả</th><th>Mức độ</th><th>Trạng thái</th><th>Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.length === 0 ? (
                    <tr><td colSpan={6} style={{ color: 'var(--text2)' }}>Không có cảnh báo nào.</td></tr>
                  ) : (
                    alerts.map((a) => (
                      <tr key={a.alertId}>
                        <td><code>{a.alertId}</code></td>
                        <td>{a.zoneName || (a.zoneId ? `Zone #${a.zoneId}` : '—')}</td>
                        <td>{a.description || '—'}</td>
                        <td>
                          <span className={`badge ${a.levelName === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}`}>
                            {a.levelName || '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${a.status === 0 ? 'badge-danger' : 'badge-success'}`}>
                            {a.status === 0 ? 'OPEN' : 'ACKNOWLEDGED'}
                          </span>
                        </td>
                        <td>{a.createdAt ? new Date(a.createdAt).toLocaleString('vi-VN') : '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {alertTotalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, padding: '12px 0', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" disabled={alertPage === 0} onClick={() => fetchAlerts(alertPage - 1)}>←</button>
              <span style={{ lineHeight: '28px', fontSize: 13 }}>{alertPage + 1} / {alertTotalPages}</span>
              <button className="btn btn-secondary btn-sm" disabled={alertPage >= alertTotalPages - 1} onClick={() => fetchAlerts(alertPage + 1)}>→</button>
            </div>
          )}
        </div>
      )}

      {/* ── KHO SUB-TABS ── */}
      {tab.startsWith('kho-') && (
        <div className="card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="card-title">{khoTabLabel}</div>
              <div className="card-subtitle">Danh sách container và thống kê</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={fetchContainers} disabled={khoLoading}>Làm mới</button>
          </div>

          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginBottom: 16 }}>
            <div className="stat-card">
              <div>
                <div className="stat-label">Tổng container (kho này)</div>
                <div className="stat-value">{invLoading ? '...' : khoCount}</div>
              </div>
            </div>
            <div className="stat-card">
              <div>
                <div className="stat-label">Hiển thị trong bảng</div>
                <div className="stat-value">{khoLoading ? '...' : khoContainers.length}</div>
              </div>
            </div>
            <div className="stat-card">
              <div>
                <div className="stat-label">Tổng tất cả container</div>
                <div className="stat-value">{invLoading ? '...' : (inventory?.totalContainers ?? '—')}</div>
              </div>
            </div>
          </div>

          {khoError && <div style={{ color: 'var(--danger)', marginBottom: 8 }}>{khoError}</div>}

          {khoLoading ? (
            <div style={{ padding: '24px', color: 'var(--text2)' }}>Đang tải...</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Container ID</th><th>Loại container</th><th>Loại hàng</th>
                    <th>Trạng thái</th><th>Trọng lượng (kg)</th><th>Ngày nhập</th>
                  </tr>
                </thead>
                <tbody>
                  {khoContainers.length === 0 ? (
                    <tr><td colSpan={6} style={{ color: 'var(--text2)' }}>Không có container nào trong kho này.</td></tr>
                  ) : (
                    khoContainers.map((c) => (
                      <tr key={c.containerId}>
                        <td><code>{c.containerId}</code></td>
                        <td>{c.containerTypeName || '—'}</td>
                        <td>{c.cargoTypeName || '—'}</td>
                        <td>
                          <span className={`badge ${
                            c.statusName?.includes('YARD') ? 'badge-success' :
                            c.statusName?.includes('GATE') ? 'badge-info' : 'badge-gray'
                          }`}>
                            {c.statusName || '—'}
                          </span>
                        </td>
                        <td>{c.grossWeight != null ? Number(c.grossWeight).toLocaleString() : '—'}</td>
                        <td>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('vi-VN') : '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
