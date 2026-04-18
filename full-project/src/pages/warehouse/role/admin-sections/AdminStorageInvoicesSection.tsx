import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Calculator, FileText } from 'lucide-react';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Badge } from '../../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../../components/ui/dialog';
import { useWarehouseAuth, API_BASE } from '../../../../contexts/WarehouseAuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────
type GateOutItem = {
  gateOutId: number;
  containerId: string;
  gateOutTime?: string;
  createdByUsername?: string;
  note?: string;
};

type InvoiceData = {
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

const PAGE_SIZE = 20;

const fmtMoney = (val?: number) =>
  val != null
    ? val.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
    : '—';

export default function AdminStorageInvoicesSection() {
  const { accessToken } = useWarehouseAuth();
  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    [accessToken],
  );

  // Gate-out list
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [items, setItems]         = useState<GateOutItem[]>([]);
  const [page, setPage]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Invoice per gate-out
  const [invoiceMap, setInvoiceMap] = useState<Record<number, InvoiceData | 'loading' | 'none'>>({});

  // Invoice detail dialog
  const [showInvoice, setShowInvoice]     = useState(false);
  const [invoiceDetail, setInvoiceDetail] = useState<InvoiceData | null>(null);
  const [selectedItem, setSelectedItem]   = useState<GateOutItem | null>(null);

  // Calculator tab
  const [tab, setTab] = useState<'list' | 'calc'>('list');
  const [calcCid, setCalcCid]       = useState('');
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcBill, setCalcBill]     = useState<StorageBill | null>(null);
  const [calcError, setCalcError]   = useState('');

  // ── Fetch gate-out list ─────────────────────────────────────────────────
  const fetchItems = async (p = page) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(p), size: String(PAGE_SIZE),
        sortBy: 'gateOutTime', direction: 'desc',
      });
      const res  = await fetch(`${API_BASE}/admin/gate-out?${params}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tải danh sách gate-out');
      setItems(data.data?.content || []);
      setTotalPages(data.data?.totalPages || 1);
      setPage(p);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchItems(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch invoice for one gate-out ──────────────────────────────────────
  const loadInvoice = async (item: GateOutItem) => {
    setInvoiceMap((m) => ({ ...m, [item.gateOutId]: 'loading' }));
    try {
      const res  = await fetch(`${API_BASE}/admin/gate-out/${item.gateOutId}/invoice`, { headers });
      const data = await res.json();
      if (res.ok && data.data) {
        setInvoiceMap((m) => ({ ...m, [item.gateOutId]: data.data }));
      } else {
        setInvoiceMap((m) => ({ ...m, [item.gateOutId]: 'none' }));
      }
    } catch {
      setInvoiceMap((m) => ({ ...m, [item.gateOutId]: 'none' }));
    }
  };

  const openInvoiceDialog = async (item: GateOutItem) => {
    setSelectedItem(item);
    setInvoiceDetail(null);
    setShowInvoice(true);
    const cached = invoiceMap[item.gateOutId];
    if (cached && cached !== 'loading' && cached !== 'none') {
      setInvoiceDetail(cached as InvoiceData);
      return;
    }
    try {
      const res  = await fetch(`${API_BASE}/admin/gate-out/${item.gateOutId}/invoice`, { headers });
      const data = await res.json();
      if (res.ok) {
        setInvoiceDetail(data.data);
        setInvoiceMap((m) => ({ ...m, [item.gateOutId]: data.data }));
      }
    } catch { /* ignore */ }
  };

  // ── Bill calculator ─────────────────────────────────────────────────────
  const calcStorageBill = async () => {
    const cid = calcCid.trim();
    if (!cid) return;
    setCalcLoading(true);
    setCalcBill(null);
    setCalcError('');
    try {
      const res  = await fetch(`${API_BASE}/admin/containers/${cid}/storage-bill`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không tìm thấy dữ liệu lưu kho');
      setCalcBill(data.data);
    } catch (e: any) {
      setCalcError(e.message);
    } finally {
      setCalcLoading(false);
    }
  };

  // ── Tab styles ──────────────────────────────────────────────────────────
  const tabCls = (t: typeof tab) =>
    `px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
      tab === t
        ? 'border-blue-600 text-blue-700 dark:text-blue-400'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`;

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Phí lưu kho</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Xem hóa đơn lưu kho theo gate-out và tính phí tạm thời theo container.</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <Button size="sm" variant="outline" onClick={() => fetchItems(page)} disabled={loading}>Thử lại</Button>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
          <button className={tabCls('list')} onClick={() => setTab('list')}>Hóa đơn gate-out</button>
          <button className={tabCls('calc')} onClick={() => setTab('calc')}>Tính phí tạm thời</button>
        </div>

        {/* ── TAB: Invoice list ──────────────────────────────────────────── */}
        {tab === 'list' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600" />
                Hóa đơn theo gate-out
              </CardTitle>
              <div className="mt-2">
                <Button variant="outline" size="sm" onClick={() => fetchItems(page)} disabled={loading}>Làm mới</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gate-Out ID</TableHead>
                    <TableHead>Container ID</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Tổng phí</TableHead>
                    <TableHead>Quá hạn</TableHead>
                    <TableHead className="text-right">Xem hóa đơn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-gray-500">Đang tải...</TableCell></TableRow>
                  ) : items.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-gray-500">Chưa có dữ liệu</TableCell></TableRow>
                  ) : items.map((item) => {
                    const inv = invoiceMap[item.gateOutId];
                    const invData = inv && inv !== 'loading' && inv !== 'none' ? (inv as InvoiceData) : null;
                    return (
                      <TableRow key={item.gateOutId}>
                        <TableCell className="text-gray-500 text-sm">{item.gateOutId}</TableCell>
                        <TableCell className="font-mono font-semibold">{item.containerId}</TableCell>
                        <TableCell className="text-sm">
                          {item.gateOutTime ? new Date(item.gateOutTime).toLocaleString('vi-VN') : '—'}
                        </TableCell>
                        <TableCell>
                          {inv === 'loading' ? (
                            <span className="text-gray-400 text-sm">...</span>
                          ) : invData ? (
                            <span className="font-semibold">{fmtMoney(invData.totalFee)}</span>
                          ) : (
                            <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => loadInvoice(item)}>
                              Tải
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          {invData ? (
                            invData.isOverdue
                              ? <Badge className="bg-red-100 text-red-700">{invData.overdueDays} ngày</Badge>
                              : <Badge className="bg-green-100 text-green-700">Bình thường</Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openInvoiceDialog(item)}>
                            <FileText className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
        )}

        {/* ── TAB: Bill calculator ───────────────────────────────────────── */}
        {tab === 'calc' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                Tính phí lưu kho tạm thời
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Tính phí hiện tại cho container đang lưu kho (chưa gate-out).</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Input
                  placeholder="Nhập Container ID..."
                  value={calcCid}
                  onChange={(e) => setCalcCid(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') calcStorageBill(); }}
                  className="max-w-xs"
                />
                <Button onClick={calcStorageBill} disabled={calcLoading}>
                  {calcLoading ? 'Đang tính...' : 'Tính phí'}
                </Button>
              </div>

              {calcError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{calcError}</span>
                </div>
              )}

              {calcBill && (
                <div className="max-w-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-3 border-b border-blue-100 dark:border-blue-800">
                    <div className="font-semibold text-blue-900 dark:text-blue-200">
                      {calcBill.containerId}
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">{calcBill.yardName || '—'}</div>
                  </div>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-gray-500 text-sm">Ngày bắt đầu lưu</TableCell>
                        <TableCell className="text-sm">
                          {calcBill.storageStartDate ? new Date(calcBill.storageStartDate).toLocaleDateString('vi-VN') : '—'}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-gray-500 text-sm">Số ngày lưu</TableCell>
                        <TableCell className="text-sm">{calcBill.storageDays ?? '—'} ngày</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-gray-500 text-sm">Đơn giá / ngày</TableCell>
                        <TableCell className="text-sm">{fmtMoney(calcBill.dailyRate)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-gray-500 text-sm">Phí cơ bản</TableCell>
                        <TableCell className="text-sm">{fmtMoney(calcBill.baseFee)}</TableCell>
                      </TableRow>
                      {calcBill.isOverdue && (
                        <TableRow>
                          <TableCell className="text-red-600 text-sm">Phạt quá hạn ({calcBill.overdueDays} ngày)</TableCell>
                          <TableCell className="text-red-600 text-sm font-medium">{fmtMoney(calcBill.overduePenalty)}</TableCell>
                        </TableRow>
                      )}
                      <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                        <TableCell className="font-bold">Tổng cộng</TableCell>
                        <TableCell className="font-bold text-lg">{fmtMoney(calcBill.totalFee)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  {calcBill.isOverdue && (
                    <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm font-medium">
                      Container quá hạn {calcBill.overdueDays} ngày
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Invoice Detail Dialog ───────────────────────────────────────── */}
      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hóa đơn lưu kho</DialogTitle>
            <DialogDescription>Container: {selectedItem?.containerId} — Gate-Out #{selectedItem?.gateOutId}</DialogDescription>
          </DialogHeader>
          {!invoiceDetail ? (
            <div className="text-center py-6 text-gray-500">Đang tải...</div>
          ) : (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Invoice ID</span>
                <span className="font-mono">{invoiceDetail.invoiceId}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Container ID</span>
                <span className="font-mono">{invoiceDetail.containerId}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Số ngày lưu</span>
                <span>{invoiceDetail.storageDays ?? '—'} ngày</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Đơn giá / ngày</span>
                <span>{fmtMoney(invoiceDetail.dailyRate)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Phí cơ bản</span>
                <span>{fmtMoney(invoiceDetail.baseFee)}</span>
              </div>
              {invoiceDetail.isOverdue && (
                <div className="flex justify-between py-1 text-red-600">
                  <span>Phạt quá hạn ({invoiceDetail.overdueDays} ngày)</span>
                  <span className="font-medium">{fmtMoney(invoiceDetail.overduePenalty)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-t font-bold text-base">
                <span>Tổng cộng</span>
                <span>{fmtMoney(invoiceDetail.totalFee)}</span>
              </div>
              {invoiceDetail.isOverdue && (
                <Badge className="bg-red-100 text-red-700 mt-1">Quá hạn {invoiceDetail.overdueDays} ngày</Badge>
              )}
              <div className="text-xs text-gray-400 pt-2">
                Ngày tạo: {invoiceDetail.createdAt ? new Date(invoiceDetail.createdAt).toLocaleString('vi-VN') : '—'}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoice(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WarehouseLayout>
  );
}
