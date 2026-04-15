import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Clock, Pencil, Plus, Star, Trash2, Wrench, ArrowRightLeft } from 'lucide-react';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Badge } from '../../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { useWarehouseAuth, API_BASE } from '../../../../contexts/WarehouseAuthContext';

type ContainerItem = {
  containerId: string;
  manifestId?: string;
  containerTypeName?: string;
  statusName?: string;
  cargoTypeName?: string;
  attributeName?: string;
  grossWeight?: number;
  sealNumber?: string;
  note?: string;
  createdAt?: string;
};

type ContainerTypeItem = { containerTypeId: number; containerTypeName: string };
type CargoTypeItem = { cargoTypeId: number; cargoTypeName: string };
type AttributeItem = { attributeId: number; attributeName: string };
type StatusItem = { statusId: number; statusName: string };
type HistoryItem = { historyId: number; statusName: string; description?: string; createdAt?: string };

const STATUS_CLASS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  GATE_IN: 'bg-blue-100 text-blue-700',
  IN_YARD: 'bg-indigo-100 text-indigo-700',
  GATE_OUT: 'bg-orange-100 text-orange-700',
  EXPORTED: 'bg-gray-100 text-gray-700',
  DAMAGED: 'bg-red-100 text-red-700',
  OVERDUE: 'bg-yellow-100 text-yellow-700',
  CANCELLED: 'bg-gray-200 text-gray-500',
};

const PAGE_SIZE = 20;

export default function AdminContainersSection() {
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
  const [items, setItems] = useState<ContainerItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Catalog
  const [containerTypes, setContainerTypes] = useState<ContainerTypeItem[]>([]);
  const [cargoTypes, setCargoTypes] = useState<CargoTypeItem[]>([]);
  const [attributes, setAttributes] = useState<AttributeItem[]>([]);
  const [statuses, setStatuses] = useState<StatusItem[]>([]);

  // Dialogs
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPriority, setShowPriority] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showRepair, setShowRepair] = useState(false);
  const [selected, setSelected] = useState<ContainerItem | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [form, setForm] = useState({
    containerId: '',
    manifestId: '',
    containerTypeId: '',
    cargoTypeId: '',
    attributeId: '',
    grossWeight: '',
    sealNumber: '',
    note: '',
  });
  const [priorityForm, setPriorityForm] = useState({ priorityLevel: '5', note: '' });
  const [repairForm, setRepairForm] = useState({
    repairStatus: 'REPAIRING',
    repairDate: '',
    compensationCost: '',
    expectedExitDate: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCatalogs = async () => {
    try {
      const [ctRes, carRes, attrRes, statusRes] = await Promise.all([
        fetch(`${API_BASE}/admin/container-types`, { headers }),
        fetch(`${API_BASE}/admin/cargo-types`, { headers }),
        fetch(`${API_BASE}/admin/cargo-attributes`, { headers }),
        fetch(`${API_BASE}/admin/container-statuses`, { headers }),
      ]);
      const [ctData, carData, attrData, statusData] = await Promise.all([
        ctRes.json(), carRes.json(), attrRes.json(), statusRes.json(),
      ]);
      if (ctRes.ok) setContainerTypes(ctData.data || []);
      if (carRes.ok) setCargoTypes(carData.data || []);
      if (attrRes.ok) setAttributes(attrData.data || []);
      if (statusRes.ok) setStatuses(statusData.data || []);
    } catch {
      // catalogs are optional for display
    }
  };

  const fetchItems = async (p = page, kw = keyword) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(p),
        size: String(PAGE_SIZE),
        sortBy: 'containerId',
        direction: 'asc',
        ...(kw ? { keyword: kw } : {}),
      });
      const res = await fetch(`${API_BASE}/admin/containers?${params}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tải danh sách container');
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
    fetchCatalogs();
    fetchItems(0, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    setKeyword(searchInput);
    fetchItems(0, searchInput);
  };

  const openCreate = () => {
    setForm({ containerId: '', manifestId: '', containerTypeId: '', cargoTypeId: '', attributeId: '', grossWeight: '', sealNumber: '', note: '' });
    setShowCreate(true);
  };

  const openEdit = (item: ContainerItem) => {
    setSelected(item);
    setForm({
      containerId: item.containerId,
      manifestId: item.manifestId || '',
      containerTypeId: '',
      cargoTypeId: '',
      attributeId: '',
      grossWeight: item.grossWeight != null ? String(item.grossWeight) : '',
      sealNumber: item.sealNumber || '',
      note: item.note || '',
    });
    setShowEdit(true);
  };

  const openHistory = async (item: ContainerItem) => {
    setSelected(item);
    setHistory([]);
    setShowHistory(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/containers/${item.containerId}/status-history`, { headers });
      const data = await res.json();
      if (res.ok) setHistory(data.data || []);
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  };

  const openPriority = (item: ContainerItem) => {
    setSelected(item);
    setPriorityForm({ priorityLevel: '5', note: '' });
    setShowPriority(true);
  };

  const openDelete = (item: ContainerItem) => {
    setSelected(item);
    setShowDelete(true);
  };

  const openRepair = (item: ContainerItem) => {
    setSelected(item);
    setRepairForm({
      repairStatus: 'REPAIRING',
      repairDate: '',
      compensationCost: '',
      expectedExitDate: '',
    });
    setShowRepair(true);
  };

  const buildBody = (f: typeof form) => ({
    containerId: f.containerId,
    ...(f.manifestId ? { manifestId: f.manifestId } : {}),
    ...(f.containerTypeId ? { containerTypeId: Number(f.containerTypeId) } : {}),
    ...(f.cargoTypeId ? { cargoTypeId: Number(f.cargoTypeId) } : {}),
    ...(f.attributeId ? { attributeId: Number(f.attributeId) } : {}),
    ...(f.grossWeight ? { grossWeight: Number(f.grossWeight) } : {}),
    ...(f.sealNumber ? { sealNumber: f.sealNumber } : {}),
    ...(f.note ? { note: f.note } : {}),
  });

  const submitCreate = async () => {
    if (!form.containerId.trim()) return alert('Container ID là bắt buộc');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/containers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(buildBody(form)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tạo container');
      setShowCreate(false);
      fetchItems(0, keyword);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitEdit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/containers/${selected.containerId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(buildBody(form)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật container');
      setShowEdit(false);
      fetchItems(page, keyword);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitDelete = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/containers/${selected.containerId}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Lỗi xóa container');
      }
      setShowDelete(false);
      fetchItems(page, keyword);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitPriority = async () => {
    if (!selected) return;
    const level = Number(priorityForm.priorityLevel);
    if (!level || level < 1 || level > 10) return alert('Mức ưu tiên phải từ 1 đến 10');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/containers/${selected.containerId}/export-priority`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ priorityLevel: level, note: priorityForm.note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật ưu tiên');
      alert('Đã cập nhật mức ưu tiên xuất');
      setShowPriority(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitMoveToDamagedYard = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/containers/${selected.containerId}/move-to-damaged-yard`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi chuyển vào kho hỏng');
      alert('Đã chuyển container vào kho hỏng và đặt trạng thái đang sửa');
      setShowRepair(false);
      fetchItems(page, keyword);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitRepairUpdate = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {};
      if (repairForm.repairStatus) body.repairStatus = repairForm.repairStatus;
      if (repairForm.repairDate) body.repairDate = new Date(repairForm.repairDate).toISOString();
      if (repairForm.compensationCost) body.compensationCost = Number(repairForm.compensationCost);

      const res = await fetch(`${API_BASE}/admin/containers/${selected.containerId}/damage-details`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật thông tin sửa chữa');

      if (repairForm.expectedExitDate) {
        const res2 = await fetch(`${API_BASE}/admin/containers/${selected.containerId}/expected-exit-date`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ expectedExitDate: repairForm.expectedExitDate }),
        });
        if (!res2.ok) {
          const data2 = await res2.json().catch(() => ({}));
          throw new Error(data2.message || 'Lỗi cập nhật lịch xuất (ngày dự kiến xuất)');
        }
      }

      alert('Đã cập nhật sửa chữa/lịch xuất');
      setShowRepair(false);
      fetchItems(page, keyword);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const FormFields = ({ f, setF }: { f: typeof form; setF: (v: typeof form) => void }) => (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">Container ID *</label>
        <Input value={f.containerId} onChange={(e) => setF({ ...f, containerId: e.target.value })} placeholder="VD: ABCU1234567" />
      </div>
      <div>
        <label className="text-sm font-medium">Manifest ID</label>
        <Input value={f.manifestId} onChange={(e) => setF({ ...f, manifestId: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Loại container</label>
          <Select value={f.containerTypeId} onValueChange={(v) => setF({ ...f, containerTypeId: v })}>
            <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
            <SelectContent>
              {containerTypes.map((ct) => (
                <SelectItem key={ct.containerTypeId} value={String(ct.containerTypeId)}>{ct.containerTypeName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Loại hàng</label>
          <Select value={f.cargoTypeId} onValueChange={(v) => setF({ ...f, cargoTypeId: v })}>
            <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
            <SelectContent>
              {cargoTypes.map((ct) => (
                <SelectItem key={ct.cargoTypeId} value={String(ct.cargoTypeId)}>{ct.cargoTypeName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Thuộc tính hàng</label>
          <Select value={f.attributeId} onValueChange={(v) => setF({ ...f, attributeId: v })}>
            <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
            <SelectContent>
              {attributes.map((a) => (
                <SelectItem key={a.attributeId} value={String(a.attributeId)}>{a.attributeName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Khối lượng (kg)</label>
          <Input type="number" value={f.grossWeight} onChange={(e) => setF({ ...f, grossWeight: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Seal number</label>
        <Input value={f.sealNumber} onChange={(e) => setF({ ...f, sealNumber: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium">Ghi chú</label>
        <Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      </div>
    </div>
  );

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý Container</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Thêm, sửa, xóa và theo dõi trạng thái container.</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <Button size="sm" variant="outline" onClick={() => fetchItems(page, keyword)} disabled={loading}>Thử lại</Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Danh sách container</CardTitle>
            <div className="mt-3 flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Tìm theo Container ID, seal..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                className="flex-1"
              />
              <Button variant="outline" onClick={handleSearch} disabled={loading}>Tìm</Button>
              <Button variant="outline" onClick={() => fetchItems(page, keyword)} disabled={loading}>Làm mới</Button>
              <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" />Thêm container
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Container ID</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Hàng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Khối lượng</TableHead>
                  <TableHead>Seal</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-500">Đang tải...</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-500">Không có dữ liệu</TableCell></TableRow>
                ) : items.map((item) => (
                  <TableRow key={item.containerId}>
                    <TableCell className="font-mono font-semibold">{item.containerId}</TableCell>
                    <TableCell>{item.containerTypeName || '—'}</TableCell>
                    <TableCell>{item.cargoTypeName || '—'}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_CLASS[item.statusName || ''] || 'bg-gray-100 text-gray-700'}>
                        {item.statusName || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.grossWeight != null ? `${item.grossWeight} kg` : '—'}</TableCell>
                    <TableCell>{item.sealNumber || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openHistory(item)} title="Lịch sử trạng thái">
                          <Clock className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openPriority(item)} title="Ưu tiên xuất">
                          <Star className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openRepair(item)}
                          title="Hỏng / Sửa chữa / Lịch xuất"
                          className={item.statusName === 'DAMAGED' ? 'text-red-700 hover:text-red-800' : ''}
                        >
                          <Wrench className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-700 hover:text-red-800 hover:bg-red-50" onClick={() => openDelete(item)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => fetchItems(page - 1, keyword)} disabled={page === 0 || loading}>Trước</Button>
                <span className="text-sm text-gray-600">Trang {page + 1} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => fetchItems(page + 1, keyword)} disabled={page >= totalPages - 1 || loading}>Sau</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Thêm container mới</DialogTitle>
            <DialogDescription>Điền thông tin container cần thêm.</DialogDescription>
          </DialogHeader>
          <FormFields f={form} setF={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={submitCreate} disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Tạo container'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa container</DialogTitle>
            <DialogDescription>{selected?.containerId}</DialogDescription>
          </DialogHeader>
          <FormFields f={form} setF={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Hủy</Button>
            <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={submitEdit} disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Cập nhật'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lịch sử trạng thái</DialogTitle>
            <DialogDescription>{selected?.containerId}</DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <div className="text-center py-6 text-gray-500">Đang tải...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-6 text-gray-500">Chưa có lịch sử</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead>Thời gian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.historyId}>
                    <TableCell>
                      <Badge className={STATUS_CLASS[h.statusName] || 'bg-gray-100 text-gray-700'}>{h.statusName}</Badge>
                    </TableCell>
                    <TableCell>{h.description || '—'}</TableCell>
                    <TableCell className="text-sm text-gray-500">{h.createdAt ? new Date(h.createdAt).toLocaleString('vi-VN') : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistory(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Priority Dialog */}
      <Dialog open={showPriority} onOpenChange={setShowPriority}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ưu tiên xuất container</DialogTitle>
            <DialogDescription>{selected?.containerId}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Mức ưu tiên (1–10)</label>
              <Input
                type="number"
                min={1}
                max={10}
                value={priorityForm.priorityLevel}
                onChange={(e) => setPriorityForm((p) => ({ ...p, priorityLevel: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Ghi chú</label>
              <Input value={priorityForm.note} onChange={(e) => setPriorityForm((p) => ({ ...p, note: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPriority(false)}>Hủy</Button>
            <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={submitPriority} disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Cập nhật'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa container <strong>{selected?.containerId}</strong>? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Hủy</Button>
            <Button variant="destructive" onClick={submitDelete} disabled={submitting}>
              {submitting ? 'Đang xóa...' : 'Xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Repair / Damaged workflow dialog */}
      <Dialog open={showRepair} onOpenChange={setShowRepair}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hỏng / Sửa chữa / Lịch xuất</DialogTitle>
            <DialogDescription>{selected?.containerId}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-xs text-gray-500">
              - Báo hỏng: dùng nút "Báo hỏng" ở màn 3D/2D (hoặc chuyển vào kho hỏng bên dưới).<br />
              - Chuyển vào kho hỏng sẽ tự tìm slot trống ở "Kho hỏng" và đặt trạng thái đang sửa.
            </div>

            <div>
              <label className="text-sm font-medium">Trạng thái sửa</label>
              <Input
                value={repairForm.repairStatus}
                onChange={(e) => setRepairForm((f) => ({ ...f, repairStatus: e.target.value }))}
                placeholder="VD: REPAIRING / REPAIRED"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Ngày sửa xong (tùy chọn)</label>
              <Input
                type="datetime-local"
                value={repairForm.repairDate}
                onChange={(e) => setRepairForm((f) => ({ ...f, repairDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Bù tiền / Chi phí (tùy chọn)</label>
              <Input
                type="number"
                value={repairForm.compensationCost}
                onChange={(e) => setRepairForm((f) => ({ ...f, compensationCost: e.target.value }))}
                placeholder="VD: 200000"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Ngày dự kiến xuất (storage_end_date)</label>
              <Input
                type="date"
                value={repairForm.expectedExitDate}
                onChange={(e) => setRepairForm((f) => ({ ...f, expectedExitDate: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setShowRepair(false)} disabled={submitting}>Đóng</Button>
            <Button
              variant="outline"
              onClick={submitMoveToDamagedYard}
              disabled={submitting || !selected}
              title="Chuyển vào kho hỏng"
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Chuyển kho hỏng
            </Button>
            <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={submitRepairUpdate} disabled={submitting || !selected}>
              {submitting ? 'Đang lưu...' : 'Lưu cập nhật'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WarehouseLayout>
  );
}
