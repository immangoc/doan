import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import WarehouseLayout from '../../components/warehouse/WarehouseLayout';
import {
  Users, Plus, Eye, Search, Shield, Mail, Phone, Building, RefreshCw, AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger, DialogFooter,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { useWarehouseAuth } from '../../contexts/WarehouseAuthContext';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: 'admin' | 'planner' | 'operator' | 'customer';
  status?: 'active' | 'inactive' | string;
  created_at: string;
  last_sign_in_at?: string;
}

const ROLE_MAP: Record<string, { label: string; color: string }> = {
  admin:    { label: 'Quản trị viên', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  planner:  { label: 'Điều độ kho',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  operator: { label: 'Nhân viên',     color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  customer: { label: 'Khách hàng',    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};

const EMPTY_FORM = { name: '', email: '', phone: '', company: '', role: 'customer' as User['role'], password: '' };

export default function UserManagement({
  showLayout = true,
  hideHeaderTitle = false,
}: {
  showLayout?: boolean;
  hideHeaderTitle?: boolean;
}) {
  const { accessToken, user: currentUser } = useWarehouseAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-ce1eb60c`;
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken || publicAnonKey}` };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/users`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi lấy danh sách người dùng');
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filteredUsers = users.filter(u => {
    const matchSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.company || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      if (editingUser) {
        // Chỉ cập nhật role qua API
        const res = await fetch(`${apiUrl}/users/${editingUser.id}/role`, {
          method: 'PATCH', headers, body: JSON.stringify({ role: formData.role }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi cập nhật vai trò');
      } else {
        // Tạo user mới
        const res = await fetch(`${apiUrl}/auth/signup`, {
          method: 'POST', headers,
          body: JSON.stringify({
            email: formData.email, password: formData.password,
            name: formData.name, phone: formData.phone,
            company: formData.company, role: formData.role,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi tạo tài khoản');
      }
      await fetchUsers();
      setIsDialogOpen(false);
      setEditingUser(null);
      setFormData({ ...EMPTY_FORM });
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, phone: user.phone || '', company: user.company || '', role: user.role, password: '' });
    setIsDialogOpen(true);
  };

  const roleStats = {
    admin: users.filter(u => u.role === 'admin').length,
    planner: users.filter(u => u.role === 'planner').length,
    operator: users.filter(u => u.role === 'operator').length,
    customer: users.filter(u => u.role === 'customer').length,
  };

  const statusBadge = (status?: string) => {
    const s = (status || 'active').toLowerCase();
    if (s === 'inactive' || s === 'locked' || s === 'disabled') {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Đã khóa</Badge>;
    }
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Đang hoạt động</Badge>;
  };

  const content = (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {!hideHeaderTitle && (
              <>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Quản lý Người dùng</h2>
                <p className="text-gray-600 dark:text-gray-400">Dữ liệu thời gian thực từ Supabase Auth</p>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchUsers} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Làm mới
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) { setEditingUser(null); setFormData({ ...EMPTY_FORM }); setFormError(''); }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-900 hover:bg-blue-800 text-white">
                  <Plus className="w-4 h-4 mr-2" /> Thêm Người dùng
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingUser ? 'Chi tiết người dùng' : 'Thêm Người dùng mới'}</DialogTitle>
                  <DialogDescription>
                    {editingUser ? 'Xem thông tin và cập nhật vai trò (nếu cần)' : 'Tạo tài khoản người dùng mới'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {formError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" /> {formError}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Họ và tên *</Label>
                      <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Nguyễn Văn A" required disabled={!!editingUser} />
                    </div>
                    <div className="space-y-2">
                      <Label>Vai trò *</Label>
                      <Select value={formData.role} onValueChange={(v: User['role']) => setFormData({ ...formData, role: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Quản trị viên</SelectItem>
                          <SelectItem value="planner">Điều độ kho</SelectItem>
                          <SelectItem value="operator">Nhân viên vận hành</SelectItem>
                          <SelectItem value="customer">Khách hàng</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {editingUser && (
                    <div className="space-y-2">
                      <Label>Trạng thái</Label>
                      <div>{statusBadge(editingUser.status)}</div>
                    </div>
                  )}
                  {!editingUser && (
                    <>
                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input type="email" value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                          placeholder="email@hungthuy.com" required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Số điện thoại</Label>
                          <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="0901234567" />
                        </div>
                        <div className="space-y-2">
                          <Label>Công ty</Label>
                          <Input value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} placeholder="Công ty TNHH..." />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Mật khẩu *</Label>
                        <Input type="password" value={formData.password}
                          onChange={e => setFormData({ ...formData, password: e.target.value })}
                          placeholder="Tối thiểu 8 ký tự" required minLength={8} />
                      </div>
                    </>
                  )}
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                    <Button type="submit" className="bg-blue-900 hover:bg-blue-800" disabled={submitting}>
                      {submitting ? 'Đang xử lý...' : editingUser ? 'Cập nhật vai trò' : 'Tạo tài khoản'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Role Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { role: 'admin', label: 'Quản trị viên', color: 'from-red-500 to-red-700', count: roleStats.admin },
            { role: 'planner', label: 'Điều độ kho', color: 'from-blue-500 to-blue-700', count: roleStats.planner },
            { role: 'operator', label: 'Nhân viên', color: 'from-green-500 to-green-700', count: roleStats.operator },
            { role: 'customer', label: 'Khách hàng', color: 'from-purple-500 to-purple-700', count: roleStats.customer },
          ].map((stat, index) => (
            <motion.div key={stat.role} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card className={`bg-gradient-to-br ${stat.color} text-white border-0`}>
                <CardContent className="p-4">
                  <p className="text-xs opacity-90 mb-1">{stat.label}</p>
                  <div className="text-3xl font-bold">{loading ? '...' : stat.count}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input placeholder="Tìm tên, email, công ty..." value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full sm:w-48">
                  <Shield className="w-4 h-4 mr-2" /><SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả vai trò</SelectItem>
                  <SelectItem value="admin">Quản trị viên</SelectItem>
                  <SelectItem value="planner">Điều độ kho</SelectItem>
                  <SelectItem value="operator">Nhân viên</SelectItem>
                  <SelectItem value="customer">Khách hàng</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Danh sách Người dùng ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-600 mb-4">
                <AlertCircle className="w-5 h-5" /> {error}
                <Button size="sm" variant="outline" onClick={fetchUsers} className="ml-auto">Thử lại</Button>
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="ml-3 text-gray-600">Đang tải từ Supabase Auth...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Họ tên</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Số điện thoại</TableHead>
                      <TableHead>Công ty</TableHead>
                      <TableHead>Vai trò</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user, index) => (
                      <motion.tr key={user.id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <TableCell className="font-medium">{user.name || '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="w-3 h-3 text-gray-400" /> {user.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3 text-gray-400" /> {user.phone || '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Building className="w-3 h-3 text-gray-400" /> {user.company || '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${ROLE_MAP[user.role]?.color || ''}`}>
                            {ROLE_MAP[user.role]?.label || user.role}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{statusBadge(user.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(user)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Xem chi tiết"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
                {filteredUsers.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Không tìm thấy người dùng nào</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );

  return showLayout ? <WarehouseLayout>{content}</WarehouseLayout> : content;
}
