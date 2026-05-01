import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import WarehouseLayout from '../../components/warehouse/WarehouseLayout';
import {
  Package, Plus, Edit, Trash2, Search, Filter,
  Download, MapPin, Calendar, RefreshCw, AlertCircle, FileText, Check,
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
import { useWarehouseAuth, API_BASE } from '../../contexts/WarehouseAuthContext';
import { exportEIR, exportContainerListExcel, type EIRData } from '../../utils/exportEIR';

interface ContainerRow {
  containerId: string;
  containerTypeName?: string;
  statusName?: string;
  cargoTypeName?: string;
  grossWeight?: number | string;
  declaredValue?: number | string;
  sealNumber?: string;
  note?: string;
  createdAt?: string;
  yardName?: string;
  zoneName?: string;
  blockName?: string;
  rowNo?: number;
  bayNo?: number;
  tier?: number;
  gateOutTime?: string;
}

interface LookupItem { id: number; name: string; }

const EMPTY_FORM = {
  containerId: '',
  containerTypeId: '',
  cargoTypeId: '',
  grossWeight: '',
  declaredValue: '',
  sealNumber: '',
  note: '',
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  AVAILABLE: { label: 'Sẵn sàng',    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
  GATE_IN:   { label: 'Chờ hạ bãi',  color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  IN_YARD:   { label: 'Trong bãi',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  GATE_OUT:  { label: 'Chờ xuất',    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  EXPORTED:  { label: 'Đã xuất',     color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  DAMAGED:   { label: 'Hư hỏng',     color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  OVERDUE:   { label: 'Quá hạn',     color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  CANCELLED: { label: 'Đã hủy',      color: 'bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400' },
};

export default function ContainerManagement() {
  const { accessToken, user } = useWarehouseAuth();
  const [containers, setContainers] = useState<ContainerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContainerRow | null>(null);
  const [formData, setFormData] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [containerTypes, setContainerTypes] = useState<LookupItem[]>([]);
  const [cargoTypes, setCargoTypes] = useState<LookupItem[]>([]);

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken]);

  const fetchContainers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), size: '20' });
      if (filterStatus !== 'all') params.set('statusName', filterStatus);
      if (searchTerm.trim()) params.set('keyword', searchTerm.trim());
      const res = await fetch(`${API_BASE}/admin/containers?${params}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tải dữ liệu');
      const pageData = data?.data ?? {};
      setContainers(pageData.content ?? []);
      setTotalPages(pageData.totalPages ?? 0);
      setTotalElements(pageData.totalElements ?? 0);
    } catch (err: any) {
      setError(err.message || 'Lỗi');
    } finally {
      setLoading(false);
    }
  }, [headers, filterStatus, searchTerm, page]);

  useEffect(() => { fetchContainers(); }, [fetchContainers]);

  // Fetch lookups once
  useEffect(() => {
    const load = async () => {
      try {
        const [ctRes, cargoRes] = await Promise.all([
          fetch(`${API_BASE}/public/container-types`),
          fetch(`${API_BASE}/public/cargo-types`),
        ]);
        const ctJson = await ctRes.json();
        const cargoJson = await cargoRes.json();
        setContainerTypes((ctJson?.data ?? []).map((x: any) => ({
          id: x.containerTypeId, name: x.containerTypeName,
        })));
        setCargoTypes((cargoJson?.data ?? []).map((x: any) => ({
          id: x.cargoTypeId, name: x.cargoTypeName,
        })));
      } catch { /* lookups non-critical */ }
    };
    load();
  }, []);

  const filteredContainers = containers;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const payload: Record<string, unknown> = {
        containerId: formData.containerId.trim(),
        containerTypeId: formData.containerTypeId ? Number(formData.containerTypeId) : null,
        cargoTypeId: formData.cargoTypeId ? Number(formData.cargoTypeId) : null,
        grossWeight: formData.grossWeight ? Number(formData.grossWeight) : null,
        declaredValue: formData.declaredValue ? Number(formData.declaredValue) : null,
        sealNumber: formData.sealNumber || null,
        note: formData.note || null,
      };
      const url = editing
        ? `${API_BASE}/admin/containers/${editing.containerId}`
        : `${API_BASE}/admin/containers`;
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers, body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Lỗi lưu container');
      await fetchContainers();
      setIsDialogOpen(false);
      setEditing(null);
      setFormData({ ...EMPTY_FORM });
    } catch (err: any) {
      setFormError(err.message || 'Lỗi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (c: ContainerRow) => {
    setEditing(c);
    const ct = containerTypes.find((t) => t.name === c.containerTypeName);
    const cg = cargoTypes.find((t) => t.name === c.cargoTypeName);
    setFormData({
      containerId: c.containerId,
      containerTypeId: ct ? String(ct.id) : '',
      cargoTypeId: cg ? String(cg.id) : '',
      grossWeight: c.grossWeight != null ? String(c.grossWeight) : '',
      declaredValue: c.declaredValue != null ? String(c.declaredValue) : '',
      sealNumber: c.sealNumber || '',
      note: c.note || '',
    });
    setFormError('');
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa container ${id}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/containers/${id}`, { method: 'DELETE', headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Lỗi xóa container');
      }
      setContainers((prev) => prev.filter((c) => c.containerId !== id));
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Lỗi'));
    }
  };

  const handleExport = async () => {
    const exportRows = filteredContainers.map((c) => ({
      containerId: c.containerId,
      containerTypeName: c.containerTypeName,
      cargoTypeName: c.cargoTypeName,
      grossWeight: c.grossWeight,
      yardName: c.yardName,
      zoneName: c.zoneName,
      blockName: c.blockName,
      rowNo: c.rowNo,
      bayNo: c.bayNo,
      tier: c.tier,
      statusLabel: STATUS_MAP[c.statusName || '']?.label || c.statusName || '',
      sealNumber: c.sealNumber,
      createdAt: c.createdAt,
      declaredValue: c.declaredValue,
    }));
    await exportContainerListExcel(exportRows);
  };

  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportTarget, setExportTarget] = useState<ContainerRow | null>(null);

  const handleExportEIR = async (c: ContainerRow) => {
    setExportTarget(null);
    setExportingId(c.containerId);
    try {
      // Fetch order details for this container
      let orderData: any = null;
      if (c.containerId) {
        try {
          const orderRes = await fetch(
            `${API_BASE}/admin/orders?keyword=${encodeURIComponent(c.containerId)}&page=0&size=5`,
            { headers }
          );
          const orderJson = await orderRes.json();
          const orders = orderJson?.data?.content ?? [];
          // Find the order that contains this container
          orderData = orders.find((o: any) =>
            o.containers?.some((ct: any) => ct.containerId === c.containerId)
          ) || orders[0] || null;
        } catch { /* order fetch non-critical */ }
      }

      const eirData: EIRData = {
        containerId: c.containerId,
        sealNumber: c.sealNumber,
        containerTypeName: c.containerTypeName,
        cargoTypeName: c.cargoTypeName,
        grossWeight: c.grossWeight,
        statusName: STATUS_MAP[c.statusName || '']?.label || c.statusName || '',
        declaredValue: c.declaredValue,
        yardName: c.yardName,
        zoneName: c.zoneName,
        blockName: c.blockName,
        rowNo: c.rowNo,
        bayNo: c.bayNo,
        tier: c.tier,
        note: c.note,
        gateOutTime: c.gateOutTime,
        // Order data
        orderId: orderData?.orderId,
        customerName: orderData?.customerName,
        phone: orderData?.phone,
        email: orderData?.email,
        address: orderData?.address,
        importDate: orderData?.importDate,
        exportDate: orderData?.exportDate || orderData?.requestedExportDate,
        paidAmount: orderData?.paidAmount,
        bookingNo: orderData?.orderId ? `#${orderData.orderId}` : undefined,
      };

      await exportEIR(eirData);
    } catch (err: any) {
      alert('L\u1ed7i xu\u1ea5t b\u00e1o c\u00e1o: ' + (err.message || 'L\u1ed7i'));
    } finally {
      setExportingId(null);
    }
  };

  const canEdit = user?.role === 'admin' || user?.role === 'planner' || user?.role === 'operator';
  const canDelete = user?.role === 'admin';

  const stats = useMemo(() => ([
    { label: 'Tổng container', count: totalElements, color: 'bg-blue-500' },
    { label: 'Chờ hạ bãi',  count: containers.filter((c) => c.statusName === 'GATE_IN').length, color: 'bg-yellow-500' },
    { label: 'Trong bãi',   count: containers.filter((c) => c.statusName === 'IN_YARD').length, color: 'bg-blue-600' },
    { label: 'Đã xuất',     count: containers.filter((c) => c.statusName === 'EXPORTED').length, color: 'bg-green-500' },
  ]), [containers, totalElements]);

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Quản lý Container</h2>
            <p className="text-gray-600 dark:text-gray-400">Dữ liệu thời gian thực từ hệ thống kho bãi</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchContainers} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            {canEdit && (
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) { setEditing(null); setFormData({ ...EMPTY_FORM }); setFormError(''); }
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-900 hover:bg-blue-800 text-white">
                    <Plus className="w-4 h-4 mr-2" /> Thêm Container
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editing ? 'Chỉnh sửa Container' : 'Thêm Container mới'}</DialogTitle>
                    <DialogDescription>
                      {editing ? 'Cập nhật thông tin container' : 'Nhập thông tin container (vị trí trong bãi được gán qua luồng hạ bãi)'}
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
                        <Label>Mã Container *</Label>
                        <Input
                          value={formData.containerId}
                          onChange={(e) => setFormData({ ...formData, containerId: e.target.value.toUpperCase() })}
                          placeholder="TEMU1234567" required disabled={!!editing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Loại Container</Label>
                        <Select
                          value={formData.containerTypeId}
                          onValueChange={(v) => setFormData({ ...formData, containerTypeId: v })}
                        >
                          <SelectTrigger><SelectValue placeholder="Chọn loại" /></SelectTrigger>
                          <SelectContent>
                            {containerTypes.map((ct) => (
                              <SelectItem key={ct.id} value={String(ct.id)}>{ct.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Loại hàng hóa</Label>
                        <Select
                          value={formData.cargoTypeId}
                          onValueChange={(v) => setFormData({ ...formData, cargoTypeId: v })}
                        >
                          <SelectTrigger><SelectValue placeholder="Chọn loại hàng" /></SelectTrigger>
                          <SelectContent>
                            {cargoTypes.map((cg) => (
                              <SelectItem key={cg.id} value={String(cg.id)}>{cg.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Trọng lượng (kg)</Label>
                        <Input
                          type="number" value={formData.grossWeight}
                          onChange={(e) => setFormData({ ...formData, grossWeight: e.target.value })}
                          placeholder="24000"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Giá trị khai báo (VND)</Label>
                        <Input
                          type="number" value={formData.declaredValue}
                          onChange={(e) => setFormData({ ...formData, declaredValue: e.target.value })}
                          placeholder="100000000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Số seal</Label>
                        <Input
                          value={formData.sealNumber}
                          onChange={(e) => setFormData({ ...formData, sealNumber: e.target.value })}
                          placeholder="SL-000123"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Ghi chú</Label>
                      <Input
                        value={formData.note}
                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                        placeholder="Ghi chú thêm..."
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                      <Button type="submit" className="bg-blue-900 hover:bg-blue-800" disabled={submitting}>
                        {submitting ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Thêm mới'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`${s.color} w-3 h-10 rounded-full`} />
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{s.count}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Tìm mã container..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(0); }}>
                <SelectTrigger className="w-full sm:w-56">
                  <Filter className="w-4 h-4 mr-2" /><SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  {Object.entries(STATUS_MAP).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />Xuất Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Danh sách Container ({totalElements})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-600 mb-4">
                <AlertCircle className="w-5 h-5" /> {error}
                <Button size="sm" variant="outline" onClick={fetchContainers} className="ml-auto">Thử lại</Button>
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="ml-3 text-gray-600">Đang tải dữ liệu...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã Container</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Hàng hóa</TableHead>
                      <TableHead>Trọng lượng</TableHead>
                      <TableHead>Vị trí</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      {(canEdit || canDelete) && <TableHead className="text-right">Thao tác</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContainers.map((c, index) => {
                      const pos = [c.yardName, c.zoneName, c.blockName].filter(Boolean).join(' · ');
                      const slot = c.rowNo != null && c.bayNo != null
                        ? `R${c.rowNo}B${c.bayNo}${c.tier ? `/T${c.tier}` : ''}`
                        : '';
                      return (
                        <motion.tr
                          key={c.containerId}
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <TableCell className="font-mono font-bold text-blue-700 dark:text-blue-400">
                            {c.containerId}
                          </TableCell>
                          <TableCell><Badge variant="outline">{c.containerTypeName || '—'}</Badge></TableCell>
                          <TableCell className="text-sm">{c.cargoTypeName || '—'}</TableCell>
                          <TableCell className="text-sm">
                            {c.grossWeight != null && c.grossWeight !== '' ? `${Number(c.grossWeight).toLocaleString('vi-VN')} kg` : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              <span className="font-mono">{pos || '—'}{slot ? ` · ${slot}` : ''}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_MAP[c.statusName || '']?.color || 'bg-gray-100 text-gray-700'}`}>
                              {STATUS_MAP[c.statusName || '']?.label || c.statusName || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              {c.createdAt ? new Date(c.createdAt).toLocaleDateString('vi-VN') : '—'}
                            </div>
                          </TableCell>
                          {(canEdit || canDelete) && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {c.statusName === 'IN_YARD' && (
                                  <Button
                                    variant="ghost" size="sm"
                                    onClick={() => setExportTarget(c)}
                                    disabled={exportingId === c.containerId}
                                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                    title="Xuất phiếu giao nhận (EIR)"
                                  >
                                    {exportingId === c.containerId
                                      ? <RefreshCw className="w-4 h-4 animate-spin" />
                                      : <FileText className="w-4 h-4" />
                                    }
                                  </Button>
                                )}
                                {canEdit && (
                                  <Button
                                    variant="ghost" size="sm" onClick={() => handleEdit(c)}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button
                                    variant="ghost" size="sm"
                                    onClick={() => handleDelete(c.containerId)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
                {filteredContainers.length === 0 && !loading && !error && (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Không có container phù hợp</p>
                  </div>
                )}
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t mt-4">
                    <p className="text-sm text-gray-500">
                      Trang {page + 1} / {totalPages} · Tổng {totalElements} container
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline" size="sm"
                        disabled={page === 0}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                      >
                        ← Trước
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Sau →
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* EIR Export Confirmation Dialog */}
        <Dialog open={!!exportTarget} onOpenChange={(open) => { if (!open) setExportTarget(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                Xuất phiếu giao nhận (EIR)
              </DialogTitle>
              <DialogDescription>
                Bạn có muốn xuất phiếu giao nhận container cho:
              </DialogDescription>
            </DialogHeader>
            {exportTarget && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Mã Container:</span>
                  <span className="font-mono font-bold text-blue-700 dark:text-blue-400">{exportTarget.containerId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Loại:</span>
                  <span className="text-sm">{exportTarget.containerTypeName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Hàng hóa:</span>
                  <span className="text-sm">{exportTarget.cargoTypeName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Vị trí:</span>
                  <span className="text-sm font-mono">
                    {[exportTarget.yardName, exportTarget.zoneName, exportTarget.blockName].filter(Boolean).join(' · ')}
                    {exportTarget.rowNo != null && exportTarget.bayNo != null ? ` · R${exportTarget.rowNo}B${exportTarget.bayNo}${exportTarget.tier ? `/T${exportTarget.tier}` : ''}` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Trọng lượng:</span>
                  <span className="text-sm">{exportTarget.grossWeight != null ? `${Number(exportTarget.grossWeight).toLocaleString('vi-VN')} kg` : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Số seal:</span>
                  <span className="text-sm">{exportTarget.sealNumber || '—'}</span>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setExportTarget(null)}>Hủy</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={exportingId != null}
                onClick={() => exportTarget && handleExportEIR(exportTarget)}
              >
                {exportingId
                  ? <><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Đang xuất...</>
                  : <><Check className="w-4 h-4 mr-2" /> Xác nhận xuất</>
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </WarehouseLayout>
  );
}
