import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, FileText, LogOut, Plus } from 'lucide-react';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../../components/ui/dialog';
import { useWarehouseAuth, API_BASE } from '../../../../contexts/WarehouseAuthContext';

type GateOutItem = {
  gateOutId: number;
  containerId: string;
  gateOutTime?: string;
  createdByUsername?: string;
  note?: string;
};

type StorageBill = {
  containerId: string;
  yardName?: string;
  storageStartDate?: string;
  storageEndDate?: string;
  storageDays?: number;
  dailyRate?: number;
  baseFee?: number;
  overduePenalty?: number;
  totalFee?: number;
  isOverdue?: boolean;
  overdueDays?: number;
};

type Invoice = {
  invoiceId: number;
  containerId: string;
  gateOutId: number;
  storageDays?: number;
  dailyRate?: number;
  baseFee?: number;
  overduePenalty?: number;
  totalFee?: number;
  isOverdue?: boolean;
  overdueDays?: number;
  createdAt?: string;
};

const PAGE_SIZE = 20;

const fmtMoney = (val?: number) =>
  val != null ? val.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }) : '—';

export default function AdminGateOutSection() {
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
  const [items, setItems] = useState<GateOutItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ containerId: '', note: '' });
  const [billPreview, setBillPreview] = useState<StorageBill | null>(null);
  const [billLoading, setBillLoading] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [selectedGateOut, setSelectedGateOut] = useState<GateOutItem | null>(null);

  const fetchItems = async (p = page) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(p),
        size: String(PAGE_SIZE),
        sortBy: 'gateOutTime',
        direction: 'desc',
      });
      const res = await fetch(`${API_BASE}/admin/gate-out?${params}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tải danh sách gate-out');
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
    fetchItems(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setForm({ containerId: '', note: '' });
    setBillPreview(null);
    setShowCreate(true);
  };

  const fetchBillPreview = async () => {
    const cid = form.containerId.trim();
    if (!cid) return alert('Nhập Container ID trước');
    setBillLoading(true);
    setBillPreview(null);
    try {
      const res = await fetch(`${API_BASE}/admin/containers/${cid}/storage-bill`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không tìm thấy thông tin lưu kho');
      setBillPreview(data.data);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBillLoading(false);
    }
  };

  const submitGateOut = async () => {
    const cid = form.containerId.trim();
    if (!cid) return alert('Container ID là bắt buộc');
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { containerId: cid };
      if (form.note) body.note = form.note;
      const res = await fetch(`${API_BASE}/admin/gate-out`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi xử lý gate-out');
      setShowCreate(false);
      fetchItems(0);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openInvoice = async (item: GateOutItem) => {
    setSelectedGateOut(item);
    setInvoice(null);
    setShowInvoice(true);
    setInvoiceLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/gate-out/${item.gateOutId}/invoice`, { headers });
      const data = await res.json();
      if (res.ok) setInvoice(data.data);
    } catch {
      // ignore
    } finally {
      setInvoiceLoading(false);
    }
  };

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gate-Out</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Xử lý xuất cổng container và xem hóa đơn lưu kho.</p>
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
              <LogOut className="w-5 h-5 text-orange-600" />
              Danh sách gate-out
            </CardTitle>
            <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:justify-between">
              <Button variant="outline" onClick={() => fetchItems(page)} disabled={loading}>Làm mới</Button>
              <Button className="bg-orange-700 hover:bg-orange-600 text-white" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" />Xử lý gate-out
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Container ID</TableHead>
                  <TableHead>Thời gian gate-out</TableHead>
                  <TableHead>Người tạo</TableHead>
                  <TableHead>Ghi chú</TableHead>
                  <TableHead className="text-right">Hóa đơn</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-gray-500">Đang tải...</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-gray-500">Không có dữ liệu</TableCell></TableRow>
                ) : items.map((item) => (
                  <TableRow key={item.gateOutId}>
                    <TableCell className="text-gray-500 text-sm">{item.gateOutId}</TableCell>
                    <TableCell className="font-mono font-semibold">{item.containerId}</TableCell>
                    <TableCell>{item.gateOutTime ? new Date(item.gateOutTime).toLocaleString('vi-VN') : '—'}</TableCell>
                    <TableCell>{item.createdByUsername || '—'}</TableCell>
                    <TableCell className="text-gray-500">{item.note || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openInvoice(item)} title="Xem hóa đơn">
                        <FileText className="w-4 h-4" />
                      </Button>
                    </TableCell>
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

      {/* Gate-Out Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Xử lý Gate-Out</DialogTitle>
            <DialogDescription>Nhập Container ID để xác nhận xuất cổng.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Container ID *</label>
              <div className="flex gap-2">
                <Input
                  value={form.containerId}
                  onChange={(e) => setForm((f) => ({ ...f, containerId: e.target.value }))}
                  placeholder="VD: ABCU1234567"
                  className="flex-1"
                />
                <Button variant="outline" onClick={fetchBillPreview} disabled={billLoading}>
                  {billLoading ? '...' : 'Xem phí'}
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Ghi chú</label>
              <Input
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>

            {billPreview && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-4 space-y-1 text-sm">
                <div className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Chi phí lưu kho</div>
                <div className="flex justify-between"><span className="text-gray-600">Bãi:</span><span>{billPreview.yardName || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Ngày bắt đầu:</span><span>{billPreview.storageStartDate ? new Date(billPreview.storageStartDate).toLocaleDateString('vi-VN') : '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Số ngày lưu:</span><span>{billPreview.storageDays ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Đơn giá/ngày:</span><span>{fmtMoney(billPreview.dailyRate)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Phí cơ bản:</span><span>{fmtMoney(billPreview.baseFee)}</span></div>
                {billPreview.isOverdue && (
                  <div className="flex justify-between text-red-600"><span>Phạt quá hạn ({billPreview.overdueDays} ngày):</span><span>{fmtMoney(billPreview.overduePenalty)}</span></div>
                )}
                <div className="flex justify-between font-bold border-t pt-1 mt-1">
                  <span>Tổng cộng:</span><span>{fmtMoney(billPreview.totalFee)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button className="bg-orange-700 hover:bg-orange-600 text-white" onClick={submitGateOut} disabled={submitting}>
              {submitting ? 'Đang xử lý...' : 'Xác nhận Gate-Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hóa đơn lưu kho</DialogTitle>
            <DialogDescription>Container: {selectedGateOut?.containerId}</DialogDescription>
          </DialogHeader>
          {invoiceLoading ? (
            <div className="text-center py-6 text-gray-500">Đang tải...</div>
          ) : !invoice ? (
            <div className="text-center py-6 text-gray-500">Không tìm thấy hóa đơn</div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Invoice ID:</span><span className="font-mono">{invoice.invoiceId}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Container ID:</span><span className="font-mono">{invoice.containerId}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Số ngày lưu:</span><span>{invoice.storageDays ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Đơn giá/ngày:</span><span>{fmtMoney(invoice.dailyRate)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Phí cơ bản:</span><span>{fmtMoney(invoice.baseFee)}</span></div>
              {invoice.isOverdue && (
                <div className="flex justify-between text-red-600">
                  <span>Phạt quá hạn ({invoice.overdueDays} ngày):</span>
                  <span>{fmtMoney(invoice.overduePenalty)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t pt-2 text-base">
                <span>Tổng cộng:</span><span>{fmtMoney(invoice.totalFee)}</span>
              </div>
              <div className="flex justify-between text-gray-400 text-xs mt-1">
                <span>Ngày tạo:</span><span>{invoice.createdAt ? new Date(invoice.createdAt).toLocaleString('vi-VN') : '—'}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoice(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Storage Bill Preview standalone dialog (triggered from within create dialog) */}
      <Dialog open={showBillPreview} onOpenChange={setShowBillPreview}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Chi phí lưu kho</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBillPreview(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WarehouseLayout>
  );
}
