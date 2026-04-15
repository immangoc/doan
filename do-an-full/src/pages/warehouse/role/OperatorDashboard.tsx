import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useWarehouseAuth, API_BASE } from '../../../contexts/WarehouseAuthContext';
import {
  Container,
  CheckCircle,
  Clock,
  AlertTriangle,
  Package,
  RefreshCw,
  Scan,
  FileText,
  MapPin,
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
};

type GateInItem = {
  gateInId: number;
  containerId: string;
  voyageNo?: string;
  gateInTime?: string;
  createdByUsername?: string;
  note?: string;
};

type GateOutItem = {
  gateOutId: number;
  containerId: string;
  gateOutTime?: string;
  createdByUsername?: string;
  note?: string;
};

export default function OperatorDashboard() {
  const { user, accessToken } = useWarehouseAuth();
  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    [accessToken],
  );

  const [dash, setDash]       = useState<AdminDash | null>(null);
  const [gateIns, setGateIns] = useState<GateInItem[]>([]);
  const [gateOuts, setGateOuts] = useState<GateOutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, giRes, goRes] = await Promise.all([
        fetch(`${API_BASE}/admin/dashboard`, { headers }),
        // Backend expects sortBy + direction (not Spring Data's sort=field,dir)
        fetch(`${API_BASE}/admin/gate-in?page=0&size=10&sortBy=gateInTime&direction=desc`, { headers }),
        fetch(`${API_BASE}/admin/gate-out?page=0&size=10&sortBy=gateOutTime&direction=desc`, { headers }),
      ]);
      const [dashData, giData, goData] = await Promise.all([
        dashRes.json(), giRes.json(), goRes.json(),
      ]);
      if (!dashRes.ok) throw new Error(dashData.message || 'Lỗi tải dashboard');
      setDash(dashData.data);
      setGateIns(giData.data?.content || []);
      setGateOuts(goData.data?.content || []);
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
    { title: 'Gate-In hôm nay', value: dash?.gateInToday ?? '—', icon: Package, color: 'bg-green-500' },
    { title: 'Gate-Out hôm nay', value: dash?.gateOutToday ?? '—', icon: CheckCircle, color: 'bg-blue-500' },
    { title: 'Container trong kho', value: dash?.containersInYard ?? '—', icon: Container, color: 'bg-indigo-500' },
    { title: 'Đơn hàng chờ duyệt', value: dash?.pendingOrders ?? '—', icon: AlertTriangle, color: dash?.pendingOrders ? 'bg-red-500' : 'bg-gray-400' },
  ];

  const quickActions = [
    { title: 'Quét QR Container', icon: Scan, color: 'bg-blue-500' },
    { title: 'Báo cáo sự cố', icon: AlertTriangle, color: 'bg-red-500' },
    { title: 'Kiểm tra vị trí', icon: MapPin, color: 'bg-green-500' },
    { title: 'Ghi chú', icon: FileText, color: 'bg-yellow-500' },
  ];

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Vận hành</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Xin chào <span className="font-semibold">{user?.name}</span>
              {dash ? `, hôm nay ${dash.gateInToday} lượt gate-in, ${dash.gateOutToday} lượt gate-out.` : '.'}
            </p>
          </div>
          <Button variant="outline" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`${stat.color} p-2 rounded-lg`}>
                      <stat.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{stat.title}</p>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{loading ? '...' : stat.value}</h3>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((action, index) => (
                <motion.button
                  key={action.title}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all"
                >
                  <div className={`${action.color} p-3 rounded-lg`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-center text-gray-700 dark:text-gray-300">{action.title}</span>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-green-600" />
                Gate-In gần đây
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-gray-500 text-sm">Đang tải...</div>
              ) : gateIns.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">Chưa có dữ liệu gate-in.</div>
              ) : (
                <div className="space-y-3">
                  {gateIns.map((g, index) => (
                    <motion.div
                      key={g.gateInId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.06 }}
                      className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-green-50/40 dark:bg-green-900/10"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{g.containerId}</h4>
                        <span className="text-xs text-gray-500">
                          {g.gateInTime ? new Date(g.gateInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{g.gateInTime ? new Date(g.gateInTime).toLocaleDateString('vi-VN') : '—'}</span>
                        {g.createdByUsername && <span>· {g.createdByUsername}</span>}
                        {g.voyageNo && <span>· {g.voyageNo}</span>}
                      </div>
                      {g.note && <p className="mt-1 text-xs text-gray-500 italic">{g.note}</p>}
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                Gate-Out gần đây
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-gray-500 text-sm">Đang tải...</div>
              ) : gateOuts.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">Chưa có dữ liệu gate-out.</div>
              ) : (
                <div className="space-y-3">
                  {gateOuts.map((g, index) => (
                    <motion.div
                      key={g.gateOutId}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.06 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-blue-50/40 dark:bg-blue-900/10 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="p-2 bg-blue-500 rounded-lg flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{g.containerId}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {g.gateOutTime ? new Date(g.gateOutTime).toLocaleString('vi-VN') : '—'}
                          {g.createdByUsername && ` · ${g.createdByUsername}`}
                        </p>
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
