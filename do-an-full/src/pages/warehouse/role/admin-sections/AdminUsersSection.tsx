import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Pencil, Plus, RefreshCw, Shield, UserCheck, UserX } from 'lucide-react';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Badge } from '../../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { useWarehouseAuth, API_BASE } from '../../../../contexts/WarehouseAuthContext';

type RoleItem = { roleId: number; roleName: string };
type UserItem = {
  userId: number;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  status: number;
  createdAt?: string;
  roles: RoleItem[];
};

export default function AdminUsersSection() {
  const { accessToken } = useWarehouseAuth();
  const apiUrl = API_BASE;
  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    [accessToken],
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [keyword, setKeyword] = useState('');

  // Create dialog
  const [openCreate, setOpenCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: '', password: '', fullName: '', email: '', phone: '', roleName: '',
  });

  // Edit dialog
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', email: '', phone: '' });

  // Assign role dialog
  const [openRole, setOpenRole] = useState(false);
  const [roleTarget, setRoleTarget] = useState<UserItem | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');

  const fetchAll = async (p = 0) => {
    setLoading(true);
    setError('');
    try {
      const [uRes, rRes] = await Promise.all([
        fetch(`${apiUrl}/admin/users?page=${p}&size=20&sortBy=createdAt&sortDir=desc`, { headers }),
        fetch(`${apiUrl}/admin/roles`, { headers }),
      ]);
      const uData = await uRes.json();
      const rData = await rRes.json();
      if (!uRes.ok) throw new Error(uData.message || 'Lỗi lấy danh sách người dùng');
      if (!rRes.ok) throw new Error(rData.message || 'Lỗi lấy danh sách vai trò');
      const pageResult = uData.data;
      setUsers(pageResult.content || []);
      setTotalPages(pageResult.totalPages || 1);
      const fetchedRoles: RoleItem[] = rData.data || [];
      setRoles(fetchedRoles);
      setCreateForm(f => ({ ...f, roleName: f.roleName || fetchedRoles[0]?.roleName || '' }));
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return users;
    return users.filter((u) =>
      `${u.userId} ${u.username} ${u.fullName} ${u.email} ${u.phone ?? ''}`.toLowerCase().includes(k),
    );
  }, [users, keyword]);

  const resetCreateForm = () =>
    setCreateForm({ username: '', password: '', fullName: '', email: '', phone: '', roleName: roles[0]?.roleName || '' });

  const submitCreate = async () => {
    try {
      if (!createForm.username.trim()) return alert('Username không được để trống');
      if (!createForm.password.trim()) return alert('Mật khẩu không được để trống');
      if (!createForm.fullName.trim()) return alert('Họ và tên không được để trống');
      if (!createForm.email.trim()) return alert('Email không được để trống');
      if (!createForm.roleName) return alert('Vui lòng chọn vai trò');
      const res = await fetch(`${apiUrl}/admin/users`, {
        method: 'POST', headers,
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tạo người dùng');
      setOpenCreate(false);
      resetCreateForm();
      await fetchAll(page);
    } catch (e: any) {
      alert(e.message || 'Lỗi không xác định');
    }
  };

  const openEditDialog = (u: UserItem) => {
    setEditing(u);
    setEditForm({ fullName: u.fullName || '', email: u.email || '', phone: u.phone || '' });
    setOpenEdit(true);
  };

  const submitEdit = async () => {
    if (!editing) return;
    try {
      const res = await fetch(`${apiUrl}/admin/users/${editing.userId}`, {
        method: 'PUT', headers,
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật người dùng');
      setOpenEdit(false);
      setEditing(null);
      await fetchAll(page);
    } catch (e: any) {
      alert(e.message || 'Lỗi không xác định');
    }
  };

  const toggleStatus = async (u: UserItem) => {
    const newStatus = u.status === 1 ? 0 : 1;
    const label = newStatus === 0 ? 'tạm ngưng' : 'kích hoạt';
    const ok = confirm(`Bạn có chắc muốn ${label} tài khoản "${u.username}" không?`);
    if (!ok) return;
    try {
      const res = await fetch(`${apiUrl}/admin/users/${u.userId}/status?status=${newStatus}`, {
        method: 'PUT', headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật trạng thái');
      await fetchAll(page);
    } catch (e: any) {
      alert(e.message || 'Lỗi không xác định');
    }
  };

  const openRoleDialog = (u: UserItem) => {
    setRoleTarget(u);
    const currentRoleId = u.roles?.[0]?.roleId;
    setSelectedRoleId(currentRoleId ? String(currentRoleId) : (roles[0] ? String(roles[0].roleId) : ''));
    setOpenRole(true);
  };

  const submitAssignRole = async () => {
    if (!roleTarget || !selectedRoleId) return;
    try {
      const res = await fetch(`${apiUrl}/admin/users/${roleTarget.userId}/roles/${selectedRoleId}`, {
        method: 'PUT', headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi gán vai trò');
      setOpenRole(false);
      setRoleTarget(null);
      await fetchAll(page);
    } catch (e: any) {
      alert(e.message || 'Lỗi không xác định');
    }
  };

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý người dùng</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Tạo, chỉnh sửa, phân quyền và kích hoạt/tạm ngưng tài khoản.</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span className="flex-1">{error}</span>
            <Button size="sm" variant="outline" onClick={() => fetchAll(page)} disabled={loading}>Thử lại</Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Danh sách người dùng ({filtered.length})</CardTitle>
            <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:items-center">
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm theo tên, email, username..."
                className="sm:flex-1"
              />
              <Dialog
                open={openCreate}
                onOpenChange={(o) => {
                  setOpenCreate(o);
                  if (!o) resetCreateForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button className="bg-blue-900 hover:bg-blue-800 text-white">
                    <Plus className="w-4 h-4 mr-2" />Thêm người dùng
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Thêm người dùng</DialogTitle>
                    <DialogDescription>Tạo tài khoản mới với vai trò được chỉ định.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-700">Username</div>
                        <Input value={createForm.username} onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))} placeholder="abc123" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-700">Mật khẩu</div>
                        <Input type="password" value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} placeholder="Tối thiểu 8 ký tự" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-700">Họ và tên</div>
                      <Input value={createForm.fullName} onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Nguyễn Văn A" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-700">Email</div>
                      <Input type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} placeholder="user@example.com" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-700">Số điện thoại</div>
                        <Input value={createForm.phone} onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))} placeholder="0901234567" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-700">Vai trò</div>
                        <Select value={createForm.roleName} onValueChange={(v) => setCreateForm((f) => ({ ...f, roleName: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {roles.map((r) => <SelectItem key={r.roleId} value={r.roleName}>{r.roleName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenCreate(false)}>Hủy</Button>
                    <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={submitCreate}>Tạo</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={() => fetchAll(page)} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Làm mới
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-gray-600 dark:text-gray-400">Đang tải...</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">ID</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Họ và tên</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>SĐT</TableHead>
                      <TableHead>Vai trò</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((u) => (
                      <TableRow key={u.userId}>
                        <TableCell className="font-mono text-xs text-gray-600 dark:text-gray-400">{u.userId}</TableCell>
                        <TableCell className="font-semibold">{u.username}</TableCell>
                        <TableCell>{u.fullName}</TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">{u.email}</TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">{u.phone || '—'}</TableCell>
                        <TableCell>
                          {u.roles?.map((r) => (
                            <Badge key={r.roleId} variant="outline" className="text-xs mr-1">{r.roleName}</Badge>
                          ))}
                        </TableCell>
                        <TableCell>
                          <Badge className={u.status === 1
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}>
                            {u.status === 1 ? 'Hoạt động' : 'Tạm ngưng'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-1">
                            <Button
                              variant="ghost" size="sm"
                              className="text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                              title="Chỉnh sửa"
                              onClick={() => openEditDialog(u)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="text-purple-700 hover:text-purple-800 hover:bg-purple-50"
                              title="Đổi vai trò"
                              onClick={() => openRoleDialog(u)}
                            >
                              <Shield className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className={u.status === 1
                                ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                                : 'text-green-700 hover:text-green-800 hover:bg-green-50'}
                              title={u.status === 1 ? 'Tạm ngưng' : 'Kích hoạt'}
                              onClick={() => toggleStatus(u)}
                            >
                              {u.status === 1 ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-gray-500 py-10">
                          Không có dữ liệu phù hợp.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                      Trước
                    </Button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Trang {page + 1} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                      Sau
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Edit dialog */}
        <Dialog open={openEdit} onOpenChange={(o) => { setOpenEdit(o); if (!o) setEditing(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Sửa thông tin người dùng</DialogTitle>
              <DialogDescription>{editing?.username} — chỉnh sửa thông tin cá nhân.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-700">Họ và tên</div>
                <Input value={editForm.fullName} onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-700">Email</div>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-700">Số điện thoại</div>
                <Input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenEdit(false)}>Hủy</Button>
              <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={submitEdit}>Lưu</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign role dialog */}
        <Dialog open={openRole} onOpenChange={(o) => { setOpenRole(o); if (!o) setRoleTarget(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Đổi vai trò</DialogTitle>
              <DialogDescription>{roleTarget?.username} — chọn vai trò mới.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Vai trò</div>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => <SelectItem key={r.roleId} value={String(r.roleId)}>{r.roleName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenRole(false)}>Hủy</Button>
              <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={submitAssignRole}>Gán</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </WarehouseLayout>
  );
}
