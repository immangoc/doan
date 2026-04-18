import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  Box,
  ClipboardList,
  RefreshCw,
  Timer,
} from 'lucide-react';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useWarehouseAuth, API_BASE } from '../../../../contexts/WarehouseAuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────
type StatusCount = { statusName: string; count: number };
type ZoneOccupancy = {
  zoneId: number; zoneName: string; yardName: string;
  capacitySlots: number; occupiedSlots: number; occupancyRate: number;
};
type AdminDashboard = {
  gateInToday: number;
  gateOutToday: number;
  containersInYard: number;
  totalContainers: number;
  overdueContainers: number;
  pendingOrders: number;
  totalOrders: number;
  openAlerts: number;
  criticalAlerts: number;
  containersByStatus: StatusCount[];
  zoneOccupancy: ZoneOccupancy[];
};

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#22c55e',
  GATE_IN:   '#3b82f6',
  IN_YARD:   '#6366f1',
  GATE_OUT:  '#f97316',
  EXPORTED:  '#9ca3af',
  DAMAGED:   '#ef4444',
  OVERDUE:   '#eab308',
  CANCELLED: '#d1d5db',
};

const PIE_COLORS = ['#6366f1','#22c55e','#3b82f6','#f97316','#eab308','#ef4444','#9ca3af','#d1d5db'];

function KpiCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType; label: string; value: number | string; sub?: string; color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardSection() {
  const { accessToken } = useWarehouseAuth();
  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    [accessToken],
  );

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [data, setData]       = useState<AdminDashboard | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${API_BASE}/admin/dashboard`, { headers });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'Lỗi tải dashboard');
      setData(body.data);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoneBarData = useMemo(
    () =>
      (data?.zoneOccupancy || []).map((z) => ({
        name: z.zoneName,
        yard: z.yardName,
        occupied: z.occupiedSlots,
        capacity: z.capacitySlots,
        rate: Math.round(z.occupancyRate * 100),
      })),
    [data],
  );

  const pieData = useMemo(
    () =>
      (data?.containersByStatus || [])
        .filter((s) => s.count > 0)
        .map((s) => ({ name: s.statusName, value: s.count })),
    [data],
  );

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              {lastRefresh ? `Cập nhật lúc ${lastRefresh.toLocaleTimeString('vi-VN')}` : 'Tổng quan hệ thống'}
            </p>
          </div>
          <Button variant="outline" onClick={fetchDashboard} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span className="flex-1">{error}</span>
            <Button size="sm" variant="outline" onClick={fetchDashboard}>Thử lại</Button>
          </div>
        )}

        {loading && !data && (
          <div className="text-center py-20 text-gray-500">Đang tải...</div>
        )}

        {data && (
          <>
            {/* ── KPI row 1: Gate activity ─────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard icon={ArrowDownToLine} label="Gate-In hôm nay"  value={data.gateInToday}        color="bg-blue-500" />
              <KpiCard icon={ArrowUpFromLine} label="Gate-Out hôm nay" value={data.gateOutToday}       color="bg-orange-500" />
              <KpiCard icon={Box}             label="Container trong bãi" value={data.containersInYard} sub={`/ ${data.totalContainers} tổng`} color="bg-indigo-500" />
              <KpiCard icon={Timer}           label="Container quá hạn"   value={data.overdueContainers} color="bg-red-500" />
            </div>

            {/* ── KPI row 2: Orders & alerts ───────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard icon={ClipboardList} label="Đơn chờ duyệt" value={data.pendingOrders} sub={`/ ${data.totalOrders} tổng`} color="bg-yellow-500" />
              <KpiCard icon={Bell}          label="Cảnh báo mở"   value={data.openAlerts}    color="bg-purple-500" />
              <KpiCard icon={AlertTriangle} label="Cảnh báo nghiêm trọng" value={data.criticalAlerts} color="bg-red-600" />
              <KpiCard icon={Box}           label="Tổng container"  value={data.totalContainers}  color="bg-gray-500" />
            </div>

            {/* ── Charts row ───────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie: containers by status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Container theo trạng thái</CardTitle>
                </CardHeader>
                <CardContent>
                  {pieData.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">Không có dữ liệu</div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <ResponsiveContainer width={200} height={200}>
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                            {pieData.map((entry, i) => (
                              <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => [v, 'Container']} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-1 text-sm">
                        {pieData.map((entry, i) => (
                          <div key={entry.name} className="flex items-center gap-2">
                            <span
                              className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                              style={{ background: STATUS_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length] }}
                            />
                            <span className="text-gray-700 dark:text-gray-300">{entry.name}</span>
                            <span className="font-semibold ml-auto pl-4">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bar: zone occupancy */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tỷ lệ lấp đầy theo khu vực</CardTitle>
                </CardHeader>
                <CardContent>
                  {zoneBarData.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">Không có dữ liệu</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={zoneBarData} margin={{ left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(value: number, name: string) =>
                            name === 'occupied' ? [value, 'Đang dùng'] : [value, 'Sức chứa']
                          }
                        />
                        <Bar dataKey="capacity" fill="#e5e7eb" name="Sức chứa" />
                        <Bar dataKey="occupied" fill="#6366f1" name="Đang dùng" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Zone occupancy table ─────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Chi tiết khu vực</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bãi</TableHead>
                      <TableHead>Khu vực</TableHead>
                      <TableHead>Sức chứa</TableHead>
                      <TableHead>Đang dùng</TableHead>
                      <TableHead>Tỷ lệ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.zoneOccupancy.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-gray-400">Không có dữ liệu</TableCell>
                      </TableRow>
                    ) : data.zoneOccupancy.map((z) => {
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
                              <span className="text-sm font-medium">{pct}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </WarehouseLayout>
  );
}
