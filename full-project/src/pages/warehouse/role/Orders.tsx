import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarClock, FileText, Pencil, Plus, RefreshCw, Search, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import WarehouseLayout from '../../../components/warehouse/WarehouseLayout';
import { useWarehouseAuth, API_BASE } from '../../../contexts/WarehouseAuthContext';
import { toast } from 'sonner';

type OrderItem = {
  orderId: number;
  customerId?: number;
  customerName: string;
  phone?: string;
  email?: string;
  address?: string;
  statusName: string;
  note?: string;
  createdAt?: string;
  importDate?: string;
  exportDate?: string;
  containerIds?: string[];
  cancellation?: { cancellationId: number; reason?: string; createdAt?: string } | null;
};

type BillItem = {
  billId: number;
  orderId: number;
  billNumber: string;
  createdDate?: string;
  statusName: string;
  note?: string;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING:          'Chờ duyệt',
  APPROVED:         'Chờ check-in',
  WAITING_CHECKIN:  'Chờ check-in',
  LATE_CHECKIN:     'Trễ check-in',
  READY_FOR_IMPORT: 'Chờ nhập kho',
  IMPORTED:         'Đang lưu kho',
  STORED:           'Đang lưu kho',
  EXPORTED:         'Đã xuất',
  REJECTED:         'Từ chối',
  CANCEL_REQUESTED: 'Yêu cầu hủy',
  CANCELLED:        'Đã hủy',
  EDIT_REQUESTED:   'Chờ duyệt sửa',
  EDIT_APPROVED:    'Đã duyệt sửa',
  EDIT_REJECTED:    'Không duyệt sửa',
  DAMAGED:          'Đang hỏng',
  REPAIRED:         'Đã sửa',
};

const STATUS_CLASS: Record<string, string> = {
  PENDING:          'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  APPROVED:         'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  WAITING_CHECKIN:  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
  LATE_CHECKIN:     'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  READY_FOR_IMPORT: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
  IMPORTED:         'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200',
  STORED:           'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  EXPORTED:         'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
  REJECTED:         'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  CANCEL_REQUESTED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  CANCELLED:        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  EDIT_REQUESTED:   'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  EDIT_APPROVED:    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  EDIT_REJECTED:    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  DAMAGED:          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  REPAIRED:         'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
};

export default function Orders() {
  const { accessToken, user } = useWarehouseAuth();
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
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // My containers (for dropdown)
  const [myContainers, setMyContainers] = useState<{ containerId: string }[]>([]);
  const [loadingContainers, setLoadingContainers] = useState(true);

  // Create order
  const [openCreate, setOpenCreate] = useState(false);
  const [createFeePreview, setCreateFeePreview] = useState<{
    totalFee: number; storageDays: number; timeMultiplier: number; weightMultiplier: number;
    containerDetails: { containerId: string; containerTypeName: string; cargoTypeName: string; containerSize: number; grossWeight: number; dailyRate: number; subtotal: number }[];
  } | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    customerName: '', phone: '', email: '', address: '', note: '',
    importDate: '', exportDate: '', containerIds: [] as string[],
  });

  // Edit order (PENDING only)
  const [openEdit, setOpenEdit] = useState(false);
  const [editTarget, setEditTarget] = useState<OrderItem | null>(null);
  const [editForm, setEditForm] = useState({
    customerName: '', phone: '', email: '', address: '', note: '',
    importDate: '', exportDate: '', containerIds: [] as string[],
  });

  // Cancel order
  const [openCancel, setOpenCancel] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<OrderItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // View bill
  const [openBill, setOpenBill] = useState(false);
  const [billData, setBillData] = useState<BillItem | null>(null);
  const [billLoading, setBillLoading] = useState(false);

  // Change export date (STORED orders only)
  const [openExportEdit, setOpenExportEdit] = useState(false);
  const [exportTarget, setExportTarget] = useState<OrderItem | null>(null);
  const [exportNewDate, setExportNewDate] = useState('');
  const [exportPreview, setExportPreview] = useState<{
    fee: number; dayDiff: number; changeType: string; currency: string;
    walletBalanceAfter?: number | null;
  } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState('');

  const fetchOrders = async (p = 0) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${apiUrl}/orders/my?page=${p}&size=20&sortBy=createdAt&direction=desc`,
        { headers },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lấy danh sách đơn hàng');
      setOrders(data.data?.content || []);
      setTotalPages(data.data?.totalPages || 1);
      setTotalElements(data.data?.totalElements || 0);
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  const fetchEligibleContainers = async (orderId?: number) => {
    if (!orderId) setLoadingContainers(true);
    try {
      const url = orderId
        ? `${apiUrl}/admin/containers/my/eligible?orderId=${orderId}&page=0&size=100&sortBy=containerId&direction=asc`
        : `${apiUrl}/admin/containers/my/eligible?page=0&size=100&sortBy=containerId&direction=asc`;
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (res.ok) setMyContainers(data.data?.content || []);
    } catch { /* ignore */ } finally {
      if (!orderId) setLoadingContainers(false);
    }
  };

  useEffect(() => {
    fetchOrders(page);
    fetchEligibleContainers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const filtered = useMemo(() => {
    let list = orders;
    if (statusFilter) list = list.filter((o) => o.statusName === statusFilter);
    const k = keyword.trim().toLowerCase();
    if (k) {
      list = list.filter((o) => 
        `${o.orderId} ${o.customerName} ${o.email ?? ''} ${(o.containerIds || []).join(' ')}`.toLowerCase().includes(k)
      );
    }
    return list;
  }, [orders, keyword, statusFilter]);

  const counts = useMemo(() => ({
    total:    totalElements,
    pending:  orders.filter((o) => ['PENDING', 'WAITING_CHECKIN', 'LATE_CHECKIN', 'READY_FOR_IMPORT'].includes(o.statusName)).length,
    stored:   orders.filter((o) => ['IMPORTED', 'STORED', 'APPROVED'].includes(o.statusName)).length,
    cancelled: orders.filter((o) => ['CANCELLED', 'CANCEL_REQUESTED', 'EDIT_REQUESTED'].includes(o.statusName)).length,
  }), [orders, totalElements]);

  const resetCreateForm = () => {
    setCreateFeePreview(null);
    setCreateForm({
      customerName: user?.name || '',
      phone: '', email: user?.email || '', address: '', note: '',
      importDate: '', exportDate: '', containerIds: [],
    });
  };

  const submitCreate = async () => {
    try {
      if (!createForm.customerName.trim()) return toast.error('Tên khách hàng không được để trống');
      if (!createForm.importDate || !createForm.exportDate) return toast.error('Vui lòng chọn ngày nhập và xuất kho');
      
      setCreateLoading(true);
      const body: Record<string, any> = {
        customerName: createForm.customerName,
        phone: createForm.phone || undefined,
        email: createForm.email || undefined,
        address: createForm.address || undefined,
        note: createForm.note || undefined,
        importDate: createForm.importDate || undefined,
        exportDate: createForm.exportDate || undefined,
        containerIds: createForm.containerIds.length > 0 ? createForm.containerIds : undefined,
      };

      if (createFeePreview === null) {
        // Step 1: Preview fee
        const res = await fetch(`${apiUrl}/orders/preview-fee`, {
          method: 'POST', headers, body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Lỗi tính phí');
        setCreateFeePreview(data.data);
      } else {
        // Step 2: Confirm and create order
        body.confirmPayment = true;
        const res = await fetch(`${apiUrl}/orders`, {
          method: 'POST', headers, body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Lỗi tạo đơn hàng');
        toast.success('Tạo đơn hàng thành công! Số tiền đã được trừ từ ví.');
        setOpenCreate(false);
        resetCreateForm();
        await fetchOrders(page);
      }
    } catch (e: any) {
      toast.error(e.message || 'Lỗi không xác định');
    } finally {
      setCreateLoading(false);
    }
  };

  const openEditDialog = (order: OrderItem) => {
    setEditTarget(order);
    setEditForm({
      customerName: order.customerName || '',
      phone: order.phone || '',
      email: order.email || '',
      address: order.address || '',
      note: order.note || '',
      importDate: order.importDate || '',
      exportDate: order.exportDate || '',
      containerIds: order.containerIds ? [...order.containerIds] : [],
    });
    fetchEligibleContainers(order.orderId);
    setOpenEdit(true);
  };

  const toggleEditContainer = (id: string) => {
    setEditForm((f) => ({
      ...f,
      containerIds: f.containerIds.includes(id)
        ? f.containerIds.filter((c) => c !== id)
        : [...f.containerIds, id],
    }));
  };

  const toggleCreateContainer = (id: string) => {
    setCreateFeePreview(null);
    setCreateForm((f) => ({
      ...f,
      containerIds: f.containerIds.includes(id)
        ? f.containerIds.filter((c) => c !== id)
        : [...f.containerIds, id],
    }));
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    try {
      if (!editForm.customerName.trim()) return toast.error('Tên khách hàng không được để trống');
      const body: Record<string, any> = {
        customerName: editForm.customerName,
        phone: editForm.phone || undefined,
        email: editForm.email || undefined,
        address: editForm.address || undefined,
        note: editForm.note || undefined,
        importDate: editForm.importDate || undefined,
        exportDate: editForm.exportDate || undefined,
        containerIds: editForm.containerIds.length > 0 ? editForm.containerIds : undefined,
      };
      const res = await fetch(`${apiUrl}/orders/${editTarget.orderId}`, {
        method: 'PUT', headers, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật đơn hàng');
      setOpenEdit(false);
      setEditTarget(null);
      await fetchOrders(page);
    } catch (e: any) {
      toast.error(e.message || 'Lỗi không xác định');
    }
  };

  const openCancelDialog = (order: OrderItem) => {
    setCancelTarget(order);
    setCancelReason('');
    setOpenCancel(true);
  };

  const submitCancel = async () => {
    if (!cancelTarget) return;
    try {
      const res = await fetch(`${apiUrl}/orders/${cancelTarget.orderId}/cancel`, {
        method: 'PUT', headers,
        body: JSON.stringify({ reason: cancelReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi hủy đơn hàng');
      setOpenCancel(false);
      setCancelTarget(null);
      await fetchOrders(page);
    } catch (e: any) {
      toast.error(e.message || 'Lỗi không xác định');
    }
  };

  const viewBill = async (order: OrderItem) => {
    setOpenBill(true);
    setBillData(null);
    setBillLoading(true);
    try {
      const res = await fetch(`${apiUrl}/orders/${order.orderId}/bill`, { headers });
      const data = await res.json();
      if (res.ok) {
        setBillData(data.data || null);
      }
    } catch {
      /* network error — leave billData null, dialog stays open showing "no bill" */
    } finally {
      setBillLoading(false);
    }
  };

  const canCancel = (o: OrderItem) =>
    ['PENDING', 'APPROVED', 'WAITING_CHECKIN', 'LATE_CHECKIN', 'READY_FOR_IMPORT'].includes(o.statusName);
  const canEdit   = (o: OrderItem) => o.statusName === 'PENDING';
  const canChangeExport = (o: OrderItem) => o.statusName === 'STORED' || o.statusName === 'IMPORTED';

  const todayISO = new Date().toISOString().split('T')[0];

  const openExportDialog = (order: OrderItem) => {
    setExportTarget(order);
    setExportNewDate(order.exportDate || '');
    setExportPreview(null);
    setExportError('');
    setOpenExportEdit(true);
  };

  useEffect(() => {
    if (!openExportEdit || !exportTarget || !exportNewDate) {
      setExportPreview(null);
      return;
    }
    if (exportNewDate < todayISO) {
      setExportPreview(null);
      return;
    }
    const fetchPreview = async () => {
      try {
        const res = await fetch(`${apiUrl}/orders/${exportTarget.orderId}/export-date`, {
          method: 'PUT', headers,
          body: JSON.stringify({ newExportDate: exportNewDate, confirmPayment: false })
        });
        const data = await res.json();
        if (res.ok && data.data) {
          setExportPreview(data.data);
        } else {
          setExportPreview(null);
        }
      } catch {
        setExportPreview(null);
      }
    };
    const timer = setTimeout(fetchPreview, 400);
    return () => clearTimeout(timer);
  }, [openExportEdit, exportTarget, exportNewDate, headers, apiUrl, todayISO]);

  const submitEditRequest = async () => {
    if (!exportTarget || !exportNewDate) {
      setExportError('Vui lòng chọn ngày xuất mới');
      return;
    }
    if (exportNewDate < todayISO) {
      setExportError('Ngày xuất mới không được sớm hơn hôm nay');
      return;
    }
    if (exportTarget.importDate && exportNewDate < exportTarget.importDate) {
      setExportError('Ngày xuất mới không được sớm hơn ngày nhập kho');
      return;
    }
    setExportError('');
    setExportLoading(true);
    try {
      const res = await fetch(`${apiUrl}/orders/${exportTarget.orderId}/edit-request`, {
        method: 'PUT', headers,
        body: JSON.stringify({ newExportDate: exportNewDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi gửi yêu cầu sửa');
      
      toast.success('Đã gửi yêu cầu đổi ngày xuất kho thành công! Trạng thái: Chờ duyệt sửa.');
      setOpenExportEdit(false);
      setExportTarget(null);
      await fetchOrders(page);
    } catch (e: any) {
      setExportError(e.message || 'Lỗi không xác định');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý đơn hàng</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Theo dõi và quản lý đơn hàng của bạn.</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Button
              className="bg-blue-900 hover:bg-blue-800 text-white disabled:opacity-50"
              onClick={() => { resetCreateForm(); fetchEligibleContainers(); setOpenCreate(true); }}
              disabled={loadingContainers || myContainers.length === 0}
              title={!loadingContainers && myContainers.length === 0 ? 'Bạn cần đăng ký container trước khi tạo đơn hàng' : undefined}
            >
              <Plus className="w-4 h-4 mr-2" />Tạo đơn hàng
            </Button>
            {!loadingContainers && myContainers.length === 0 && (
              <span className="text-xs text-amber-600">Chưa có container khả dụng. Hãy đăng ký container trước.</span>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span className="flex-1">{error}</span>
            <Button size="sm" variant="outline" onClick={() => fetchOrders(page)} disabled={loading}>Thử lại</Button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="pt-5">
            <p className="text-sm text-gray-500">Tổng đơn</p>
            <p className="mt-1 text-3xl font-semibold text-blue-600">{counts.total}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <p className="text-sm text-gray-500">Chờ checkin</p>
            <p className="mt-1 text-3xl font-semibold text-amber-600">{counts.pending}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <p className="text-sm text-gray-500">Đang lưu kho</p>
            <p className="mt-1 text-3xl font-semibold text-green-600">{counts.stored}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <p className="text-sm text-gray-500">Đã hủy / Chờ duyệt sửa</p>
            <p className="mt-1 text-3xl font-semibold text-gray-500">{counts.cancelled}</p>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Danh sách đơn hàng ({filtered.length})</CardTitle>
            <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative sm:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm theo mã đơn, tên khách hàng..."
                  className="pl-9"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200 outline-none focus:border-blue-500"
              >
                <option value="">Tất cả trạng thái</option>
                {Object.entries(STATUS_LABELS)
                  .filter(([k]) => k !== 'READY_FOR_IMPORT')
                  .map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
              </select>
              <Button variant="outline" onClick={() => fetchOrders(page)} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Làm mới
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-gray-500">Đang tải...</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[70px]">Mã đơn</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead>Mã container</TableHead>
                      <TableHead>Ngày nhập / xuất</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((o, idx) => (
                      <TableRow key={o.orderId}>
                        <TableCell className="font-mono text-xs font-semibold">#{o.orderId}</TableCell>
                        <TableCell>
                          <div className="font-semibold">{o.customerName}</div>
                          {o.phone && <div className="text-xs text-gray-600">{o.phone}</div>}
                          {o.email && <div className="text-xs text-gray-500">{o.email}</div>}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500" style={{ maxWidth: 130, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={o.containerIds?.join(', ')}>
                          {o.containerIds?.join(', ') || '—'}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          <div className="text-gray-700" title="Ngày nhập kho">↓ {o.importDate || '—'}</div>
                          <div className="text-gray-700" title="Ngày xuất kho">↑ {o.exportDate || '—'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_CLASS[o.statusName] || 'bg-gray-100 text-gray-600'}>
                            {STATUS_LABELS[o.statusName] || o.statusName}
                          </Badge>
                          {o.statusName === 'LATE_CHECKIN' && (
                            <div className="text-xs text-red-600 mt-1 font-medium">
                              ⚠ Quá hạn check-in. Hủy trong {3} ngày để hoàn tiền.
                            </div>
                          )}
                          {o.cancellation?.reason && (
                            <div className="text-xs text-red-500 mt-1">{o.cancellation.reason}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                          {o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '—'}
                          {o.note && <div className="text-xs text-gray-400 mt-1 max-w-[120px] truncate" title={o.note}>{o.note}</div>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-1">
                            <Button
                              variant="ghost" size="sm"
                              className="text-blue-700 hover:bg-blue-50"
                              onClick={() => viewBill(o)}
                              title="Xem vận đơn"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            {canEdit(o) && (
                              <Button
                                variant="ghost" size="sm"
                                className="text-gray-700 hover:bg-gray-50"
                                onClick={() => openEditDialog(o)}
                                title="Sửa đơn hàng"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            {canChangeExport(o) && (
                              <Button
                                variant="ghost" size="sm"
                                className="text-indigo-700 hover:bg-indigo-50"
                                onClick={() => openExportDialog(o)}
                                title="Sửa ngày xuất kho"
                              >
                                <CalendarClock className="w-4 h-4" />
                              </Button>
                            )}
                            {canCancel(o) && (
                              <Button
                                variant="ghost" size="sm"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => openCancelDialog(o)}
                                title="Hủy đơn"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-500 py-10">
                          Không có đơn hàng phù hợp.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4 pb-20">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Trước</Button>
                    <span className="text-sm text-gray-500">Trang {page + 1} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Sau</Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Create order dialog */}
        <Dialog open={openCreate} onOpenChange={(o) => { setOpenCreate(o); if (!o) resetCreateForm(); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tạo đơn hàng mới</DialogTitle>
              <DialogDescription>Điền thông tin để đặt đơn hàng lưu kho.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-700">Tên khách hàng <span className="text-red-500">*</span></div>
                <Input value={createForm.customerName} onChange={(e) => setCreateForm((f) => ({ ...f, customerName: e.target.value }))} placeholder="Nguyễn Văn A" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-700">Số điện thoại</div>
                  <Input value={createForm.phone} onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))} placeholder="0901234567" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-700">Email</div>
                  <Input type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} placeholder="user@example.com" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-700">Địa chỉ</div>
                <Input value={createForm.address} onChange={(e) => setCreateForm((f) => ({ ...f, address: e.target.value }))} placeholder="123 Đường ABC, TP.HCM" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-700">Ngày nhập kho</div>
                  <Input type="date" value={createForm.importDate} onChange={(e) => { setCreateForm((f) => ({ ...f, importDate: e.target.value })); setCreateFeePreview(null); }} />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-700">Ngày xuất kho</div>
                  <Input type="date" value={createForm.exportDate} onChange={(e) => { setCreateForm((f) => ({ ...f, exportDate: e.target.value })); setCreateFeePreview(null); }} />
                </div>
              </div>
              {myContainers.length > 0 && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-700">Container ({createForm.containerIds.length} đã chọn)</div>
                  <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-1">
                    {myContainers.map((c) => (
                      <label key={c.containerId} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={createForm.containerIds.includes(c.containerId)}
                          onChange={() => toggleCreateContainer(c.containerId)}
                        />
                        <span className="font-mono">{c.containerId}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-700">Ghi chú</div>
                <Input value={createForm.note} onChange={(e) => { setCreateForm((f) => ({ ...f, note: e.target.value })); setCreateFeePreview(null); }} placeholder="Yêu cầu đặc biệt..." />
              </div>
              
              {createFeePreview !== null && (
                <div className="rounded-md border border-indigo-200 bg-indigo-50 p-4 space-y-3 mt-4">
                  <div className="flex justify-between text-lg font-bold text-indigo-800">
                    <span>Tổng phí dự kiến:</span>
                    <span>{Number(createFeePreview.totalFee).toLocaleString('vi-VN')} VND</span>
                  </div>
                  <div className="border-t border-indigo-200 pt-2 space-y-1">
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>📅 Số ngày lưu kho:</span>
                      <span className="font-medium">{createFeePreview.storageDays} ngày</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>⏱️ Hệ số thời gian:</span>
                      <span className="font-medium">×{createFeePreview.timeMultiplier}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>⚖️ Hệ số trọng lượng:</span>
                      <span className="font-medium">×{createFeePreview.weightMultiplier}</span>
                    </div>
                  </div>
                  {createFeePreview.containerDetails && createFeePreview.containerDetails.length > 0 && (
                    <div className="border-t border-indigo-200 pt-2">
                      <div className="text-sm font-semibold text-indigo-700 mb-1">Chi tiết theo container:</div>
                      <div className="space-y-1">
                        {createFeePreview.containerDetails.map((cd, i) => (
                          <div key={i} className="flex justify-between items-center text-xs bg-white rounded px-2 py-1 border border-indigo-100">
                            <div>
                              <span className="font-medium text-gray-800">{cd.containerId}</span>
                              <span className="text-gray-500 ml-1">({cd.containerSize}ft · {cd.cargoTypeName || 'N/A'})</span>
                              {cd.grossWeight > 0 && <span className="text-gray-400 ml-1">· {cd.grossWeight}kg</span>}
                            </div>
                            <div className="text-right">
                              <div className="text-gray-500">{Number(cd.dailyRate).toLocaleString('vi-VN')}/ngày</div>
                              <div className="font-semibold text-indigo-700">{Number(cd.subtotal).toLocaleString('vi-VN')} VND</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="text-xs text-gray-400 pt-1">
                    Công thức: Giá theo biểu phí × Số ngày × Hệ số thời gian × Hệ số trọng lượng
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenCreate(false)} disabled={createLoading}>Hủy</Button>
              {createFeePreview === null ? (
                <Button className="bg-indigo-700 hover:bg-indigo-800 text-white" onClick={submitCreate} disabled={createLoading}>
                  {createLoading ? 'Đang tính...' : 'Xem phí & Thanh toán'}
                </Button>
              ) : (
                <Button className="bg-green-700 hover:bg-green-800 text-white" onClick={submitCreate} disabled={createLoading}>
                  {createLoading ? 'Đang xử lý...' : 'Xác nhận Thanh toán & Tạo đơn'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit order dialog (PENDING only) */}
        <Dialog open={openEdit} onOpenChange={(o) => { setOpenEdit(o); if (!o) setEditTarget(null); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Sửa đơn hàng #{editTarget?.orderId}</DialogTitle>
              <DialogDescription>Chỉ đơn hàng đang chờ duyệt mới có thể chỉnh sửa.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-700">Tên khách hàng <span className="text-red-500">*</span></div>
                <Input value={editForm.customerName} onChange={(e) => setEditForm((f) => ({ ...f, customerName: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-700">Số điện thoại</div>
                  <Input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-700">Email</div>
                  <Input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-700">Địa chỉ</div>
                <Input value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-700">Ngày nhập kho</div>
                  <Input type="date" value={editForm.importDate} onChange={(e) => setEditForm((f) => ({ ...f, importDate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-700">Ngày xuất kho</div>
                  <Input type="date" value={editForm.exportDate} onChange={(e) => setEditForm((f) => ({ ...f, exportDate: e.target.value }))} />
                </div>
              </div>
              {myContainers.length > 0 && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-700">Container ({editForm.containerIds.length} đã chọn)</div>
                  <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-1">
                    {myContainers.map((c) => (
                      <label key={c.containerId} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={editForm.containerIds.includes(c.containerId)}
                          onChange={() => toggleEditContainer(c.containerId)}
                        />
                        <span className="font-mono">{c.containerId}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-700">Ghi chú</div>
                <Input value={editForm.note} onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenEdit(false)}>Hủy</Button>
              <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={submitEdit}>Cập nhật</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel order dialog */}
        <Dialog open={openCancel} onOpenChange={(o) => { setOpenCancel(o); if (!o) setCancelTarget(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Hủy đơn hàng #{cancelTarget?.orderId}</DialogTitle>
              <DialogDescription>Đơn sẽ chuyển sang trạng thái yêu cầu hủy.</DialogDescription>
            </DialogHeader>
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-700">Lý do hủy</div>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do (tuỳ chọn)"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenCancel(false)}>Đóng</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={submitCancel}>Xác nhận hủy</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View bill dialog */}
        <Dialog open={openBill} onOpenChange={(o) => { setOpenBill(o); if (!o) setBillData(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Vận đơn (Bill of Lading)</DialogTitle>
            </DialogHeader>
            {billLoading ? (
              <div className="py-6 text-center text-gray-500">Đang tải vận đơn...</div>
            ) : billData ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Số vận đơn:</span> <span className="font-semibold font-mono">{billData.billNumber}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Mã đơn hàng:</span> <span>#{billData.orderId}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Ngày cấp:</span> <span>{billData.createdDate || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Trạng thái:</span>
                  <Badge className={billData.statusName === 'ISSUED' ? 'bg-green-100 text-green-800' : billData.statusName === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}>
                    {billData.statusName}
                  </Badge>
                </div>
                {billData.note && <div className="flex justify-between"><span className="text-gray-500">Ghi chú:</span> <span>{billData.note}</span></div>}
              </div>
            ) : (
              <div className="py-6 text-center text-gray-500">Đơn hàng này chưa có vận đơn.</div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenBill(false)}>Đóng</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change export date dialog (STORED orders only) */}
        <Dialog open={openExportEdit} onOpenChange={(o) => {
          setOpenExportEdit(o);
          if (!o) { setExportTarget(null); setExportError(''); }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Yêu cầu đổi ngày xuất kho — Đơn #{exportTarget?.orderId}</DialogTitle>
              <DialogDescription>
                Ngày mới phải lớn hơn hoặc bằng hôm nay và ngày nhập kho. Trạng thái đơn hàng sẽ chuyển thành "Chờ duyệt sửa".
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-gray-500">Ngày nhập:</div>
                  <div className="font-medium">{exportTarget?.importDate || '—'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Ngày xuất hiện tại:</div>
                  <div className="font-medium">{exportTarget?.exportDate || '—'}</div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-700">Ngày xuất mới mong muốn</div>
                <Input
                  type="date"
                  value={exportNewDate}
                  min={exportTarget?.importDate && exportTarget.importDate > todayISO ? exportTarget.importDate : todayISO}
                  onChange={(e) => { setExportNewDate(e.target.value); }}
                />
              </div>
              
              {exportPreview && exportPreview.fee > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg p-3 text-amber-800 dark:text-amber-300">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">
                      {exportPreview.changeType === 'LATE' ? 'Phí gia hạn thêm' : 'Phí xuất sớm'}
                    </span>
                    <span className="font-bold">
                      {exportPreview.fee.toLocaleString('vi-VN')} {exportPreview.currency || 'VND'}
                    </span>
                  </div>
                  <p className="text-xs opacity-80">
                    Phí này sẽ được trừ trực tiếp vào ví của bạn khi gửi yêu cầu. Nếu Admin từ chối, số tiền sẽ được hoàn lại.
                  </p>
                </div>
              )}
              {exportError && (
                <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{exportError}</div>
              )}
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setOpenExportEdit(false)} disabled={exportLoading}>Hủy</Button>
              <Button className="bg-indigo-700 hover:bg-indigo-800 text-white" onClick={submitEditRequest} disabled={exportLoading}>
                {exportLoading ? 'Đang gửi...' : (exportPreview && exportPreview.fee > 0 ? 'Thanh toán & gửi yêu cầu' : 'Gửi yêu cầu đổi ngày')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </WarehouseLayout>
  );
}
