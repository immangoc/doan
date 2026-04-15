import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useWarehouseAuth, API_BASE } from '../../../contexts/WarehouseAuthContext';
import {
  Calendar,
  Container,
  MapPin,
  Clock,
  Package,
  AlertCircle,
  CheckCircle,
  FileText,
  RefreshCw,
  Truck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import WarehouseLayout from '../../../components/warehouse/WarehouseLayout';

type AdminDash = {
  gateInToday: number;
  gateOutToday: number;
  containersInYard: number;
  pendingOrders: number;
  openAlerts: number;
  criticalAlerts: number;
  zoneOccupancy: { zoneId: number; zoneName: string; yardName: string; capacitySlots: number; occupiedSlots: number; occupancyRate: number }[];
};

type ScheduleItem = {
  scheduleId: number;
  shipName?: string;
  companyName?: string;
  type?: string;
  timeStart?: string;
  timeEnd?: string;
  location?: string;
  containers?: number;
  status?: string;
};

type AlertItem = {
  alertId: number;
  containerId?: string;
  message?: string;
  levelName?: string;
  statusName?: string;
  createdAt?: string;
};

export default function PlannerDashboard() {
  const { user, accessToken } = useWarehouseAuth();
  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    [accessToken],
  );

  const [dash, setDash]           = useState<AdminDash | null>(null);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [alerts, setAlerts]       = useState<AlertItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, schedRes, alertRes] = await Promise.all([
        fetch(`${API_BASE}/admin/dashboard`, { headers }),
        fetch(`${API_BASE}/admin/schedules`, { headers }),
        fetch(`${API_BASE}/admin/alerts?page=0&size=5`, { headers }),
      ]);
      const [dashData, schedData, alertData] = await Promise.all([
        dashRes.json(), schedRes.json(), alertRes.json(),
      ]);
      if (dashRes.ok)  setDash(dashData.data);
      if (schedRes.ok) setSchedules(schedData.data || []);
      if (alertRes.ok) setAlerts(alertData.data?.content || alertData.data || []);
      if (!dashRes.ok && !schedRes.ok) throw new Error(dashData.message || 'Lỗi tải dữ liệu');
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = [
    { title: 'Lịch trình', value: schedules.length, icon: Calendar, color: 'bg-blue-500' },
    { title: 'Container trong kho', value: dash?.containersInYard ?? '—', icon: Container, color: 'bg-yellow-500' },
    { title: 'Đơn hàng chờ', value: dash?.pendingOrders ?? '—', icon: Package, color: 'bg-green-500' },
    { title: 'Cảnh báo', value: dash?.openAlerts ?? '—', icon: AlertCircle, color: 'bg-red-500' },
  ];

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Kế hoạch</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Chào <span className="font-semibold">{user?.name}</span>
              {schedules.length > 0 ? `, hôm nay có ${schedules.length} lịch trình.` : '.'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={fetchAll} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Calendar className="w-4 h-4" />
              Tạo lịch trình
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{loading ? '...' : stat.value}</h3>
                    </div>
                    <div className={`${stat.color} p-3 rounded-lg`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Lịch trình
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-gray-500 text-sm">Đang tải...</div>
            ) : schedules.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-sm">Chưa có lịch trình nào.</div>
            ) : (
              <div className="space-y-3">
                {schedules.map((s, index) => (
                  <motion.div
                    key={s.scheduleId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all"
                  >
                    <div className={`p-3 rounded-lg ${s.type === 'IMPORT' || s.type === 'import' ? 'bg-green-500' : 'bg-blue-500'}`}>
                      <Truck className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{s.shipName || s.companyName || `#${s.scheduleId}`}</h3>
                        {s.status && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            s.status.toLowerCase().includes('progress') || s.status === 'IN_PROGRESS'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                            {s.status}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        {s.timeStart && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(s.timeStart).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        )}
                        {s.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {s.location}
                          </span>
                        )}
                        {s.containers != null && (
                          <span className="flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            {s.containers} containers
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Chi tiết</Button>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Tình trạng kho bãi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-gray-500 text-sm">Đang tải...</div>
              ) : !dash?.zoneOccupancy?.length ? (
                <div className="py-8 text-center text-gray-500 text-sm">Chưa có dữ liệu kho bãi.</div>
              ) : (
                <div className="space-y-4">
                  {dash.zoneOccupancy.slice(0, 6).map((zone, index) => (
                    <motion.div
                      key={zone.zoneId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">
                          {zone.yardName} — {zone.zoneName}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {zone.occupiedSlots} / {zone.capacitySlots}
                        </span>
                      </div>
                      <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.round(zone.occupancyRate * 100)}%` }}
                          transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
                          className={`absolute left-0 top-0 h-full rounded-full ${
                            zone.occupancyRate > 0.9 ? 'bg-red-500' :
                            zone.occupancyRate > 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>Công suất: {Math.round(zone.occupancyRate * 100)}%</span>
                        <span>Còn trống: {zone.capacitySlots - zone.occupiedSlots} slot</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Cảnh báo cần xử lý
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-gray-500 text-sm">Đang tải...</div>
              ) : alerts.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">Không có cảnh báo nào.</div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((a, index) => (
                    <motion.div
                      key={a.alertId}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.08 }}
                      className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        a.levelName === 'CRITICAL' ? 'text-red-500' : 'text-yellow-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {a.containerId || `Alert #${a.alertId}`}
                        </p>
                        {a.message && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{a.message}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {a.levelName && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              a.levelName === 'CRITICAL'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>{a.levelName}</span>
                          )}
                          {a.createdAt && (
                            <span className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleDateString('vi-VN')}</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </WarehouseLayout>
  );
}
