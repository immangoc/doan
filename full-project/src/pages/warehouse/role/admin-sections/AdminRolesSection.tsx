import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Pencil, Plus, RefreshCw, Shield, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../../components/ui/dialog';
import { useWarehouseAuth, API_BASE } from '../../../../contexts/WarehouseAuthContext';

type RoleItem = { roleId: number; roleName: string };

export default function AdminRolesSection() {
  const { accessToken } = useWarehouseAuth();
  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    [accessToken],
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState<RoleItem[]>([]);
  const [keyword, setKeyword] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState<RoleItem | null>(null);
  const [formName, setFormName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/roles`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tải danh sách role');
      setItems(data.data || []);
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return items;
    return items.filter((i) => i.roleName.toLowerCase().includes(k));
  }, [items, keyword]);

  const submitCreate = async () => {
    const name = formName.trim();
    if (!name) return alert('Tên role không được để trống');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/roles?roleName=${encodeURIComponent(name)}`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tạo role');
      setShowCreate(false);
      setFormName('');
      await fetchItems();
    } catch (e: any) {
      alert(e.message || 'Lỗi không xác định');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (item: RoleItem) => {
    setEditing(item);
    setFormName(item.roleName);
    setShowEdit(true);
  };

  const submitEdit = async () => {
    if (!editing) return;
    const name = formName.trim();
    if (!name) return alert('Tên role không được để trống');
    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE}/admin/roles/${editing.roleId}?roleName=${encodeURIComponent(name)}`,
        { method: 'PUT', headers },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật role');
      setShowEdit(false);
      setEditing(null);
      setFormName('');
      await fetchItems();
    } catch (e: any) {
      alert(e.message || 'Lỗi không xác định');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: RoleItem) => {
    if (!confirm(`Xóa role "${item.roleName}"? Hành động này không thể hoàn tác.`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/roles/${item.roleId}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi xóa role');
      await fetchItems();
    } catch (e: any) {
      alert(e.message || 'Lỗi không xác định');
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700 dark:text-red-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <Button size="sm" variant="outline" onClick={fetchItems} disabled={loading}>Thử lại</Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Danh sách Role
          </CardTitle>
          <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:justify-between">
            <div className="flex gap-2">
              <Input
                className="w-56"
                placeholder="Tìm kiếm role..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <Button variant="outline" size="sm" onClick={fetchItems} disabled={loading}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={() => { setFormName(''); setShowCreate(true); }}>
              <Plus className="w-4 h-4 mr-2" />Thêm Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Tên Role</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-10 text-gray-500">Đang tải...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-10 text-gray-500">Không có dữ liệu</TableCell></TableRow>
              ) : filtered.map((item) => (
                <TableRow key={item.roleId}>
                  <TableCell className="text-gray-500 text-sm">{item.roleId}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      <Shield className="w-3 h-3" />{item.roleName}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(item)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" />Sửa
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(item)}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" />Xóa
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Thêm Role mới</DialogTitle>
            <DialogDescription>Nhập tên role. Tên phải là duy nhất trong hệ thống.</DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium">Tên Role *</label>
            <Input
              className="mt-1"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="VD: MANAGER"
              onKeyDown={(e) => e.key === 'Enter' && submitCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={submitCreate} disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Tạo Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa Role</DialogTitle>
            <DialogDescription>Cập nhật tên cho role #{editing?.roleId}.</DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium">Tên Role *</label>
            <Input
              className="mt-1"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitEdit()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Hủy</Button>
            <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={submitEdit} disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Cập nhật'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
