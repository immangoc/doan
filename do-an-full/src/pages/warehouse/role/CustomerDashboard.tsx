import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useWarehouseAuth, API_BASE } from '../../../contexts/WarehouseAuthContext';
import {
  Container,
  Package,
  Clock,
  Bell,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import WarehouseLayout from '../../../components/warehouse/WarehouseLayout';

type CustomerDash = {
  myContainersInYard: number;
  myPendingOrders: number;
  myTotalOrders: number;
  nearExpiryContainerIds: string[];
};

type NotifItem = {
  notificationId: number;
  title: string;
  description?: string;
  isRead: boolean;
  createdAt?: string;
};

type ContainerItem = {
  containerId: string;
  containerTypeName?: string;
  statusName?: string;
  cargoTypeName?: string;
  attributeName?: string;
  grossWeight?: number;
  createdAt?: string;
};

export default function CustomerDashboard() {
  const { user, accessToken } = useWarehouseAuth();
  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    [accessToken],
  );

  const [dash, setDash]             = useState<CustomerDash | null>(null);
  const [notifications, setNotifs]  = useState<NotifItem[]>([]);
  const [containers, setContainers] = useState<ContainerItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, notifRes, ctnRes] = await Promise.all([
        fetch(`${API_BASE}/dashboard`, { headers }),
        fetch(`${API_BASE}/notifications/my?page=0&size=5&sort=createdAt,desc`, { headers }),
        fetch(`${API_BASE}/admin/containers/my?page=0&size=6&sortBy=createdAt&direction=desc`, { headers }),
      ]);

      const [dashData, notifData, ctnData] = await Promise.all([
        dashRes.json(),
        notifRes.json(),
        ctnRes.json(),
      ]);

      if (!dashRes.ok) throw new Error(dashData.message || 'Lỗi tải dashboard');
      setDash(dashData.data);
      setNotifs(notifData.data?.content || []);
      setContainers(ctnData.data?.content || []);
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
    { title: 'Container trong kho', value: dash?.myContainersInYard ?? '—', icon: Container, color: 'bg-blue-500' },
    { title: 'Đơn hàng đang xử lý', value: dash?.myPendingOrders ?? '—', icon: Package, color: 'bg-yellow-500' },
    { title: 'Tổng đơn hàng', value: dash?.myTotalOrders ?? '—', icon: Clock, color: 'bg-purple-500' },
    { title: 'Container sắp hết hạn', value: dash?.nearExpiryContainerIds?.length ?? '—', icon: AlertTriangle, color: 'bg-red-500' },
  ];

  const statusBadge = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-600';
    const s = status.toLowerCase();
    if (s.includes('out') || s.includes('xuất')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    if (s.includes('in') || s.includes('kho')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  };

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="page-title">Dashboard Khách hàng</h1>
            <p className="page-subtitle">
              Chào mừng <span className="font-semibold">{user?.name || 'Khách hàng'}</span> đến với kho hàng của bạn.
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

        <div className="grid gap-6 xl:grid-cols-[1.7fr_0.95fr]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.title}</p>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stat.value}</h3>
                      </div>
                      <div className={`${stat.color} p-3 rounded-2xl`}>
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Thông báo mới
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-sm text-gray-400 text-center py-4">Đang tải...</div>
              ) : notifications.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-4">Không có thông báo</div>
              ) : (
                notifications.map((n) => (
                  <div key={n.notificationId} className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${n.isRead ? 'bg-gray-300' : 'bg-blue-500'}`} />
                      <p className="text-sm text-gray-900 dark:text-white font-medium">{n.title}</p>
                    </div>
                    {n.description && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 pl-6">{n.description}</p>
                    )}
                    {n.createdAt && (
                      <p className="mt-1 text-xs text-gray-400 pl-6">{new Date(n.createdAt).toLocaleString('vi-VN')}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {(dash?.nearExpiryContainerIds?.length ?? 0) > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200 font-semibold text-sm mb-2">
              <AlertTriangle className="w-4 h-4" />
              Container sắp hết hạn lưu trữ ({dash!.nearExpiryContainerIds.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {dash!.nearExpiryContainerIds.map((id) => (
                <Badge key={id} className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                  {id}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
              <CardTitle className="flex items-center gap-2">
                <Container className="w-5 h-5" />
                Container của tôi (6 gần nhất)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="text-center text-gray-500 py-8">Đang tải...</div>
            ) : containers.length === 0 ? (
              <div className="text-center text-gray-500 py-8">Chưa có container nào.</div>
            ) : (
              containers.map((c, index) => (
                <motion.div
                  key={c.containerId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="rounded-3xl bg-blue-500 p-3 text-white">
                        <Container className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{c.containerId}</h3>
                          {c.statusName && (
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(c.statusName)}`}>
                              {c.statusName}
                            </span>
                          )}
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm text-gray-600 dark:text-gray-300">
                          {c.containerTypeName && <div><span className="font-semibold">Loại:</span> {c.containerTypeName}</div>}
                          {c.cargoTypeName && <div><span className="font-semibold">Hàng:</span> {c.cargoTypeName}</div>}
                          {c.grossWeight != null && <div><span className="font-semibold">Trọng lượng:</span> {c.grossWeight} kg</div>}
                          {c.createdAt && <div><span className="font-semibold">Ngày tạo:</span> {new Date(c.createdAt).toLocaleDateString('vi-VN')}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </WarehouseLayout>
  );
}
