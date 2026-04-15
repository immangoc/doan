import { useMemo, useState } from 'react';
import { AlertCircle, Download, RefreshCw } from 'lucide-react';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Badge } from '../../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useWarehouseAuth, API_BASE } from '../../../../contexts/WarehouseAuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────
type DailyGate = { date: string; gateIn: number; gateOut: number };
type GateReport = { from: string; to: string; totalGateIn: number; totalGateOut: number; daily: DailyGate[] };

type InventoryReport = {
  totalContainers: number;
  byStatus: Record<string, number>;
  byCargoType: Record<string, number>;
  byContainerType: Record<string, number>;
};

type OrderReport = {
  totalOrders: number; ordersInPeriod: number;
  from: string; to: string;
  byStatus: Record<string, number>;
};

type ZoneOccupancy = {
  zoneId: number; zoneName: string; yardName: string;
  capacitySlots: number; occupiedSlots: number; occupancyRate: number;
};
type ZoneReport = { totalCapacity: number; totalOccupied: number; overallOccupancyRate: number; zones: ZoneOccupancy[] };

type RevenueReport = {
  fromDate: string; toDate: string;
  totalInvoices: number; totalAmount: number; overdueAmount: number; overdueInvoices: number;
};

type Tab = 'gate' | 'inventory' | 'orders' | 'zone' | 'revenue';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);
const monthAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
};

const fmtMoney = (val?: number) =>
  val != null ? val.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }) : '—';

const PIE_COLORS = ['#6366f1','#22c55e','#3b82f6','#f97316','#eab308','#ef4444','#9ca3af','#d1d5db'];

function mapToChartData(obj: Record<string, number>) {
  return Object.entries(obj).map(([name, value]) => ({ name, value }));
}

const ORDER_STATUS_CLASS: Record<string, string> = {
  PENDING:          'bg-yellow-100 text-yellow-700',
  APPROVED:         'bg-green-100 text-green-700',
  REJECTED:         'bg-red-100 text-red-700',
  CANCEL_REQUESTED: 'bg-orange-100 text-orange-700',
  CANCELLED:        'bg-gray-200 text-gray-500',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminReportsSection() {
  const { accessToken } = useWarehouseAuth();
  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    [accessToken],
  );

  const [tab, setTab] = useState<Tab>('gate');
  const [error, setError] = useState('');

  // Date range shared by date-ranged reports
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo]     = useState(today);

  // Report data
  const [gateReport,      setGateReport]      = useState<GateReport | null>(null);
  const [inventoryReport, setInventoryReport] = useState<InventoryReport | null>(null);
  const [orderReport,     setOrderReport]     = useState<OrderReport | null>(null);
  const [zoneReport,      setZoneReport]      = useState<ZoneReport | null>(null);
  const [revenueReport,   setRevenueReport]   = useState<RevenueReport | null>(null);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ── Generic fetcher ─────────────────────────────────────────────────────
  const fetchReport = async (url: string, setter: (v: any) => void) => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${API_BASE}${url}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tải báo cáo');
      setter(data.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Tab-specific fetchers ────────────────────────────────────────────────
  const loadGate      = () => fetchReport(`/admin/reports/gate-activity?from=${from}&to=${to}`, setGateReport);
  const loadInventory = () => fetchReport('/admin/reports/container-inventory', setInventoryReport);
  const loadOrders    = () => fetchReport(`/admin/reports/orders?from=${from}&to=${to}`, setOrderReport);
  const loadZone      = () => fetchReport('/admin/reports/zone-occupancy', setZoneReport);
  const loadRevenue   = () => fetchReport(`/admin/reports/revenue?from=${from}&to=${to}`, setRevenueReport);

  const loadCurrentTab = () => {
    if (tab === 'gate')      loadGate();
    if (tab === 'inventory') loadInventory();
    if (tab === 'orders')    loadOrders();
    if (tab === 'zone')      loadZone();
    if (tab === 'revenue')   loadRevenue();
  };

  // ── CSV export ───────────────────────────────────────────────────────────
  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/reports/export?from=${from}&to=${to}`, { headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Lỗi xuất báo cáo');
      }
      const blob     = await res.blob();
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement('a');
      a.href         = url;
      a.download     = `bao-cao-${from}-den-${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setExporting(false);
    }
  };

  // ── Tab styles ───────────────────────────────────────────────────────────
  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
      tab === t
        ? 'border-blue-600 text-blue-700 dark:text-blue-400'
        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
    }`;

  const switchTab = (t: Tab) => {
    setTab(t);
    setError('');
  };

  // ── Date range controls ──────────────────────────────────────────────────
  const DateRangeBar = () => (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="text-xs text-gray-500">Từ ngày</label>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
      </div>
      <div>
        <label className="text-xs text-gray-500">Đến ngày</label>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
      </div>
      <Button onClick={loadCurrentTab} disabled={loading}>
        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
        Tải báo cáo
      </Button>
      <Button variant="outline" onClick={exportCsv} disabled={exporting}>
        <Download className="w-4 h-4 mr-2" />
        {exporting ? 'Đang xuất...' : 'Xuất CSV'}
      </Button>
    </div>
  );

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Báo cáo & Thống kê</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Phân tích hoạt động gate, tồn kho, đơn hàng, khu vực và doanh thu.</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-sm">{error}</span>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700">
          <button className={tabCls('gate')}      onClick={() => switchTab('gate')}>Cổng vào/ra</button>
          <button className={tabCls('inventory')} onClick={() => switchTab('inventory')}>Tồn kho</button>
          <button className={tabCls('orders')}    onClick={() => switchTab('orders')}>Đơn hàng</button>
          <button className={tabCls('zone')}      onClick={() => switchTab('zone')}>Khu vực</button>
          <button className={tabCls('revenue')}   onClick={() => switchTab('revenue')}>Doanh thu</button>
        </div>

        {/* ── TAB: Gate Activity ───────────────────────────────────── */}
        {tab === 'gate' && (
          <Card>
            <CardHeader>
              <CardTitle>Hoạt động gate-in / gate-out</CardTitle>
              <div className="mt-3"><DateRangeBar /></div>
            </CardHeader>
            <CardContent className="space-y-6">
              {gateReport && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-700">{gateReport.totalGateIn}</div>
                      <div className="text-sm text-blue-600 mt-1">Tổng Gate-In</div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-orange-700">{gateReport.totalGateOut}</div>
                      <div className="text-sm text-orange-600 mt-1">Tổng Gate-Out</div>
                    </div>
                  </div>
                  {gateReport.daily.length > 0 && (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={gateReport.daily} margin={{ left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="gateIn"  stroke="#3b82f6" name="Gate-In"  strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="gateOut" stroke="#f97316" name="Gate-Out" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </>
              )}
              {!gateReport && !loading && (
                <div className="text-center py-12 text-gray-400">Chọn khoảng thời gian và nhấn "Tải báo cáo"</div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── TAB: Container Inventory ─────────────────────────────── */}
        {tab === 'inventory' && (
          <Card>
            <CardHeader>
              <CardTitle>Thống kê tồn kho container</CardTitle>
              <div className="mt-3 flex gap-3">
                <Button onClick={loadInventory} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Tải báo cáo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {inventoryReport && (
                <>
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-indigo-700">{inventoryReport.totalContainers}</div>
                    <div className="text-sm text-indigo-600 mt-1">Tổng container</div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* By status pie */}
                    {Object.keys(inventoryReport.byStatus).length > 0 && (
                      <div>
                        <div className="font-medium text-sm mb-3 text-gray-700 dark:text-gray-300">Theo trạng thái</div>
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie data={mapToChartData(inventoryReport.byStatus)} dataKey="value" nameKey="name" outerRadius={70}>
                              {mapToChartData(inventoryReport.byStatus).map((_, i) => (
                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="mt-2 space-y-1">
                          {Object.entries(inventoryReport.byStatus).map(([name, count], i) => (
                            <div key={name} className="flex justify-between text-xs">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full inline-block" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                {name}
                              </span>
                              <span className="font-medium">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* By cargo type */}
                    {Object.keys(inventoryReport.byCargoType).length > 0 && (
                      <div>
                        <div className="font-medium text-sm mb-3 text-gray-700 dark:text-gray-300">Theo loại hàng</div>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={mapToChartData(inventoryReport.byCargoType)} layout="vertical" margin={{ left: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tick={{ fontSize: 10 }} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#22c55e" name="Số lượng" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* By container type */}
                    {Object.keys(inventoryReport.byContainerType).length > 0 && (
                      <div>
                        <div className="font-medium text-sm mb-3 text-gray-700 dark:text-gray-300">Theo loại container</div>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={mapToChartData(inventoryReport.byContainerType)} layout="vertical" margin={{ left: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tick={{ fontSize: 10 }} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#6366f1" name="Số lượng" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </>
              )}
              {!inventoryReport && !loading && (
                <div className="text-center py-12 text-gray-400">Nhấn "Tải báo cáo" để xem dữ liệu</div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── TAB: Orders ──────────────────────────────────────────── */}
        {tab === 'orders' && (
          <Card>
            <CardHeader>
              <CardTitle>Báo cáo đơn hàng</CardTitle>
              <div className="mt-3"><DateRangeBar /></div>
            </CardHeader>
            <CardContent className="space-y-6">
              {orderReport && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-700">{orderReport.ordersInPeriod}</div>
                      <div className="text-sm text-blue-600 mt-1">Đơn trong kỳ</div>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-indigo-700">{orderReport.totalOrders}</div>
                      <div className="text-sm text-indigo-600 mt-1">Tổng tất cả đơn</div>
                    </div>
                  </div>

                  {Object.keys(orderReport.byStatus).length > 0 && (
                    <div>
                      <div className="font-medium text-sm mb-3 text-gray-700">Phân bổ theo trạng thái</div>
                      <div className="flex flex-wrap gap-3">
                        {Object.entries(orderReport.byStatus).map(([name, count]) => (
                          <div key={name} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${ORDER_STATUS_CLASS[name] || 'bg-gray-100 text-gray-700'}`}>
                            <span className="font-semibold text-lg">{count}</span>
                            <span className="text-sm">{name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {Object.keys(orderReport.byStatus).length > 0 && (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={mapToChartData(orderReport.byStatus)} margin={{ left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#6366f1" name="Số đơn" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </>
              )}
              {!orderReport && !loading && (
                <div className="text-center py-12 text-gray-400">Chọn khoảng thời gian và nhấn "Tải báo cáo"</div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── TAB: Zone Occupancy ──────────────────────────────────── */}
        {tab === 'zone' && (
          <Card>
            <CardHeader>
              <CardTitle>Tỷ lệ lấp đầy khu vực</CardTitle>
              <div className="mt-3 flex gap-3">
                <Button onClick={loadZone} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Tải báo cáo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {zoneReport && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-gray-800 dark:text-white">{zoneReport.totalCapacity}</div>
                      <div className="text-xs text-gray-500 mt-1">Tổng sức chứa</div>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-indigo-700">{zoneReport.totalOccupied}</div>
                      <div className="text-xs text-indigo-600 mt-1">Đang sử dụng</div>
                    </div>
                    <div className={`rounded-lg p-4 text-center ${zoneReport.overallOccupancyRate >= 0.9 ? 'bg-red-50 dark:bg-red-900/20' : zoneReport.overallOccupancyRate >= 0.7 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                      <div className={`text-2xl font-bold ${zoneReport.overallOccupancyRate >= 0.9 ? 'text-red-700' : zoneReport.overallOccupancyRate >= 0.7 ? 'text-yellow-700' : 'text-green-700'}`}>
                        {Math.round(zoneReport.overallOccupancyRate * 100)}%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Tổng tỷ lệ</div>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bãi</TableHead>
                        <TableHead>Khu vực</TableHead>
                        <TableHead>Sức chứa</TableHead>
                        <TableHead>Đang dùng</TableHead>
                        <TableHead>Tỷ lệ lấp đầy</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {zoneReport.zones.map((z) => {
                        const pct = Math.round(z.occupancyRate * 100);
                        return (
                          <TableRow key={z.zoneId}>
                            <TableCell>{z.yardName}</TableCell>
                            <TableCell className="font-medium">{z.zoneName}</TableCell>
                            <TableCell>{z.capacitySlots}</TableCell>
                            <TableCell>{z.occupiedSlots}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-green-500'}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <Badge className={pct >= 90 ? 'bg-red-100 text-red-700' : pct >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}>
                                  {pct}%
                                </Badge>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </>
              )}
              {!zoneReport && !loading && (
                <div className="text-center py-12 text-gray-400">Nhấn "Tải báo cáo" để xem dữ liệu</div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── TAB: Revenue ─────────────────────────────────────────── */}
        {tab === 'revenue' && (
          <Card>
            <CardHeader>
              <CardTitle>Báo cáo doanh thu</CardTitle>
              <div className="mt-3"><DateRangeBar /></div>
            </CardHeader>
            <CardContent className="space-y-6">
              {revenueReport && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                      <div className="text-xl font-bold text-green-700">{fmtMoney(revenueReport.totalAmount)}</div>
                      <div className="text-xs text-green-600 mt-1">Tổng doanh thu</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-700">{revenueReport.totalInvoices}</div>
                      <div className="text-xs text-blue-600 mt-1">Tổng hóa đơn</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                      <div className="text-xl font-bold text-red-700">{fmtMoney(revenueReport.overdueAmount)}</div>
                      <div className="text-xs text-red-600 mt-1">Phí quá hạn</div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-orange-700">{revenueReport.overdueInvoices}</div>
                      <div className="text-xs text-orange-600 mt-1">HĐ quá hạn</div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Kỳ báo cáo</span>
                      <span>{revenueReport.fromDate} → {revenueReport.toDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Doanh thu cơ bản</span>
                      <span>{fmtMoney(revenueReport.totalAmount - revenueReport.overdueAmount)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Phí phạt quá hạn</span>
                      <span>{fmtMoney(revenueReport.overdueAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2">
                      <span>Tổng cộng</span>
                      <span>{fmtMoney(revenueReport.totalAmount)}</span>
                    </div>
                  </div>
                </>
              )}
              {!revenueReport && !loading && (
                <div className="text-center py-12 text-gray-400">Chọn khoảng thời gian và nhấn "Tải báo cáo"</div>
              )}
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="text-center py-6 text-gray-400 text-sm">Đang tải...</div>
        )}
      </div>
    </WarehouseLayout>
  );
}
