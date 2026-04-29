import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, LogIn, Plus } from 'lucide-react';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { useWarehouseAuth, API_BASE } from '../../../../contexts/WarehouseAuthContext';

type GateInItem = {
  gateInId: number;
  containerId: string;
  voyageId?: number;
  voyageNo?: string;
  gateInTime?: string;
  createdByUsername?: string;
  note?: string;
};

type YardItem = { yardId: number; yardName: string };

type ApprovedOrder = {
  orderId: number;
  customerName: string;
  containerIds: string[];
  exportDate?: string;
};

const PAGE_SIZE = 20;

export default function AdminGateInSection() {
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
  const [items, setItems] = useState<GateInItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [yards, setYards] = useState<YardItem[]>([]);
  const [approvedOrders, setApprovedOrders] = useState<ApprovedOrder[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    containerId: '',
    yardId: '',
    voyageId: '',
    note: '',
  });
  const [orderExportDate, setOrderExportDate] = useState<string | null>(null);
  const [orderValidationError, setOrderValidationError] = useState<string | null>(null);

  const fetchYards = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/yards`, { headers });
      const data = await res.json();
      if (res.ok) setYards(data.data || []);
    } catch {
      // ignore
    }
  };

  const fetchItems = async (p = page) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(p),
        size: String(PAGE_SIZE),
        sortBy: 'gateInTime',
        direction: 'desc',
      });
      const res = await fetch(`${API_BASE}/admin/gate-in?${params}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tải danh sách gate-in');
      setItems(data.data?.content || []);
      setTotalPages(data.data?.totalPages || 1);
      setPage(p);
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedOrders = async () => {
    try {
      // "Chờ nhập kho" = WAITING_CHECKIN. LATE_CHECKIN orders are still
      // valid for gate-in. READY_FOR_IMPORT kept for backward-compat.
      const statuses = ['WAITING_CHECKIN', 'LATE_CHECKIN', 'READY_FOR_IMPORT'];
      const responses = await Promise.all(
        statuses.map((s) =>
          fetch(`${API_BASE}/admin/orders?statusName=${s}&size=100&page=0`, { headers })
            .then((r) => (r.ok ? r.json() : { data: { content: [] } }))
            .catch(() => ({ data: { content: [] } })),
        ),
      );
      const merged = responses.flatMap((d) => d.data?.content || []);
      setApprovedOrders(merged.filter((o: ApprovedOrder) => o.containerIds?.length > 0));
    } catch {
      // ignore — manual input still available
    }
  };

  useEffect(() => {
    fetchYards();
    fetchItems(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setForm({ containerId: '', yardId: '', voyageId: '', note: '' });
    setOrderExportDate(null);
    setOrderValidationError(null);
    fetchApprovedOrders();
    setShowCreate(true);
  };

  const handleOrderSelect = (orderId: string) => {
    if (!orderId) {
      setForm((f) => ({ ...f, containerId: '' }));
      setOrderExportDate(null);
      setOrderValidationError(null);
      return;
    }
    const order = approvedOrders.find((o) => String(o.orderId) === orderId);
    if (!order) return;
    setForm((f) => ({ ...f, containerId: order.containerIds[0] ?? '' }));
    setOrderExportDate(order.exportDate ?? null);
    setOrderValidationError(null);
  };

  const VALID_IMPORT_STATUSES = ['READY_FOR_IMPORT', 'WAITING_CHECKIN', 'LATE_CHECKIN', 'APPROVED'];

  const lookupOrderExportDate = async (containerId: string) => {
    const cid = containerId.trim();
    if (!cid) { setOrderExportDate(null); setOrderValidationError(null); return; }
    try {
      const res = await fetch(`${API_BASE}/admin/orders/by-container/${encodeURIComponent(cid)}`, { headers });
      const data = await res.json();
      if (!res.ok || !data.data) {
        setOrderExportDate(null);
        setOrderValidationError(`Container "${cid}" chưa có đơn hàng hợp lệ. Khách hàng phải tạo đơn hàng và được duyệt trước khi nhập kho.`);
        return;
      }
      const orderStatus = String(data.data.statusName ?? '').toUpperCase();
      if (!VALID_IMPORT_STATUSES.includes(orderStatus)) {
        setOrderExportDate(null);
        setOrderValidationError(`Đơn hàng #${data.data.orderId} chưa được duyệt (trạng thái: ${orderStatus}). Chỉ nhập kho khi đơn hàng đã APPROVED.`);
        return;
      }
      setOrderValidationError(null);
      if (data.data?.exportDate) {
        setOrderExportDate(String(data.data.exportDate));
      } else {
        setOrderExportDate(null);
      }
    } catch {
      setOrderExportDate(null);
      setOrderValidationError(null);
    }
  };

  const submitCreate = async () => {
    if (!form.containerId.trim()) return alert('Container ID là bắt buộc');
    if (!form.yardId) return alert('Bãi chứa là bắt buộc');
    if (orderValidationError) return alert(orderValidationError);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        containerId: form.containerId.trim(),
        yardId: Number(form.yardId),
      };
      if (form.voyageId) body.voyageId = Number(form.voyageId);
      if (form.note) body.note = form.note;

      const res = await fetch(`${API_BASE}/admin/gate-in`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi xử lý gate-in');
      setShowCreate(false);
      fetchItems(0);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gate-In</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Xử lý nhập cổng container và xem danh sách biên lai gate-in.</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <Button size="sm" variant="outline" onClick={() => fetchItems(page)} disabled={loading}>Thử lại</Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="w-5 h-5 text-blue-600" />
              Danh sách gate-in
            </CardTitle>
            <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:justify-between">
              <Button variant="outline" onClick={() => fetchItems(page)} disabled={loading}>Làm mới</Button>
              <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" />Xử lý gate-in
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Container ID</TableHead>
                  <TableHead>Chuyến tàu</TableHead>
                  <TableHead>Thời gian gate-in</TableHead>
                  <TableHead>Người tạo</TableHead>
                  <TableHead>Ghi chú</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-gray-500">Đang tải...</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-gray-500">Không có dữ liệu</TableCell></TableRow>
                ) : items.map((item) => (
                  <TableRow key={item.gateInId}>
                    <TableCell className="text-gray-500 text-sm">{item.gateInId}</TableCell>
                    <TableCell className="font-mono font-semibold">{item.containerId}</TableCell>
                    <TableCell>{item.voyageNo || (item.voyageId ? `#${item.voyageId}` : '—')}</TableCell>
                    <TableCell>{item.gateInTime ? new Date(item.gateInTime).toLocaleString('vi-VN') : '—'}</TableCell>
                    <TableCell>{item.createdByUsername || '—'}</TableCell>
                    <TableCell className="text-gray-500">{item.note || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => fetchItems(page - 1)} disabled={page === 0 || loading}>Trước</Button>
                <span className="text-sm text-gray-600">Trang {page + 1} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => fetchItems(page + 1)} disabled={page >= totalPages - 1 || loading}>Sau</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gate-In Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Xử lý Gate-In</DialogTitle>
            <DialogDescription>Nhập thông tin để xác nhận container vào cổng.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {approvedOrders.length > 0 && (
              <div>
                <label className="text-sm font-medium">Chọn từ đơn đã duyệt</label>
                <Select onValueChange={handleOrderSelect}>
                  <SelectTrigger><SelectValue placeholder="-- Chọn đơn hàng APPROVED --" /></SelectTrigger>
                  <SelectContent>
                    {approvedOrders.map((o) => (
                      <SelectItem key={o.orderId} value={String(o.orderId)}>
                        {o.containerIds.slice(0, 2).join(', ')}{o.containerIds.length > 2 ? '…' : ''} — {o.customerName}
                        {o.exportDate ? ` — Xuất: ${o.exportDate}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Container ID *</label>
              <Input
                value={form.containerId}
                onChange={(e) => { setForm((f) => ({ ...f, containerId: e.target.value })); setOrderValidationError(null); }}
                onBlur={(e) => lookupOrderExportDate(e.target.value)}
                placeholder="VD: ABCU1234567"
              />
              {orderValidationError && (
                <p className="text-xs text-red-600 mt-1">{orderValidationError}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Ngày xuất (dự kiến)</label>
              <Input
                type="date"
                value={orderExportDate ?? ''}
                onChange={(e) => setOrderExportDate(e.target.value || null)}
                placeholder="Tự động điền từ đơn hàng"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Bãi chứa *</label>
              <Select value={form.yardId} onValueChange={(v) => setForm((f) => ({ ...f, yardId: v }))}>
                <SelectTrigger><SelectValue placeholder="Chọn bãi..." /></SelectTrigger>
                <SelectContent>
                  {yards.map((y) => (
                    <SelectItem key={y.yardId} value={String(y.yardId)}>{y.yardName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Voyage ID (tùy chọn)</label>
              <Input
                type="number"
                value={form.voyageId}
                onChange={(e) => setForm((f) => ({ ...f, voyageId: e.target.value }))}
                placeholder="ID chuyến tàu"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Ghi chú</label>
              <Input
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={submitCreate} disabled={submitting}>
              {submitting ? 'Đang xử lý...' : 'Xác nhận Gate-In'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WarehouseLayout>
  );
}
