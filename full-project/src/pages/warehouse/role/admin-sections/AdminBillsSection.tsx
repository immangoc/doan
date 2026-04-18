import { useMemo, useState } from 'react';
import { AlertCircle, Clock, FileText, Plus, RefreshCw } from 'lucide-react';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Badge } from '../../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { useWarehouseAuth, API_BASE } from '../../../../contexts/WarehouseAuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────
type BillItem = {
  billId: number;
  orderId: number;
  billNumber: string;
  createdDate?: string;
  statusName: string;
  note?: string;
};

type HistoryItem = {
  historyId: number;
  statusName: string;
  description?: string;
  createdAt?: string;
};

const BILL_STATUSES = ['DRAFT', 'ISSUED', 'CANCELLED'];

const STATUS_CLASS: Record<string, string> = {
  DRAFT:     'bg-yellow-100 text-yellow-700',
  ISSUED:    'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-200 text-gray-500',
};

export default function AdminBillsSection() {
  const { accessToken } = useWarehouseAuth();
  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    [accessToken],
  );

  // Search state
  const [orderIdInput, setOrderIdInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [bill, setBill] = useState<BillItem | null>(null);
  const [noOrderId, setNoOrderId] = useState(false);

  // Dialogs
  const [showCreate, setShowCreate] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [createForm, setCreateForm] = useState({ billNumber: '', note: '' });
  const [statusForm, setStatusForm] = useState({ statusName: '', description: '' });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── Fetch bill for order ────────────────────────────────────────────────
  const searchBill = async () => {
    const oid = orderIdInput.trim();
    if (!oid || isNaN(Number(oid))) return alert('Nhập Order ID hợp lệ');
    setSearching(true);
    setSearchError('');
    setBill(null);
    setNoOrderId(false);
    try {
      const res  = await fetch(`${API_BASE}/orders/${oid}/bill`, { headers });
      const data = await res.json();
      if (res.status === 404) { setNoOrderId(true); return; }
      if (!res.ok) throw new Error(data.message || 'Lỗi tải vận đơn');
      setBill(data.data);
    } catch (e: any) {
      setSearchError(e.message || 'Lỗi không xác định');
    } finally {
      setSearching(false);
    }
  };

  // ── Fetch history ───────────────────────────────────────────────────────
  const openHistory = async () => {
    if (!bill) return;
    setHistory([]);
    setShowHistory(true);
    setHistoryLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/admin/bills/${bill.billId}/history`, { headers });
      const data = await res.json();
      if (res.ok) setHistory(data.data || []);
    } catch { /* ignore */ }
    finally { setHistoryLoading(false); }
  };

  // ── Create bill ─────────────────────────────────────────────────────────
  const submitCreate = async () => {
    const oid = orderIdInput.trim();
    if (!oid) return;
    setSubmitting(true);
    const body: Record<string, string> = {};
    if (createForm.billNumber) body.billNumber = createForm.billNumber;
    if (createForm.note) body.note = createForm.note;
    try {
      const res  = await fetch(`${API_BASE}/admin/orders/${oid}/bill`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tạo vận đơn');
      setBill(data.data);
      setNoOrderId(false);
      setShowCreate(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Update bill status ──────────────────────────────────────────────────
  const submitStatus = async () => {
    if (!bill || !statusForm.statusName) return alert('Chọn trạng thái mới');
    setSubmitting(true);
    try {
      const res  = await fetch(`${API_BASE}/admin/bills/${bill.billId}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ statusName: statusForm.statusName, description: statusForm.description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật trạng thái');
      setBill(data.data);
      setShowStatus(false);
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Vận đơn (Bill of Lading)</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Tra cứu, tạo và quản lý vận đơn theo Order ID.</p>
        </div>

        {/* ── Search panel ──────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Tra cứu vận đơn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="Nhập Order ID..."
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') searchBill(); }}
                className="max-w-xs"
                type="number"
              />
              <Button onClick={searchBill} disabled={searching}>
                {searching ? 'Đang tìm...' : 'Tra cứu'}
              </Button>
            </div>

            {searchError && (
              <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4" />
                <span>{searchError}</span>
              </div>
            )}

            {/* No bill yet for this order */}
            {noOrderId && !bill && (
              <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                  Đơn hàng #{orderIdInput} chưa có vận đơn.
                </p>
                <Button
                  className="mt-3 bg-blue-900 hover:bg-blue-800 text-white"
                  size="sm"
                  onClick={() => { setCreateForm({ billNumber: '', note: '' }); setShowCreate(true); }}
                >
                  <Plus className="w-4 h-4 mr-2" />Tạo vận đơn
                </Button>
              </div>
            )}

            {/* Bill found */}
            {bill && (
              <div className="mt-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Vận đơn #{bill.billNumber}
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStatusForm({ statusName: bill.statusName, description: '' });
                        setShowStatus(true);
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />Cập nhật trạng thái
                    </Button>
                    <Button variant="outline" size="sm" onClick={openHistory}>
                      <Clock className="w-4 h-4 mr-2" />Lịch sử
                    </Button>
                  </div>
                </div>

                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-gray-500 w-40">Bill ID</TableCell>
                      <TableCell className="font-mono">{bill.billId}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-gray-500">Order ID</TableCell>
                      <TableCell>{bill.orderId}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-gray-500">Số vận đơn</TableCell>
                      <TableCell className="font-semibold">{bill.billNumber}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-gray-500">Ngày tạo</TableCell>
                      <TableCell>{bill.createdDate || '—'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-gray-500">Trạng thái</TableCell>
                      <TableCell>
                        <Badge className={STATUS_CLASS[bill.statusName] || 'bg-gray-100 text-gray-700'}>
                          {bill.statusName}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-gray-500">Ghi chú</TableCell>
                      <TableCell>{bill.note || '—'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Create Bill Dialog ──────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo vận đơn mới</DialogTitle>
            <DialogDescription>Cho đơn hàng #{orderIdInput}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Số vận đơn (để trống để tự tạo)</label>
              <Input
                value={createForm.billNumber}
                onChange={(e) => setCreateForm((f) => ({ ...f, billNumber: e.target.value }))}
                placeholder="VD: BOL-2026-001 (tùy chọn)"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Ghi chú</label>
              <Input
                value={createForm.note}
                onChange={(e) => setCreateForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={submitCreate} disabled={submitting}>
              {submitting ? 'Đang tạo...' : 'Tạo vận đơn'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Status Update Dialog ────────────────────────────────────────── */}
      <Dialog open={showStatus} onOpenChange={setShowStatus}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cập nhật trạng thái vận đơn</DialogTitle>
            <DialogDescription>Vận đơn #{bill?.billNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Trạng thái mới *</label>
              <Select value={statusForm.statusName} onValueChange={(v) => setStatusForm((f) => ({ ...f, statusName: v }))}>
                <SelectTrigger><SelectValue placeholder="Chọn trạng thái..." /></SelectTrigger>
                <SelectContent>
                  {BILL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      <span className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${STATUS_CLASS[s]?.split(' ')[0]}`} />
                        {s}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Mô tả / lý do</label>
              <Input
                value={statusForm.description}
                onChange={(e) => setStatusForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Tùy chọn"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatus(false)}>Hủy</Button>
            <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={submitStatus} disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Cập nhật'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── History Dialog ──────────────────────────────────────────────── */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lịch sử vận đơn</DialogTitle>
            <DialogDescription>#{bill?.billNumber}</DialogDescription>
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
                      <Badge className={STATUS_CLASS[h.statusName] || 'bg-gray-100 text-gray-700'}>
                        {h.statusName}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">{h.description || '—'}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {h.createdAt ? new Date(h.createdAt).toLocaleString('vi-VN') : '—'}
                    </TableCell>
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
    </WarehouseLayout>
  );
}
