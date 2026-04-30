import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, RefreshCw, Search, XCircle } from 'lucide-react';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Badge } from '../../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { useWarehouseAuth, API_BASE } from '../../../../contexts/WarehouseAuthContext';

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

type BillHistoryItem = {
  historyId: number;
  statusName: string;
  description?: string;
  createdAt?: string;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING:          'Chờ duyệt',
  APPROVED:         'Chờ checkin',
  WAITING_CHECKIN:  'Chờ nhập kho',
  LATE_CHECKIN:     'Trễ checkin',
  READY_FOR_IMPORT: 'Chờ nhập kho',
  IMPORTED:         'Đã nhập kho',
  STORED:           'Đã nhập kho',
  EXPORTED:         'Đã xuất',
  REJECTED:         'Từ chối',
  CANCEL_REQUESTED: 'Duyệt sửa',
  CANCELLED:        'Đã hủy',
};

const STATUS_CLASS: Record<string, string> = {
  PENDING:          'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  APPROVED:         'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  REJECTED:         'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  CANCEL_REQUESTED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  CANCELLED:        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const ALL_STATUSES = Object.keys(STATUS_LABELS);
const BILL_STATUSES = ['DRAFT', 'ISSUED', 'CANCELLED'];

export default function AdminOrdersSection() {
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
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Reject dialog
  const [openReject, setOpenReject] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<OrderItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Change status dialog
  const [openStatus, setOpenStatus] = useState(false);
  const [statusTarget, setStatusTarget] = useState<OrderItem | null>(null);
  const [newStatusName, setNewStatusName] = useState('');

  // Bill dialog
  const [openBill, setOpenBill] = useState(false);
  const [billTarget, setBillTarget] = useState<OrderItem | null>(null);
  const [billData, setBillData] = useState<BillItem | null>(null);
  const [billHistory, setBillHistory] = useState<BillHistoryItem[]>([]);
  const [billLoading, setBillLoading] = useState(false);
  const [billNote, setBillNote] = useState('');
  const [billStatusName, setBillStatusName] = useState('ISSUED');
  const [billStatusDesc, setBillStatusDesc] = useState('');

  const fetchOrders = async (p = 0, status = statusFilter, kw = keyword) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(p),
        size: '20',
        sortBy: 'createdAt',
        direction: 'desc',
      });
      if (status) params.set('statusName', status);
      if (kw.trim()) params.set('keyword', kw.trim());
      const res = await fetch(`${apiUrl}/admin/orders?${params}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lấy danh sách đơn hàng');
      setOrders(data.data?.content || []);
      setTotalPages(data.data?.totalPages || 1);
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(page, statusFilter, keyword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const counts = useMemo(() => ({
    total:   orders.length,
    pending: orders.filter((o) => o.statusName === 'PENDING').length,
    approved: orders.filter((o) => o.statusName === 'APPROVED').length,
    cancelled: orders.filter((o) => ['CANCELLED','CANCEL_REQUESTED'].includes(o.statusName)).length,
  }), [orders]);

  // ---- Actions ----

  const approveOrder = async (o: OrderItem) => {
    if (!confirm(`Duyệt đơn hàng #${o.orderId}?`)) return;
    try {
      const res = await fetch(`${apiUrl}/admin/orders/${o.orderId}/approve`, { method: 'PUT', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi duyệt đơn');
      await fetchOrders(page);
    } catch (e: any) { alert(e.message); }
  };

  const openRejectDialog = (o: OrderItem) => {
    setRejectTarget(o);
    setRejectReason('');
    setOpenReject(true);
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    try {
      const res = await fetch(`${apiUrl}/admin/orders/${rejectTarget.orderId}/reject`, {
        method: 'PUT', headers,
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi từ chối đơn');
      setOpenReject(false);
      setRejectTarget(null);
      await fetchOrders(page);
    } catch (e: any) { alert(e.message); }
  };

  const openStatusDialog = (o: OrderItem) => {
    setStatusTarget(o);
    setNewStatusName(o.statusName);
    setOpenStatus(true);
  };

  const submitStatus = async () => {
    if (!statusTarget || !newStatusName) return;
    try {
      const res = await fetch(`${apiUrl}/admin/orders/${statusTarget.orderId}/status`, {
        method: 'PUT', headers,
        body: JSON.stringify({ statusName: newStatusName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật trạng thái');
      setOpenStatus(false);
      setStatusTarget(null);
      await fetchOrders(page);
    } catch (e: any) { alert(e.message); }
  };

  // ---- Bill of Lading ----

  const openBillDialog = async (o: OrderItem) => {
    setBillTarget(o);
    setBillData(null);
    setBillHistory([]);
    setBillNote('');
    setBillStatusName('ISSUED');
    setBillStatusDesc('');
    setOpenBill(true);
    setBillLoading(true);
    try {
      const res = await fetch(`${apiUrl}/orders/${o.orderId}/bill`, { headers });
      const data = await res.json();
      if (res.ok && data.data) {
        const bill: BillItem = data.data;
        setBillData(bill);
        // fetch history
        const hRes = await fetch(`${apiUrl}/admin/bills/${bill.billId}/history`, { headers });
        const hData = await hRes.json();
        if (hRes.ok) setBillHistory(hData.data || []);
      }
    } catch {
      // no bill yet — that's fine
    } finally {
      setBillLoading(false);
    }
  };

  const createBill = async () => {
    if (!billTarget) return;
    try {
      const res = await fetch(`${apiUrl}/admin/orders/${billTarget.orderId}/bill`, {
        method: 'POST', headers,
        body: JSON.stringify({ note: billNote || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tạo vận đơn');
      setBillData(data.data);
      alert('Tạo vận đơn thành công');
    } catch (e: any) { alert(e.message); }
  };

  const updateBillStatus = async () => {
    if (!billData) return;
    try {
      const res = await fetch(`${apiUrl}/admin/bills/${billData.billId}/status`, {
        method: 'PUT', headers,
        body: JSON.stringify({ statusName: billStatusName, description: billStatusDesc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật trạng thái vận đơn');
      setBillData(data.data);
      // refresh history
      const hRes = await fetch(`${apiUrl}/admin/bills/${billData.billId}/history`, { headers });
      const hData = await hRes.json();
      if (hRes.ok) setBillHistory(hData.data || []);
      alert('Cập nhật vận đơn thành công');
    } catch (e: any) { alert(e.message); }
  };

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý đơn hàng</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Duyệt, từ chối và quản lý trạng thái đơn hàng.</p>
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
            <p className="text-sm text-gray-500">Trên trang</p>
            <p className="mt-1 text-3xl font-semibold text-blue-600">{counts.total}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <p className="text-sm text-gray-500">Chờ duyệt</p>
            <p className="mt-1 text-3xl font-semibold text-amber-600">{counts.pending}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <p className="text-sm text-gray-500">Chờ checkin</p>
            <p className="mt-1 text-3xl font-semibold text-green-600">{counts.approved}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <p className="text-sm text-gray-500">Đã hủy/Duyệt sửa</p>
            <p className="mt-1 text-3xl font-semibold text-gray-500">{counts.cancelled}</p>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Danh sách đơn hàng</CardTitle>
            <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative sm:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchOrders(0, statusFilter, keyword)}
                  placeholder="Tìm tên khách hàng, email... (Enter để tìm)"
                  className="pl-9"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200 outline-none focus:border-blue-500"
              >
                <option value="">Tất cả trạng thái</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
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
                      <TableHead className="w-[70px]">Mã</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead>Liên hệ</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      <TableHead>Containers</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o, idx) => (
                      <TableRow key={o.orderId}>
                        <TableCell className="font-mono text-xs font-semibold">#{idx + 1}</TableCell>
                        <TableCell>
                          <div className="font-semibold">{o.customerName}</div>
                          {o.address && <div className="text-xs text-gray-500">{o.address}</div>}
                          {o.cancellation?.reason && (
                            <div className="text-xs text-red-500">Lý do hủy: {o.cancellation.reason}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          <div>{o.phone || '—'}</div>
                          <div className="text-xs">{o.email || ''}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_CLASS[o.statusName] || 'bg-gray-100 text-gray-600'}>
                            {STATUS_LABELS[o.statusName] || o.statusName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                          {o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {o.containerIds?.length ? o.containerIds.slice(0, 3).join(', ') + (o.containerIds.length > 3 ? '…' : '') : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-1">
                            {o.statusName === 'PENDING' && (
                              <>
                                <Button
                                  variant="ghost" size="sm"
                                  className="text-green-700 hover:bg-green-50"
                                  title="Duyệt"
                                  onClick={() => approveOrder(o)}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost" size="sm"
                                  className="text-red-600 hover:bg-red-50"
                                  title="Từ chối"
                                  onClick={() => openRejectDialog(o)}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost" size="sm"
                              className="text-purple-700 hover:bg-purple-50"
                              title="Cập nhật trạng thái"
                              onClick={() => openStatusDialog(o)}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="text-blue-700 hover:bg-blue-50"
                              title="Vận đơn"
                              onClick={() => openBillDialog(o)}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {orders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-500 py-10">
                          Không có đơn hàng phù hợp.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Trước</Button>
                    <span className="text-sm text-gray-500">Trang {page + 1} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Sau</Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Reject dialog */}
        <Dialog open={openReject} onOpenChange={(o) => { setOpenReject(o); if (!o) setRejectTarget(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Từ chối đơn #{rejectTarget?.orderId}</DialogTitle>
              <DialogDescription>Nhập lý do từ chối (tuỳ chọn).</DialogDescription>
            </DialogHeader>
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-700">Lý do</div>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối..."
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenReject(false)}>Hủy</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={submitReject}>Từ chối</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change status dialog */}
        <Dialog open={openStatus} onOpenChange={(o) => { setOpenStatus(o); if (!o) setStatusTarget(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Cập nhật trạng thái đơn #{statusTarget?.orderId}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Trạng thái mới</div>
              <Select value={newStatusName} onValueChange={setNewStatusName}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenStatus(false)}>Hủy</Button>
              <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={submitStatus}>Lưu</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bill of Lading dialog */}
        <Dialog open={openBill} onOpenChange={(o) => { setOpenBill(o); if (!o) { setBillTarget(null); setBillData(null); setBillHistory([]); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Vận đơn — Đơn #{billTarget?.orderId}</DialogTitle>
              <DialogDescription>{billTarget?.customerName}</DialogDescription>
            </DialogHeader>
            {billLoading ? (
              <div className="py-6 text-center text-gray-500">Đang tải...</div>
            ) : (
              <div className="space-y-4">
                {billData ? (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Số vận đơn:</span>
                      <span className="font-mono font-semibold">{billData.billNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ngày cấp:</span>
                      <span>{billData.createdDate || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Trạng thái:</span>
                      <Badge className={billData.statusName === 'ISSUED' ? 'bg-green-100 text-green-800' : billData.statusName === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}>
                        {billData.statusName}
                      </Badge>
                    </div>
                    {billData.note && <div className="flex justify-between"><span className="text-gray-500">Ghi chú:</span><span>{billData.note}</span></div>}

                    {/* Update bill status */}
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                      <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Cập nhật trạng thái vận đơn</div>
                      <div className="flex gap-2">
                        <Select value={billStatusName} onValueChange={setBillStatusName}>
                          <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {BILL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input
                          value={billStatusDesc}
                          onChange={(e) => setBillStatusDesc(e.target.value)}
                          placeholder="Mô tả..."
                          className="flex-1"
                        />
                        <Button size="sm" className="bg-blue-900 hover:bg-blue-800 text-white" onClick={updateBillStatus}>
                          Lưu
                        </Button>
                      </div>
                    </div>

                    {/* History */}
                    {billHistory.length > 0 && (
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">Lịch sử vận đơn</div>
                        <div className="space-y-1">
                          {billHistory.map((h) => (
                            <div key={h.historyId} className="flex items-start gap-2 text-xs">
                              <Badge className="text-xs bg-gray-100 text-gray-600 shrink-0">{h.statusName}</Badge>
                              <span className="text-gray-600">{h.description || '—'}</span>
                              <span className="ml-auto text-gray-400 whitespace-nowrap">
                                {h.createdAt ? new Date(h.createdAt).toLocaleDateString('vi-VN') : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-500">Chưa có vận đơn cho đơn hàng này. Tạo mới:</div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-700">Ghi chú vận đơn</div>
                      <Input
                        value={billNote}
                        onChange={(e) => setBillNote(e.target.value)}
                        placeholder="Ghi chú (tuỳ chọn)"
                      />
                    </div>
                    <Button className="w-full bg-blue-900 hover:bg-blue-800 text-white" onClick={createBill}>
                      Tạo vận đơn
                    </Button>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenBill(false)}>Đóng</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </WarehouseLayout>
  );
}
