import { apiFetch } from '../contexts/WarehouseAuthContext';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface WalletBalance {
  walletId: number;
  balance: number;
  updatedAt: string;
}

export interface TopupRequest {
  amount: number;
  description?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PaymentLinkResponse {
  paymentId: string;
  orderCode: number;
  paymentLinkId: string;
  amount: number;
  checkoutUrl: string;
  qrCode: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

export interface PaymentStatusResponse {
  paymentId: string;
  orderCode: number;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'CANCELLED' | 'FAILED';
  paidAt: string | null;
}

export type WalletTransactionType = 'TOPUP' | 'REFUND' | 'PAYMENT' | 'ADJUST';

export interface WalletTransactionDto {
  transactionId: string;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  note: string | null;
  createdAt: string;
  paymentOrderCode: number | null;
  paymentStatus: string | null;
}

export interface TransactionsPage {
  content: WalletTransactionDto[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ─── API Functions ──────────────────────────────────────────────────────────────

/** Lấy thông tin ví của user hiện tại */
export async function getMyWallet(token: string | null): Promise<WalletBalance> {
  const res = await apiFetch('/wallets/me', {}, token);
  return res.data;
}

/** Tạo link nạp tiền qua PayOS */
export async function createTopup(
  payload: TopupRequest,
  token: string | null,
): Promise<PaymentLinkResponse> {
  const res = await apiFetch(
    '/wallets/topup',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
  return res.data;
}

/** Kiểm tra trạng thái thanh toán nạp tiền */
export async function getTopupStatus(
  orderCode: number,
  token: string | null,
): Promise<PaymentStatusResponse> {
  const res = await apiFetch(`/wallets/topup/${orderCode}`, {}, token);
  return res.data;
}

/** Hủy giao dịch nạp tiền */
export async function cancelTopup(
  orderCode: number,
  token: string | null,
): Promise<void> {
  await apiFetch(
    `/wallets/topup/${orderCode}/cancel`,
    { method: 'POST' },
    token,
  );
}

/** Lấy lịch sử giao dịch ví (phân trang) */
export async function getMyTransactions(
  token: string | null,
  page = 0,
  size = 20,
): Promise<TransactionsPage> {
  const res = await apiFetch(`/wallets/me/transactions?page=${page}&size=${size}`, {}, token);
  return res.data;
}

/** Đếm tổng số lần nạp thành công */
export async function getMyTopupCount(token: string | null): Promise<number> {
  const res = await apiFetch('/wallets/me/topup-count', {}, token);
  return res.data ?? 0;
}
