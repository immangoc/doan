import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Pencil, Plus, RefreshCw, Trash2, Wand2 } from 'lucide-react';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../../../components/ui/dialog';
import { useWarehouseAuth, API_BASE } from '../../../../contexts/WarehouseAuthContext';

type TypeItem = { id: string; name: string; created_at?: string; updated_at?: string };

export default function AdminContainerTypesSection() {
  const { accessToken } = useWarehouseAuth();
  const apiUrl = API_BASE;
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState<TypeItem[]>([]);
  const [keyword, setKeyword] = useState('');

  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<TypeItem | null>(null);

  const [formName, setFormName] = useState('');
  const [tempId, setTempId] = useState<string>('');

  const fetchItems = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/admin/container-types`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lấy loại container');
      // Backend returns ApiResponse<List<{containerTypeId, containerTypeName}>>
      const raw: { containerTypeId: number; containerTypeName: string }[] = data.data || [];
      setItems(raw.map(it => ({ id: String(it.containerTypeId), name: it.containerTypeName })));
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
    return items.filter((i) => i.name.toLowerCase().includes(k));
  }, [items, keyword]);

  const submitCreate = async () => {
    try {
      const name = formName.trim();
      if (!name) return alert('Tên không được để trống');
      const res = await fetch(`${apiUrl}/admin/container-types`, {
        method: 'POST', headers,
        body: JSON.stringify({ containerTypeName: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi thêm loại container');
      setOpenCreate(false);
      setFormName('');
      await fetchItems();
    } catch (e: any) {
      alert(e.message || 'Lỗi không xác định');
    }
  };

  const openEditDialog = (it: TypeItem) => {
    setEditing(it);
    setFormName(it.name);
    setOpenEdit(true);
  };

  const submitEdit = async () => {
    if (!editing) return;
    try {
      const name = formName.trim();
      if (!name) return alert('Tên không được để trống');
      const res = await fetch(`${apiUrl}/admin/container-types/${editing.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ containerTypeName: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật');
      setOpenEdit(false);
      setEditing(null);
      setFormName('');
      await fetchItems();
    } catch (e: any) {
      alert(e.message || 'Lỗi không xác định');
    }
  };

  const submitDelete = async (id: string) => {
    const ok = confirm('Bạn có chắc chắn muốn xóa loại container này không?');
    if (!ok) return;
    try {
      const res = await fetch(`${apiUrl}/admin/container-types/${id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi xóa');
      await fetchItems();
    } catch (e: any) {
      alert(e.message || 'Lỗi không xác định');
    }
  };

  const truncate = (s: string) => {
    if (!s) return '';
    if (s.length <= 10) return s;
    return `${s.slice(0, 6)}…${s.slice(-4)}`;
  };

  const seedDemo = async () => {
    setSeedLoading(true);
    setSeedMessage('');
    try {
      const res = await fetch(`${apiUrl}/admin/seed/container-types`, { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi seed demo');
      setSeedMessage(data.message || 'Seed thành công');
      await fetchItems();
    } catch (e: any) {
      setSeedMessage(e.message || 'Lỗi không xác định');
    } finally {
      setSeedLoading(false);
    }
  };

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý Loại Container (Thêm/sửa/xóa)</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Danh sách loại container phục vụ nhập liệu & cấu hình.</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span className="flex-1">{error}</span>
            <Button size="sm" variant="outline" onClick={fetchItems} disabled={loading}>
              Thử lại
            </Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Quản lý danh mục ({filtered.length})
            </CardTitle>
            <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:items-center">
              <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Tìm theo tên..." className="sm:flex-1" />
              <Button variant="outline" onClick={seedDemo} disabled={loading || seedLoading}>
                <Wand2 className={`w-4 h-4 mr-2 ${seedLoading ? 'animate-spin' : ''}`} />
                {seedLoading ? 'Đang seed...' : 'Khởi tạo demo'}
              </Button>
              <Dialog
                open={openCreate}
                onOpenChange={(o) => {
                  setOpenCreate(o);
                  if (o) setTempId(crypto.randomUUID());
                  if (!o) {
                    setTempId('');
                    setFormName('');
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button className="bg-blue-900 hover:bg-blue-800 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm loại
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Thêm loại container</DialogTitle>
                    <DialogDescription>Nhập tên loại container mới.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Mã (ID)</div>
                    <Input value={tempId} disabled className="font-mono text-xs" />
                  </div>
                  <div className="space-y-2 mt-3">
                    <div className="text-sm font-medium text-gray-700">Tên loại</div>
                    <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="VD: 20ft" />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenCreate(false)}>
                      Hủy
                    </Button>
                    <Button onClick={submitCreate} className="bg-blue-900 hover:bg-blue-800 text-white">
                      Thêm
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={fetchItems} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Làm mới
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {seedMessage && (
              <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 text-blue-800 dark:border-blue-800 dark:text-blue-200 rounded-lg p-3 text-sm">
                {seedMessage}
              </div>
            )}
            {loading ? (
              <div className="py-10 text-gray-600 dark:text-gray-400">Đang tải...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Mã (ID)</TableHead>
                    <TableHead>Tên loại</TableHead>
                    <TableHead className="w-[180px]">Tạo lúc</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-mono text-xs text-gray-700 dark:text-gray-300">
                        {truncate(it.id)}
                      </TableCell>
                      <TableCell className="font-semibold">{it.name}</TableCell>
                      <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                        {it.created_at ? new Date(it.created_at).toLocaleDateString('vi-VN') : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-2">
                          <Button variant="ghost" size="sm" className="text-blue-700 hover:text-blue-800 hover:bg-blue-50" onClick={() => openEditDialog(it)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-700 hover:text-red-800 hover:bg-red-50" onClick={() => submitDelete(it.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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
          </CardContent>
        </Card>

        <Dialog open={openEdit} onOpenChange={(o) => (setOpenEdit(o), !o && setEditing(null))}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Sửa loại container</DialogTitle>
              <DialogDescription>Cập nhật tên loại.</DialogDescription>
            </DialogHeader>
            {editing && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-700">Mã (ID)</div>
                  <Input value={editing.id} disabled className="font-mono text-xs" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-700">Tên loại</div>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
                </div>
                <div className="text-xs text-gray-500">
                  Tạo lúc: {editing.created_at ? new Date(editing.created_at).toLocaleString('vi-VN') : '—'}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenEdit(false)}>
                Hủy
              </Button>
              <Button onClick={submitEdit} className="bg-blue-900 hover:bg-blue-800 text-white">
                Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </WarehouseLayout>
  );
}

