import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import WarehouseLayout from '../../../components/warehouse/WarehouseLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../../../components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog';
import {
  Wallet,
  CreditCard,
  ReceiptText,
  PiggyBank,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  QrCode,
  Copy,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { useWarehouseAuth, apiFetch } from '../../../contexts/WarehouseAuthContext';
import {
  getMyWallet,
  createTopup,
  getTopupStatus,
  cancelTopup as cancelTopupApi,
  getMyTransactions,
  getMyTopupCount,
  type WalletBalance,
  type PaymentLinkResponse,
  type PaymentStatusResponse,
  type WalletTransactionDto,
  type WalletTransactionType,
} from '../../../utils/walletService';

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

const TOPUP_PRESETS = [100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000];

// ─── Component ──────────────────────────────────────────────────────────────────

export default function WalletPage() {
  const { accessToken } = useWarehouseAuth();

  // ── Wallet balance state ──
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState('');

  // ── Topup dialog state ──
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupDesc, setTopupDesc] = useState('');
  const [topupCreating, setTopupCreating] = useState(false);
  const [topupError, setTopupError] = useState('');

  // ── Payment tracking state ──
  const [activePayment, setActivePayment] = useState<PaymentLinkResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusResponse | null>(null);
  const [pollingActive, setPollingActive] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Completed topups in session ──
  const [recentTopups, setRecentTopups] = useState<PaymentStatusResponse[]>([]);

  // ── Transaction history ──
  const [transactions, setTransactions] = useState<WalletTransactionDto[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState('');
  const [txPage, setTxPage] = useState(0);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [topupCount, setTopupCount] = useState<number | null>(null);
  const TX_SIZE = 10;

  // ── Withdraw form state ──
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [reason, setReason] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankName, setBankName] = useState('');
  const [withdrawSaving, setWithdrawSaving] = useState(false);
  const [withdrawMessage, setWithdrawMessage] = useState('');
  const [banks, setBanks] = useState<any[]>([]);
  const [bankOpen, setBankOpen] = useState(false);

  useEffect(() => {
    fetch('https://api.vietqr.io/v2/banks')
      .then((res) => res.json())
      .then((data) => {
        if (data.code === '00' && data.data) {
          setBanks(data.data);
        }
      })
      .catch((err) => console.error('Failed to fetch banks', err));
  }, []);

  // ── QR copied state ──
  const [qrCopied, setQrCopied] = useState(false);

  // ── Fetch wallet balance ──
  const fetchWallet = useCallback(async () => {
    setWalletLoading(true);
    setWalletError('');
    try {
      const data = await getMyWallet(accessToken);
      setWallet(data);
    } catch (e: any) {
      setWalletError(e.message || 'Không thể tải thông tin ví');
    } finally {
      setWalletLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  // ── Fetch transaction history + topup count ──
  const fetchTransactions = useCallback(
    async (page = 0) => {
      setTxLoading(true);
      setTxError('');
      try {
        const data = await getMyTransactions(accessToken, page, TX_SIZE);
        setTransactions(data.content);
        setTxPage(data.pageNumber);
        setTxTotalPages(Math.max(1, data.totalPages));
        setTxTotal(data.totalElements);
      } catch (e: any) {
        setTxError(e.message || 'Không thể tải lịch sử giao dịch');
      } finally {
        setTxLoading(false);
      }
    },
    [accessToken],
  );

  const fetchTopupCount = useCallback(async () => {
    try {
      const n = await getMyTopupCount(accessToken);
      setTopupCount(n);
    } catch {
      // ignore — fallback to session count
    }
  }, [accessToken]);

  useEffect(() => {
    fetchTransactions(0);
    fetchTopupCount();
  }, [fetchTransactions, fetchTopupCount]);

  // ── Topup: create payment link ──
  const handleCreateTopup = async () => {
    const amount = Number(topupAmount);
    if (!amount || amount < 10_000) {
      setTopupError('Số tiền nạp tối thiểu 10.000₫');
      return;
    }
    if (amount > 100_000_000) {
      setTopupError('Số tiền nạp tối đa 100.000.000₫');
      return;
    }

    setTopupCreating(true);
    setTopupError('');
    try {
      const result = await createTopup(
        {
          amount,
          description: topupDesc || undefined,
          returnUrl: `${window.location.origin}/warehouse/customer/wallet?topup=success`,
          cancelUrl: `${window.location.origin}/warehouse/customer/wallet?topup=cancel`,
        },
        accessToken,
      );
      setActivePayment(result);
      setTopupOpen(false);
      setTopupAmount('');
      setTopupDesc('');
      startPolling(result.orderCode);
    } catch (e: any) {
      setTopupError(e.message || 'Không thể tạo link nạp tiền');
    } finally {
      setTopupCreating(false);
    }
  };

  // ── Poll topup status ──
  const startPolling = useCallback(
    (orderCode: number) => {
      setPollingActive(true);
      const poll = async () => {
        try {
          const status = await getTopupStatus(orderCode, accessToken);
          setPaymentStatus(status);

          if (status.status === 'SUCCESS' || status.status === 'CANCELLED' || status.status === 'FAILED') {
            stopPolling();
            if (status.status === 'SUCCESS') {
              setRecentTopups((prev) => [status, ...prev]);
              fetchWallet();
              fetchTransactions(0);
              fetchTopupCount();
            }
          }
        } catch {
          // Keep polling even on transient errors
        }
      };

      // Initial check
      poll();
      pollingRef.current = setInterval(poll, 5000); // Poll every 5s
    },
    [accessToken, fetchWallet, fetchTransactions, fetchTopupCount],
  );

  const stopPolling = () => {
    setPollingActive(false);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // ── Cancel active topup ──
  const handleCancelTopup = async () => {
    if (!activePayment) return;
    try {
      await cancelTopupApi(activePayment.orderCode, accessToken);
      setPaymentStatus((prev) =>
        prev ? { ...prev, status: 'CANCELLED' } : null,
      );
      stopPolling();
    } catch (e: any) {
      // May already be completed
    }
  };

  const closePaymentPanel = () => {
    stopPolling();
    setActivePayment(null);
    setPaymentStatus(null);
  };

  // ── Withdraw ──
  const submitWithdraw = async () => {
    setWithdrawSaving(true);
    setWithdrawMessage('');
    try {
      const amountNum = Number(withdrawAmount);
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        throw new Error('Số tiền không hợp lệ');
      }
      const data = await apiFetch(
        '/wallet/withdraw-requests',
        {
          method: 'POST',
          body: JSON.stringify({ amount: amountNum, reason, bank_account: bankAccount, bank_name: bankName }),
        },
        accessToken,
      );
      if (!data) throw new Error('Không thể tạo yêu cầu rút');
      setWithdrawMessage('Đã gửi yêu cầu rút tiền thành công!');
      setWithdrawOpen(false);
      setWithdrawAmount('');
      setReason('');
      setBankAccount('');
      setBankName('');
    } catch (e: any) {
      setWithdrawMessage(e.message || 'Có lỗi xảy ra');
    } finally {
      setWithdrawSaving(false);
    }
  };

  // ── Copy QR ──
  const copyQrCode = () => {
    const link = activePayment?.checkoutUrl || activePayment?.qrCode;
    if (link) {
      navigator.clipboard.writeText(link);
      setQrCopied(true);
      setTimeout(() => setQrCopied(false), 2000);
    }
  };

  // ── Cleanup polling on unmount ──
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // ── Check URL params for return from PayOS ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topupResult = params.get('topup');
    if (topupResult === 'success') {
      fetchWallet();
      fetchTransactions(0);
      fetchTopupCount();
      // Clean the URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (topupResult === 'cancel') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchWallet, fetchTransactions, fetchTopupCount]);

  // ── Transaction type helpers ──
  const txTypeConfig = (type: WalletTransactionType) => {
    switch (type) {
      case 'TOPUP':
        return {
          label: 'Nạp tiền',
          icon: ArrowDownLeft,
          color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
          amountClass: 'text-green-600 dark:text-green-400',
          sign: '+',
        };
      case 'REFUND':
        return {
          label: 'Hoàn tiền',
          icon: ArrowDownLeft,
          color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
          amountClass: 'text-emerald-600 dark:text-emerald-400',
          sign: '+',
        };
      case 'PAYMENT':
        return {
          label: 'Thanh toán',
          icon: ArrowUpRight,
          color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
          amountClass: 'text-red-600 dark:text-red-400',
          sign: '−',
        };
      case 'ADJUST':
        return {
          label: 'Điều chỉnh',
          icon: RefreshCw,
          color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
          amountClass: 'text-slate-600 dark:text-slate-400',
          sign: '',
        };
    }
  };

  // ── Status helpers ──
  const statusConfig = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return { label: 'Thành công', icon: CheckCircle2, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', dotColor: 'bg-green-500' };
      case 'CANCELLED':
        return { label: 'Đã hủy', icon: XCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', dotColor: 'bg-red-500' };
      case 'FAILED':
        return { label: 'Thất bại', icon: XCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', dotColor: 'bg-red-500' };
      default:
        return { label: 'Đang chờ', icon: Clock, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', dotColor: 'bg-yellow-500' };
    }
  };

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="page-title">Ví của tôi</h1>
            <p className="page-subtitle">Quản lý số dư, nạp tiền và lịch sử giao dịch của bạn.</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => { fetchWallet(); fetchTransactions(txPage); fetchTopupCount(); }}
              disabled={walletLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${walletLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            <Button variant="outline" onClick={() => setWithdrawOpen(true)}>
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Tạo đơn rút
            </Button>
            <Button onClick={() => setTopupOpen(true)}>
              <ArrowDownLeft className="w-4 h-4 mr-2" />
              Nạp tiền
            </Button>
          </div>
        </div>

        {/* ── Error alert ── */}
        {walletError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 text-red-700 dark:text-red-300 text-sm">
            {walletError}
          </div>
        )}

        {/* ── Balance + Stats ── */}
        <div className="grid gap-6 lg:grid-cols-3">
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Số dư hiện tại
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-3xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-700 text-white p-8 relative overflow-hidden">
                  {/* Decorative circles */}
                  <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5"></div>
                  <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5"></div>

                  <div className="relative">
                    <div className="text-sm opacity-80">Tổng số dư khả dụng</div>
                    <div className="mt-2 text-4xl font-bold tracking-tight">
                      {walletLoading ? (
                        <span className="inline-flex items-center gap-3">
                          <Loader2 className="w-8 h-8 animate-spin" />
                          Đang tải...
                        </span>
                      ) : wallet ? (
                        formatVND(wallet.balance)
                      ) : (
                        '—'
                      )}
                    </div>
                    {wallet?.updatedAt && (
                      <div className="mt-2 text-xs opacity-60">
                        Cập nhật lần cuối: {new Date(wallet.updatedAt).toLocaleString('vi-VN')}
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-3 text-sm">
                      <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur-sm">Sẵn sàng thanh toán</span>
                      <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur-sm">An toàn và minh bạch</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {[
              {
                icon: PiggyBank,
                label: 'Số dư',
                value: wallet ? formatVND(wallet.balance) : '—',
                bgColor: 'bg-green-100 dark:bg-green-900/30',
                textColor: 'text-green-700 dark:text-green-300',
              },
              {
                icon: ReceiptText,
                label: 'Lần nạp thành công',
                value: `${topupCount !== null
                    ? topupCount
                    : recentTopups.filter((t) => t.status === 'SUCCESS').length
                  } lần`,
                bgColor: 'bg-blue-100 dark:bg-blue-900/30',
                textColor: 'text-blue-700 dark:text-blue-300',
              },
              {
                icon: CreditCard,
                label: 'Trạng thái',
                value: activePayment ? 'Đang xử lý' : 'Sẵn sàng',
                bgColor: activePayment
                  ? 'bg-yellow-100 dark:bg-yellow-900/30'
                  : 'bg-emerald-100 dark:bg-emerald-900/30',
                textColor: activePayment
                  ? 'text-yellow-700 dark:text-yellow-300'
                  : 'text-emerald-700 dark:text-emerald-300',
              },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.08 }}
              >
                <Card>
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className={`rounded-2xl p-3 ${stat.bgColor} ${stat.textColor}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                      <p className="text-xl font-bold">{stat.value}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Active Payment Panel ── */}
        {activePayment && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-2 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Giao dịch nạp tiền đang xử lý
                  </CardTitle>
                  {paymentStatus && (
                    <Badge className={statusConfig(paymentStatus.status).color}>
                      {statusConfig(paymentStatus.status).label}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Info */}
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Số tiền:</span>
                        <span className="font-bold text-lg">{formatVND(activePayment.amount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Mã đơn:</span>
                        <span className="font-mono text-xs">{activePayment.orderCode}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Trạng thái:</span>
                        <span className="flex items-center gap-2">
                          {pollingActive && <Loader2 className="w-3 h-3 animate-spin" />}
                          {paymentStatus ? statusConfig(paymentStatus.status).label : 'Đang tạo...'}
                        </span>
                      </div>
                      {activePayment.expiresAt && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Hết hạn:</span>
                          <span>{new Date(activePayment.expiresAt).toLocaleString('vi-VN')}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      {activePayment.checkoutUrl && (!paymentStatus || paymentStatus.status === 'PENDING') && (
                        <Button asChild className="flex-1">
                          <a href={activePayment.checkoutUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Thanh toán PayOS
                          </a>
                        </Button>
                      )}
                      {(!paymentStatus || paymentStatus.status === 'PENDING') && (
                        <Button variant="outline" onClick={handleCancelTopup}>
                          Hủy
                        </Button>
                      )}
                      {paymentStatus && paymentStatus.status !== 'PENDING' && (
                        <Button variant="outline" onClick={closePaymentPanel} className="flex-1">
                          Đóng
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* QR Code */}
                  {activePayment.checkoutUrl && (!paymentStatus || paymentStatus.status === 'PENDING') && (
                    <div className="flex flex-col items-center gap-4">
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <QrCode className="w-4 h-4" />
                        Quét mã QR để thanh toán
                      </div>
                      <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 bg-white">
                        <img
                          src={
                            activePayment.qrCode?.startsWith('http')
                              ? activePayment.qrCode
                              : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(activePayment.qrCode || activePayment.checkoutUrl)}`
                          }
                          alt="PayOS QR Code"
                          className="w-48 h-48 object-contain"
                        />
                      </div>
                      <Button variant="ghost" size="sm" onClick={copyQrCode}>
                        {qrCopied ? (
                          <><Check className="w-4 h-4 mr-1" /> Đã copy</>
                        ) : (
                          <><Copy className="w-4 h-4 mr-1" /> Copy link thanh toán</>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Success feedback */}
                  {paymentStatus?.status === 'SUCCESS' && (
                    <div className="flex flex-col items-center justify-center gap-3 p-8">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                      >
                        <CheckCircle2 className="w-16 h-16 text-green-500" />
                      </motion.div>
                      <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                        Nạp tiền thành công!
                      </p>
                      <p className="text-sm text-gray-500">Số dư đã được cập nhật.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Withdraw Form ── */}
        {withdrawOpen && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle>Tạo đơn rút tiền</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Số tiền muốn rút</label>
                    <Input
                      type="number"
                      min={0}
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="Nhập số tiền (VND)"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Lý do rút</label>
                    <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Nhập lý do rút tiền" />
                  </div>
                  <div className="space-y-2 relative">
                    <label className="text-sm font-medium">Tên ngân hàng</label>
                    <div className="relative">
                      <Input
                        value={bankName}
                        onChange={(e) => { setBankName(e.target.value); setBankOpen(true); }}
                        onFocus={() => setBankOpen(true)}
                        placeholder="VD: Vietcombank, gõ để tìm..."
                        autoComplete="off"
                      />
                      <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
                    </div>
                    {bankOpen && banks.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-[250px] overflow-y-auto">
                        {banks
                          .filter((b) => {
                            if (!bankName) return true;
                            const q = bankName.toLowerCase();
                            return b.shortName.toLowerCase().includes(q) || b.name.toLowerCase().includes(q);
                          })
                          .map((b) => (
                            <button
                              type="button"
                              key={b.bin}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                                bankName === b.shortName ? 'bg-blue-50 dark:bg-blue-900/20 font-medium' : ''
                              }`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setBankName(b.shortName);
                                setBankOpen(false);
                              }}
                            >
                              <Check
                                className={`h-4 w-4 shrink-0 ${
                                  bankName === b.shortName ? 'opacity-100 text-blue-600' : 'opacity-0'
                                }`}
                              />
                              <span className="truncate">{b.shortName} - {b.name}</span>
                            </button>
                          ))}
                        {banks.filter((b) => {
                          if (!bankName) return true;
                          const q = bankName.toLowerCase();
                          return b.shortName.toLowerCase().includes(q) || b.name.toLowerCase().includes(q);
                        }).length === 0 && (
                          <div className="px-3 py-4 text-sm text-gray-500 text-center">Không tìm thấy ngân hàng.</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">STK</label>
                    <Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="Nhập số tài khoản" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={submitWithdraw} disabled={withdrawSaving}>
                    {withdrawSaving ? 'Đang gửi...' : 'Gửi yêu cầu'}
                  </Button>
                  <Button variant="outline" onClick={() => setWithdrawOpen(false)}>Hủy</Button>
                </div>
                {withdrawMessage && <p className="text-sm text-gray-600">{withdrawMessage}</p>}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Recent Topups (session) ── */}
        {recentTopups.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="w-5 h-5" />
                Giao dịch nạp tiền gần đây
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentTopups.map((tx, index) => {
                const cfg = statusConfig(tx.status);
                return (
                  <motion.div
                    key={tx.orderCode}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${cfg.dotColor}`} />
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">Nạp tiền vào ví</div>
                        <div className="text-sm text-gray-500">
                          Mã: {tx.orderCode}
                          {tx.paidAt && ` • ${new Date(tx.paidAt).toLocaleString('vi-VN')}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-bold text-green-600 dark:text-green-400">
                        +{formatVND(tx.amount)}
                      </div>
                      <Badge className={cfg.color}>{cfg.label}</Badge>
                    </div>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* ── Transaction history ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="w-5 h-5" />
                Lịch sử giao dịch
              </CardTitle>
              <div className="text-xs text-gray-500">
                {txLoading ? 'Đang tải...' : `${txTotal} giao dịch`}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {txError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 text-red-700 dark:text-red-300 text-sm">
                {txError}
              </div>
            )}

            {!txLoading && !txError && transactions.length === 0 && (
              <div className="text-center py-10 text-sm text-gray-500">
                Chưa có giao dịch nào
              </div>
            )}

            {transactions.map((tx, index) => {
              const cfg = txTypeConfig(tx.type);
              if (!cfg) return null;
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={tx.transactionId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                  className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4"
                >
                  <div className={`rounded-xl p-2.5 ${cfg.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {cfg.label}
                      </span>
                      {tx.paymentOrderCode && (
                        <span className="font-mono text-[11px] text-gray-500">
                          #{tx.paymentOrderCode}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {tx.note || '—'}
                      {tx.createdAt && ` • ${new Date(tx.createdAt).toLocaleString('vi-VN')}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold whitespace-nowrap ${cfg.amountClass}`}>
                      {cfg.sign}{formatVND(tx.amount)}
                    </div>
                    <div className="text-[11px] text-gray-500 whitespace-nowrap">
                      Số dư: {formatVND(tx.balanceAfter)}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {txTotalPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-sm">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchTransactions(Math.max(0, txPage - 1))}
                  disabled={txLoading || txPage === 0}
                >
                  Trang trước
                </Button>
                <div className="text-gray-500">
                  Trang {txPage + 1} / {txTotalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchTransactions(Math.min(txTotalPages - 1, txPage + 1))}
                  disabled={txLoading || txPage >= txTotalPages - 1}
                >
                  Trang sau
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Topup Dialog ── */}
        <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-blue-600" />
                Nạp tiền vào ví
              </DialogTitle>
              <DialogDescription>
                Nhập số tiền bạn muốn nạp. Thanh toán qua PayOS (chuyển khoản ngân hàng).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Preset amounts */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Chọn nhanh
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TOPUP_PRESETS.map((amount) => (
                    <Button
                      key={amount}
                      variant={Number(topupAmount) === amount ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTopupAmount(String(amount))}
                      className="text-xs"
                    >
                      {formatVND(amount)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom amount */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Hoặc nhập số tiền (VND)
                </label>
                <Input
                  type="number"
                  placeholder="VD: 500000"
                  value={topupAmount}
                  onChange={(e) => {
                    setTopupAmount(e.target.value);
                    setTopupError('');
                  }}
                  min="10000"
                  max="100000000"
                />
                {topupAmount && Number(topupAmount) >= 10000 && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    = {formatVND(Number(topupAmount))}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ghi chú (tùy chọn)
                </label>
                <Input
                  placeholder="VD: Nạp tiền tháng 4"
                  value={topupDesc}
                  onChange={(e) => setTopupDesc(e.target.value)}
                />
              </div>

              {topupError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 text-red-700 dark:text-red-300 text-sm">
                  {topupError}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setTopupOpen(false)} disabled={topupCreating}>
                Hủy
              </Button>
              <Button onClick={handleCreateTopup} disabled={topupCreating || !topupAmount}>
                {topupCreating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang tạo...</>
                ) : (
                  'Tạo link thanh toán'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </WarehouseLayout>
  );
}
