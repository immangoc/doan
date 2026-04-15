import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Truck,
} from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { useWarehouseAuth, API_BASE } from '../../../../contexts/WarehouseAuthContext';

type ShippingCompany = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at?: string;
};

type ScheduleItem = {
  id: string;
  company_name: string;
  ship_name: string;
  type: 'import' | 'export' | string;
  time_start: string;
  time_end: string;
  location: string;
  containers: number;
  status: string;
  created_at?: string;
  updated_at?: string;
};

function toDatetimeLocalValue(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // Use ISO in UTC to be consistent for demo; datetime-local will interpret as local.
  return d.toISOString().slice(0, 16);
}

function safeNumber(n: any) {
  const x = typeof n === 'number' ? n : parseInt(String(n || '0'), 10);
  return Number.isFinite(x) ? x : 0;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN');
}

export default function AdminSchedulesSection() {
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
  const [items, setItems] = useState<ScheduleItem[]>([]);

  const [shippingCompanies, setShippingCompanies] = useState<ShippingCompany[]>([]);

  const [keyword, setKeyword] = useState('');
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');

  // Create/edit
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<ScheduleItem | null>(null);

  const [form, setForm] = useState({
    company_name: '',
    ship_name: '',
    type: 'import' as ScheduleItem['type'],
    time_start: '',
    time_end: '',
    location: '',
    containers: 0,
    status: 'scheduled',
  });

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [sRes, cRes] = await Promise.all([
        fetch(`${apiUrl}/admin/schedules`, { headers }),
        fetch(`${apiUrl}/admin/shipping-companies`, { headers }),
      ]);
      const sData = await sRes.json();
      const cData = await cRes.json();
      if (!sRes.ok) throw new Error(sData.message || 'Lỗi lấy schedules');
      if (!cRes.ok) throw new Error(cData.message || 'Lỗi lấy hãng tàu');
      type RawSchedule = { scheduleId: number; companyName: string; shipName: string; type: string; timeStart: string; timeEnd: string; location: string; containers: number; status: string; createdAt?: string; updatedAt?: string };
      const rawS: RawSchedule[] = sData.data || [];
      setItems(rawS.map(it => ({ id: String(it.scheduleId), company_name: it.companyName, ship_name: it.shipName, type: it.type, time_start: it.timeStart, time_end: it.timeEnd, location: it.location, containers: it.containers, status: it.status, created_at: it.createdAt, updated_at: it.updatedAt })));
      type RawCompany = { companyId: number; name: string; phone?: string; email?: string; address?: string; createdAt?: string };
      const rawC: RawCompany[] = cData.data || [];
      setShippingCompanies(rawC.map(it => ({ id: String(it.companyId), name: it.name, phone: it.phone, email: it.email, address: it.address, created_at: it.createdAt })));
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

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return items;
    return items.filter((it) =>
      `${it.id} ${it.company_name} ${it.ship_name} ${it.type} ${it.location} ${it.status}`.toLowerCase().includes(k),
    );
  }, [items, keyword]);

  const truncate = (s: string) => {
    if (!s) return '';
    if (s.length <= 10) return s;
    return `${s.slice(0, 6)}…${s.slice(-4)}`;
  };

  const resetForm = () =>
    setForm({
      company_name: shippingCompanies[0]?.name || '',
      ship_name: '',
      type: 'import',
      time_start: '',
      time_end: '',
      location: '',
      containers: 0,
      status: 'scheduled',
    });

  useEffect(() => {
    // When companies load for first time, prefill company_name.
    if (!form.company_name && shippingCompanies.length > 0) {
      setForm((p) => ({ ...p, company_name: shippingCompanies[0].name }));
    }
  }, [shippingCompanies]); // intentionally no form in deps

  const seedDemo = async () => {
    setSeedLoading(true);
    setSeedMessage('');
    try {
      const res = await fetch(`${apiUrl}/admin/seed/schedules`, { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi seed schedules');
      setSeedMessage(data.message || 'Seed thành công');
      await fetchAll();
    } catch (e: any) {
      setSeedMessage(e.message || 'Lỗi không xác định');
    } finally {
      setSeedLoading(false);
    }
  };

  const submitCreate = async () => {
    const payload = {
      companyName: form.company_name,
      shipName: form.ship_name,
      type: form.type,
      timeStart: form.time_start ? new Date(form.time_start).toISOString() : '',
      timeEnd: form.time_end ? new Date(form.time_end).toISOString() : '',
      location: form.location,
      containers: safeNumber(form.containers),
      status: form.status,
    };
    try {
      const res = await fetch(`${apiUrl}/admin/schedules`, { method: 'POST', headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi thêm lịch');
      setOpenCreate(false);
      resetForm();
      await fetchAll();
    } catch (e: any) {
      alert(e.message || 'Lỗi không xác định');
    }
  };

  const openEditDialog = (it: ScheduleItem) => {
    setEditing(it);
    setForm({
      company_name: it.company_name || '',
      ship_name: it.ship_name || '',
      type: it.type as any,
      time_start: toDatetimeLocalValue(it.time_start),
      time_end: toDatetimeLocalValue(it.time_end),
      location: it.location || '',
      containers: it.containers || 0,
      status: it.status || 'scheduled',
    });
    setOpenEdit(true);
  };

  const submitEdit = async () => {
    if (!editing) return;
    const payload = {
      companyName: form.company_name,
      shipName: form.ship_name,
      type: form.type,
      timeStart: form.time_start ? new Date(form.time_start).toISOString() : editing.time_start,
      timeEnd: form.time_end ? new Date(form.time_end).toISOString() : editing.time_end,
      location: form.location,
      containers: safeNumber(form.containers),
      status: form.status,
    };
    try {
      const res = await fetch(`${apiUrl}/admin/schedules/${editing.id}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật lịch');
      setOpenEdit(false);
      setEditing(null);
      resetForm();
      await fetchAll();
    } catch (e: any) {
      alert(e.message || 'Lỗi không xác định');
    }
  };

  const submitDelete = async (id: string) => {
    const ok = confirm('Bạn có chắc chắn muốn xóa lịch trình này không?');
    if (!ok) return;
    try {
      const res = await fetch(`${apiUrl}/admin/schedules/${id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi xóa lịch');
      await fetchAll();
    } catch (e: any) {
      alert(e.message || 'Lỗi không xác định');
    }
  };

  const statusBadge = (st: string) => {
    const s = st.toLowerCase();
    if (s === 'in-progress' || s === 'in_progress') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
    if (s === 'completed' || s === 'done') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
  };

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý Lịch trình</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">CRUD lịch nhập/xuất gắn với hãng tàu & tàu.</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span className="flex-1">{error}</span>
            <Button size="sm" variant="outline" onClick={fetchAll} disabled={loading}>
              Thử lại
            </Button>
          </div>
        )}

        {seedMessage && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 text-blue-800 dark:border-blue-800 dark:text-blue-200 rounded-lg p-3 text-sm">
            {seedMessage}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              Danh sách lịch ({filtered.length})
            </CardTitle>
            <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:items-center">
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm theo ID, hãng tàu, tàu, loại, trạng thái..."
                className="sm:flex-1"
              />
              <Button variant="outline" onClick={seedDemo} disabled={loading || seedLoading}>
                <Truck className={`w-4 h-4 mr-2 ${seedLoading ? 'animate-spin' : ''}`} />
                {seedLoading ? 'Đang seed...' : 'Khởi tạo demo'}
              </Button>
              <Dialog
                open={openCreate}
                onOpenChange={(o) => {
                  setOpenCreate(o);
                  if (!o) resetForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button className="bg-blue-900 hover:bg-blue-800 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm lịch
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Thêm lịch trình</DialogTitle>
                    <DialogDescription>Nhập thông tin lịch nhập/xuất theo hãng tàu và tàu.</DialogDescription>
                  </DialogHeader>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Hãng tàu</div>
                      <Select
                        value={form.company_name}
                        onValueChange={(v) => setForm((p) => ({ ...p, company_name: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {shippingCompanies.map((c) => (
                            <SelectItem key={c.id} value={c.name}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Tên tàu</div>
                      <Input value={form.ship_name} onChange={(e) => setForm((p) => ({ ...p, ship_name: e.target.value }))} placeholder="VD: MV Ocean Star" />
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Loại</div>
                      <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v as any }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="import">import</SelectItem>
                          <SelectItem value="export">export</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Trạng thái</div>
                      <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">scheduled</SelectItem>
                          <SelectItem value="in-progress">in-progress</SelectItem>
                          <SelectItem value="completed">completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Thời gian bắt đầu</div>
                      <Input type="datetime-local" value={form.time_start} onChange={(e) => setForm((p) => ({ ...p, time_start: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Thời gian kết thúc</div>
                      <Input type="datetime-local" value={form.time_end} onChange={(e) => setForm((p) => ({ ...p, time_end: e.target.value }))} />
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Vị trí</div>
                      <Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="VD: Bến số 1" />
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Số container</div>
                      <Input type="number" value={form.containers} onChange={(e) => setForm((p) => ({ ...p, containers: safeNumber(e.target.value) }))} />
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
              <Button variant="outline" onClick={fetchAll} disabled={loading}>
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
                    <TableHead className="w-[200px]">Hãng tàu</TableHead>
                    <TableHead className="w-[200px]">Tàu</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead className="w-[220px]">Thời gian</TableHead>
                    <TableHead className="w-[180px]">Vị trí</TableHead>
                    <TableHead className="w-[150px]">Container</TableHead>
                    <TableHead className="w-[160px]">Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-mono text-xs text-gray-700 dark:text-gray-300">{truncate(it.id)}</TableCell>
                      <TableCell className="font-semibold">{it.company_name}</TableCell>
                      <TableCell className="font-semibold">{it.ship_name}</TableCell>
                      <TableCell className="text-sm">{it.type}</TableCell>
                      <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(it.time_start)} - {formatDate(it.time_end)}
                      </TableCell>
                      <TableCell className="text-sm">{it.location}</TableCell>
                      <TableCell className="text-sm font-semibold">{it.containers}</TableCell>
                      <TableCell className="text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs inline-block ${statusBadge(it.status)}`}>
                          {it.status}
                        </span>
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
                      <TableCell colSpan={9} className="text-center text-gray-500 py-10">
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Sửa lịch trình</DialogTitle>
              <DialogDescription>Cập nhật thông tin lịch.</DialogDescription>
            </DialogHeader>

            {editing && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">ID</div>
                  <Input value={editing.id} disabled className="font-mono text-xs" />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Tạo lúc</div>
                  <Input value={formatDate(editing.created_at)} disabled className="font-mono text-xs" />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Hãng tàu</div>
                  <Select value={form.company_name} onValueChange={(v) => setForm((p) => ({ ...p, company_name: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {shippingCompanies.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Tên tàu</div>
                  <Input value={form.ship_name} onChange={(e) => setForm((p) => ({ ...p, ship_name: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Loại</div>
                  <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="import">import</SelectItem>
                      <SelectItem value="export">export</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Trạng thái</div>
                  <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">scheduled</SelectItem>
                      <SelectItem value="in-progress">in-progress</SelectItem>
                      <SelectItem value="completed">completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Thời gian bắt đầu</div>
                  <Input type="datetime-local" value={form.time_start} onChange={(e) => setForm((p) => ({ ...p, time_start: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Thời gian kết thúc</div>
                  <Input type="datetime-local" value={form.time_end} onChange={(e) => setForm((p) => ({ ...p, time_end: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Vị trí</div>
                  <Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Container</div>
                  <Input type="number" value={form.containers} onChange={(e) => setForm((p) => ({ ...p, containers: safeNumber(e.target.value) }))} />
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

