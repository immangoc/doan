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
