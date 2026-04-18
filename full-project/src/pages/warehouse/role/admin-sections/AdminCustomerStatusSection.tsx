import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw, Search, Shield, UserCheck, UserX } from 'lucide-react';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { Badge } from '../../../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../../components/ui/dialog';
import { useWarehouseAuth, API_BASE } from '../../../../contexts/WarehouseAuthContext';

type UserItem = {
  userId: number;
  username: string;
  fullName?: string;
  email: string;
  phone?: string;
  status: number; // 1 = active, 0 = inactive
  createdAt?: string;
  roles?: { roleId: number; roleName: string }[];
};

const PAGE_SIZE = 50;

export default function AdminCustomerStatusSection({
  mode,
  showLayout = true,
}: {
  mode: 'suspend' | 'approve';
  showLayout?: boolean;
}) {
  const { accessToken, user: currentUser } = useWarehouseAuth();
  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    [accessToken],
  );

  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [users, setUsers]           = useState<UserItem[]>([]);
  const [keyword, setKeyword]       = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected]     = useState<UserItem | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: '0', size: String(PAGE_SIZE), sortBy: 'createdAt', sortDir: 'desc' });
      const res  = await fetch(`${API_BASE}/admin/users?${params}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lấy người dùng');
      setUsers(data.data?.content || []);
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only show CUSTOMER role users
  const customers = useMemo(
    () => users.filter((u) => u.roles?.some((r) => r.roleName === 'CUSTOMER')),
    [users],
  );

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return customers;
    return customers.filter((u) =>
      `${u.fullName ?? ''} ${u.email} ${u.username}`.toLowerCase().includes(k),
    );
  }, [customers, keyword]);

  const isActive = (u: UserItem) => u.status === 1;

  const toggleStatus = async (u: UserItem) => {
    const newStatus = isActive(u) ? 0 : 1;
    setActionBusy(true);
    try {
      const res  = await fetch(`${API_BASE}/admin/users/${u.userId}/status?status=${newStatus}`, {
        method: 'PUT',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật trạng thái');
      await fetchUsers();
    } catch (e: any) {
      alert(e.message || 'Lỗi không xác định');
    } finally {
      setActionBusy(false);
    }
  };

  const title = mode === 'suspend' ? 'Quản lý Khách hàng (tạm ngưng hoạt động)' : 'Duyệt tài khoản khách hàng';

  const actionText = (u: UserItem) => {
    const active = isActive(u);
    if (mode === 'suspend') return active ? 'Tạm ngưng' : 'Kích hoạt lại';
    return active ? 'Từ chối' : 'Duyệt';
  };

  const content = (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Bật/tắt trạng thái tài khoản khách hàng.</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700 dark:text-red-300">
          <AlertCircle className="w-5 h-5" />
          <span className="flex-1">{error}</span>
          <Button size="sm" variant="outline" onClick={fetchUsers} disabled={loading}>Thử lại</Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Danh sách khách hàng ({filtered.length})
          </CardTitle>
          <div className="mt-3 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm theo tên/email/username..."
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={fetchUsers} disabled={loading}>
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
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow
                    key={u.userId}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => { setSelected(u); setDetailOpen(true); }}
                  >
                    <TableCell className="font-semibold">
                      {u.fullName || u.username}
                      <div className="text-sm text-gray-500 font-normal">@{u.username}</div>
                    </TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Badge className={isActive(u)
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'}>
                        {isActive(u) ? 'Hoạt động' : 'Tạm ngưng'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">Bấm để xử lý</span>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 py-10">Không có khách hàng phù hợp.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={(o) => { setDetailOpen(o); if (!o) setSelected(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chi tiết tài khoản</DialogTitle>
            <DialogDescription>{selected ? `Xử lý tài khoản ${selected.fullName || selected.username}` : '—'}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Tên:</span><span className="font-medium">{selected.fullName || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Username:</span><span className="font-mono">{selected.username}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Email:</span><span>{selected.email}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Trạng thái:</span>
                <Badge className={isActive(selected)
                  ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {isActive(selected) ? 'Hoạt động' : 'Tạm ngưng'}
                </Badge>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)} disabled={actionBusy}>Đóng</Button>
            <Button
              className={selected && isActive(selected)
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-900 hover:bg-blue-800 text-white'}
              onClick={async () => {
                if (!selected) return;
                await toggleStatus(selected);
                setDetailOpen(false);
              }}
              disabled={!selected || actionBusy || selected.userId === Number(currentUser?.id)}
            >
              {isActive(selected ?? { status: 1 } as UserItem)
                ? <UserX className="w-4 h-4 mr-2" />
                : <UserCheck className="w-4 h-4 mr-2" />}
              {actionBusy ? 'Đang xử lý...' : selected ? actionText(selected) : '—'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  return showLayout ? <WarehouseLayout>{content}</WarehouseLayout> : content;
}
