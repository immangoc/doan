import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Bell, CheckCheck, RefreshCw, Search } from 'lucide-react';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { Badge } from '../../../../components/ui/badge';
import { useWarehouseAuth, API_BASE } from '../../../../contexts/WarehouseAuthContext';

type NotificationItem = {
  notificationId: number;
  title: string;
  description?: string;
  isRead: boolean;
  createdAt?: string;
};

const PAGE_SIZE = 20;

export default function AdminNotificationsSection() {
  const { accessToken } = useWarehouseAuth();
  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    [accessToken],
  );

  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [items, setItems]       = useState<NotificationItem[]>([]);
  const [page, setPage]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [keyword, setKeyword]   = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async (p = page) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), size: String(PAGE_SIZE), sort: 'createdAt,desc' });
      const res  = await fetch(`${API_BASE}/notifications/my?${params}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lấy thông báo');
      setItems(data.data?.content || []);
      setTotalPages(data.data?.totalPages || 1);
      setPage(p);
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return items;
    return items.filter((n) =>
      `${n.title} ${n.description ?? ''}`.toLowerCase().includes(k),
    );
  }, [items, keyword]);

  const markRead = async (id: number) => {
    try {
      const res  = await fetch(`${API_BASE}/notifications/${id}/read`, { method: 'PUT', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi đánh dấu đã đọc');
      setItems((prev) => prev.map((n) => n.notificationId === id ? { ...n, isRead: true } : n));
    } catch (e: any) {
      alert(e.message || 'Lỗi không xác định');
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      const res  = await fetch(`${API_BASE}/notifications/read-all`, { method: 'PUT', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi đánh dấu tất cả đã đọc');
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e: any) {
      alert(e.message || 'Lỗi không xác định');
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Thông báo của tôi</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Xem và quản lý trạng thái đọc thông báo hệ thống.</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span className="flex-1">{error}</span>
            <Button size="sm" variant="outline" onClick={() => fetchNotifications(page)} disabled={loading}>Thử lại</Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              Danh sách ({filtered.length} / trang này)
              {unreadCount > 0 && (
                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 ml-1">
                  {unreadCount} chưa đọc
                </Badge>
              )}
            </CardTitle>
            <div className="mt-3 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm theo tiêu đề, nội dung..."
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={() => fetchNotifications(page)} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Làm mới
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  onClick={markAllRead}
                  disabled={markingAll}
                  className="text-blue-700 border-blue-300 hover:bg-blue-50"
                >
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Đánh dấu tất cả đã đọc
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="py-10 text-gray-500 text-center">Đang tải...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tiêu đề</TableHead>
                    <TableHead>Nội dung</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((n) => (
                    <TableRow key={n.notificationId} className={!n.isRead ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}>
                      <TableCell className={`font-semibold ${!n.isRead ? 'text-blue-800 dark:text-blue-200' : ''}`}>
                        {n.title}
                      </TableCell>
                      <TableCell className="text-sm max-w-[320px] truncate">{n.description || '—'}</TableCell>
                      <TableCell>
                        <Badge className={n.isRead
                          ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'}>
                          {n.isRead ? 'Đã đọc' : 'Chưa đọc'}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-gray-500">
                        {n.createdAt ? new Date(n.createdAt).toLocaleString('vi-VN') : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {!n.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-700 hover:text-blue-800 hover:bg-blue-50 text-xs"
                            onClick={() => markRead(n.notificationId)}
                          >
                            Đánh dấu đã đọc
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-10">
                        Không có thông báo phù hợp.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => fetchNotifications(page - 1)} disabled={page === 0 || loading}>Trước</Button>
                <span className="text-sm text-gray-600">Trang {page + 1} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => fetchNotifications(page + 1)} disabled={page >= totalPages - 1 || loading}>Sau</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </WarehouseLayout>
  );
}
