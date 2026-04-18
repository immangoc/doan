import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw, Search } from 'lucide-react';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { Badge } from '../../../../components/ui/badge';
import { useWarehouseAuth, API_BASE } from '../../../../contexts/WarehouseAuthContext';

type SystemLog = {
  logId: number;
  userId?: number;
  username?: string;
  action: string;
  description?: string;
  createdAt?: string;
};

const PAGE_SIZE = 50;

export default function AdminActivitiesSection() {
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
  const [logs, setLogs]         = useState<SystemLog[]>([]);
  const [page, setPage]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [keyword, setKeyword]   = useState('');

  const fetchLogs = async (p = page) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), size: String(PAGE_SIZE), sort: 'createdAt,desc' });
      const res  = await fetch(`${API_BASE}/admin/system-logs?${params}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lấy nhật ký hoạt động');
      setLogs(data.data?.content || []);
      setTotalPages(data.data?.totalPages || 1);
      setPage(p);
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return logs;
    return logs.filter((a) =>
      `${a.username ?? ''} ${a.action} ${a.description ?? ''}`.toLowerCase().includes(k),
    );
  }, [logs, keyword]);

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Nhật ký hoạt động</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Theo dõi các thao tác trong hệ thống.</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span className="flex-1">{error}</span>
            <Button size="sm" variant="outline" onClick={() => fetchLogs(page)} disabled={loading}>Thử lại</Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              Danh sách ({filtered.length} / trang này)
            </CardTitle>
            <div className="mt-3 flex flex-col sm:flex-row gap-3">
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm theo mô tả, người dùng, hành động..."
                className="sm:flex-1"
              />
              <Button variant="outline" onClick={() => fetchLogs(page)} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Làm mới
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-gray-500 text-center">Đang tải...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hành động</TableHead>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead>Thời gian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.logId}>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline">{a.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-700 dark:text-gray-300">
                        {a.username ?? (a.userId ? `#${a.userId}` : '—')}
                      </TableCell>
                      <TableCell className="text-sm">{a.description || '—'}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-gray-500">
                        {a.createdAt ? new Date(a.createdAt).toLocaleString('vi-VN') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500 py-10">
                        Không có dữ liệu phù hợp.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => fetchLogs(page - 1)} disabled={page === 0 || loading}>Trước</Button>
                <span className="text-sm text-gray-600">Trang {page + 1} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => fetchLogs(page + 1)} disabled={page >= totalPages - 1 || loading}>Sau</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </WarehouseLayout>
  );
}
