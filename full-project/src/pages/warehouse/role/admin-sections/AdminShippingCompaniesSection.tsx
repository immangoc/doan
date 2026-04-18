import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Pencil, Plus, RefreshCw, Trash2, Building2, Mail, Phone, MapPin, Wand2 } from 'lucide-react';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../../../components/ui/dialog';
import { useWarehouseAuth, API_BASE } from '../../../../contexts/WarehouseAuthContext';

type ShippingCompany = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at?: string;
};

function truncate(s: string) {
  if (!s) return '';
  if (s.length <= 10) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN');
}

export default function AdminShippingCompaniesSection() {
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
  const [items, setItems] = useState<ShippingCompany[]>([]);

  const [keyword, setKeyword] = useState('');
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<ShippingCompany | null>(null);
  const [tempId, setTempId] = useState('');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  const fetchItems = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/admin/shipping-companies`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lấy hãng tàu');
      const raw: { companyId: number; name: string; phone?: string; email?: string; address?: string; createdAt?: string }[] = data.data || [];
      setItems(raw.map(it => ({ id: String(it.companyId), name: it.name, phone: it.phone, email: it.email, address: it.address, created_at: it.createdAt })));
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
    return items.filter((it) => `${it.id} ${it.name} ${it.phone} ${it.email} ${it.address}`.toLowerCase().includes(k));
  }, [items, keyword]);

  const seedDemo = async () => {
    setSeedLoading(true);
    setSeedMessage('');
    try {
      const res = await fetch(`${apiUrl}/admin/seed/shipping-companies`, { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi seed hãng tàu');
      setSeedMessage(data.message || 'Seed thành công');
      await fetchItems();
    } catch (e: any) {
      setSeedMessage(e.message || 'Lỗi không xác định');
    } finally {
      setSeedLoading(false);
    }
  };

  const submitCreate = async () => {
    try {
      if (!form.name.trim()) return alert('Tên hãng tàu không được để trống');
      const payload = { name: form.name };
      const res = await fetch(`${apiUrl}/admin/shipping-companies`, { method: 'POST', headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi thêm hãng tàu');
      setOpenCreate(false);
      setTempId('');
      setForm({ name: '', phone: '', email: '', address: '' });
      await fetchItems();
    } catch (e: any) {
      alert(e.message || 'Lỗi không xác định');
    }
  };

  const openEditDialog = (it: ShippingCompany) => {
    setEditing(it);
    setForm({
      name: it.name || '',
      phone: it.phone || '',
      email: it.email || '',
      address: it.address || '',
    });
    setOpenEdit(true);
  };

  const submitEdit = async () => {
    if (!editing) return;
    try {
      if (!form.name.trim()) return alert('Tên hãng tàu không được để trống');
      const payload = { name: form.name };
      const res = await fetch(`${apiUrl}/admin/shipping-companies/${editing.id}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật hãng tàu');
      setOpenEdit(false);
      setEditing(null);
      setForm({ name: '', phone: '', email: '', address: '' });
      await fetchItems();
    } catch (e: any) {
      alert(e.message || 'Lỗi không xác định');
    }
  };

  const submitDelete = async (id: string) => {
    const ok = confirm('Bạn có chắc chắn muốn xóa hãng tàu này không?');
    if (!ok) return;
    try {
      const res = await fetch(`${apiUrl}/admin/shipping-companies/${id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi xóa hãng tàu');
      await fetchItems();
    } catch (e: any) {
      alert(e.message || 'Lỗi không xác định');
    }
  };

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý Hãng tàu</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">CRUD thông tin hãng tàu dùng để gắn lịch trình.</p>
        </div>

        {seedMessage && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 text-blue-800 dark:border-blue-800 dark:text-blue-200 rounded-lg p-3 text-sm">
            {seedMessage}
          </div>
        )}

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
              <Building2 className="w-5 h-5 text-blue-600" />
              Danh sách hãng tàu ({filtered.length})
            </CardTitle>
            <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:items-center">
              <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Tìm theo tên, SĐT, email..." className="sm:flex-1" />
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
                    setForm({ name: '', phone: '', email: '', address: '' });
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button className="bg-blue-900 hover:bg-blue-800 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm hãng tàu
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Thêm hãng tàu</DialogTitle>
                    <DialogDescription>Nhập thông tin hãng tàu.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Mã (ID)</div>
                      <Input value={tempId} disabled className="font-mono text-xs" />
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Tên hãng tàu</div>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="VD: Ocean Star"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenCreate(false)}>
                      Hủy
                    </Button>
                    <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={submitCreate}>
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
            {loading ? (
              <div className="py-10 text-gray-600 dark:text-gray-400">Đang tải...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[170px]">ID</TableHead>
                    <TableHead>Tên hãng tàu</TableHead>
                    <TableHead className="w-[260px]">Liên hệ</TableHead>
                    <TableHead className="w-[260px]">Địa chỉ</TableHead>
                    <TableHead className="w-[170px]">Tạo lúc</TableHead>
                    <TableHead className="text-right w-[160px]">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-mono text-xs text-gray-700 dark:text-gray-300">{truncate(it.id)}</TableCell>
                      <TableCell className="font-semibold">{it.name}</TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-700 dark:text-gray-200 space-y-1">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <span>{it.phone || '—'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span className="break-all">{it.email || '—'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{it.address || '—'}</TableCell>
                      <TableCell className="text-sm text-gray-500 whitespace-nowrap">{formatDate(it.created_at)}</TableCell>
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
                      <TableCell colSpan={6} className="text-center text-gray-500 py-10">
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
              <DialogTitle>Sửa hãng tàu</DialogTitle>
              <DialogDescription>Cập nhật thông tin liên hệ.</DialogDescription>
            </DialogHeader>
            {editing && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">ID</div>
                  <Input value={editing.id} disabled className="font-mono text-xs" />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Tên hãng tàu</div>
                  <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenEdit(false)}>
                Hủy
              </Button>
              <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={submitEdit} disabled={!editing}>
                Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </WarehouseLayout>
  );
}

