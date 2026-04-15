import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, Bell, CheckCircle2, Info } from 'lucide-react';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { useWarehouseAuth, API_BASE } from '../../../../contexts/WarehouseAuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────
type AlertItem = {
  alertId: number;
  zoneId?: number;
  zoneName?: string;
  levelName: string;
  description?: string;
  createdAt?: string;
  status: number; // 0 = OPEN, 1 = ACKNOWLEDGED
};

const PAGE_SIZE = 20;

const LEVEL_CLASS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  WARNING:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  INFO:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

const LEVEL_ICON: Record<string, React.ElementType> = {
  CRITICAL: AlertTriangle,
  WARNING:  AlertCircle,
  INFO:     Info,
};

const ALL = '__all__';

export default function AdminAlertsCenterSection() {
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
  const [items, setItems]       = useState<AlertItem[]>([]);
  const [page, setPage]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Filters
  const [filterStatus,    setFilterStatus]    = useState<string>(ALL);
  const [filterLevel,     setFilterLevel]     = useState<string>(ALL);

  // Ack in-progress set
  const [acking, setAcking] = useState<Set<number>>(new Set());

  const fetchItems = async (p = page, status = filterStatus, level = filterLevel) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), size: String(PAGE_SIZE) });
      if (status !== ALL) params.set('status', status);
      if (level  !== ALL) params.set('levelName', level);
      const res  = await fetch(`${API_BASE}/admin/alerts?${params}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tải cảnh báo');
      setItems(data.data?.content || []);
      setTotalPages(data.data?.totalPages || 1);
      setTotalElements(data.data?.totalElements || 0);
      setPage(p);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => fetchItems(0, filterStatus, filterLevel);

  const acknowledge = async (alertId: number) => {
    setAcking((prev) => new Set(prev).add(alertId));
    try {
      const res  = await fetch(`${API_BASE}/admin/alerts/${alertId}/acknowledge`, { method: 'PUT', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi xác nhận');
      // Update local state
      setItems((prev) =>
        prev.map((a) => (a.alertId === alertId ? { ...a, status: 1 } : a)),
      );
    } catch (e: any) {
      alert(e.message);
    } finally {
      setAcking((prev) => { const s = new Set(prev); s.delete(alertId); return s; });
    }
  };

  // Summary counts from current page (rough)
  const openCount     = items.filter((a) => a.status === 0).length;
  const criticalCount = items.filter((a) => a.levelName === 'CRITICAL' && a.status === 0).length;

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cảnh báo & Trung tâm thông báo</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Quản lý và xác nhận cảnh báo hệ thống.
            {totalElements > 0 && <span className="ml-1 text-sm">({totalElements} tổng)</span>}
          </p>
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-700">{criticalCount} nghiêm trọng (trang này)</span>
          </div>
          <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg px-3 py-2">
            <Bell className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700">{openCount} chưa xử lý (trang này)</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-sm">{error}</span>
            <Button size="sm" variant="outline" onClick={() => fetchItems(page)} disabled={loading}>Thử lại</Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-yellow-500" />
              Danh sách cảnh báo
            </CardTitle>

            {/* Filters */}
            <div className="mt-3 flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs text-gray-500">Trạng thái</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Tất cả</SelectItem>
                    <SelectItem value="0">Chưa xử lý</SelectItem>
                    <SelectItem value="1">Đã xác nhận</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Mức độ</label>
                <Select value={filterLevel} onValueChange={setFilterLevel}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Tất cả</SelectItem>
                    <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                    <SelectItem value="WARNING">WARNING</SelectItem>
                    <SelectItem value="INFO">INFO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={applyFilters} disabled={loading}>Lọc</Button>
              <Button variant="outline" onClick={() => fetchItems(page)} disabled={loading}>Làm mới</Button>
            </div>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Mức độ</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead>Khu vực</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-500">Đang tải...</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400">Không có cảnh báo</TableCell></TableRow>
                ) : items.map((item) => {
                  const LevelIcon = LEVEL_ICON[item.levelName] || Bell;
                  return (
                    <TableRow
                      key={item.alertId}
                      className={item.status === 0 ? '' : 'opacity-60'}
                    >
                      <TableCell className="text-gray-400 text-sm">{item.alertId}</TableCell>
                      <TableCell>
                        <Badge className={LEVEL_CLASS[item.levelName] || 'bg-gray-100 text-gray-600'}>
                          <LevelIcon className="w-3 h-3 mr-1 inline" />
                          {item.levelName}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{item.description || '—'}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {item.zoneName ? (
                          <span>{item.zoneName}</span>
                        ) : item.zoneId ? (
                          <span className="text-gray-400">Zone #{item.zoneId}</span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '—'}
                      </TableCell>
                      <TableCell>
                        {item.status === 0 ? (
                          <Badge className="bg-yellow-100 text-yellow-700">Chưa xử lý</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1 inline" />Đã xác nhận
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.status === 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-700 border-green-300 hover:bg-green-50"
                            onClick={() => acknowledge(item.alertId)}
                            disabled={acking.has(item.alertId)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            {acking.has(item.alertId) ? '...' : 'Xác nhận'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => fetchItems(page - 1)} disabled={page === 0 || loading}>Trước</Button>
                <span className="text-sm text-gray-600">Trang {page + 1} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => fetchItems(page + 1)} disabled={page >= totalPages - 1 || loading}>Sau</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </WarehouseLayout>
  );
}
