/**
 * Phase 7 — Gate-Out Management (XuatBai screen).
 * performGateOutForManagement(): POST /admin/gate-out → returns gateOutId
 * fetchGateOutInvoice():         GET /admin/gate-out/{id}/invoice
 */
import { apiFetch } from './apiClient';
import { refreshOccupancy } from './gateInService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

export interface GateOutInvoice {
  invoiceId: number;
  containerCode: string;
  cargoType: string;
  containerType: string;
  gateInTime: string;
  gateOutTime: string;
  storageDays: number;
  feePerDay: string;
  baseFee: string;
  overduePenalty: string;
  totalAmount: string;
  isOverdue: boolean;
  overdueDays: number;
}

function fmtDateTime(raw: string): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtMoney(raw: unknown): string {
  if (raw == null || raw === '') return '—';
  const n = Number(raw);
  if (!Number.isFinite(n)) return String(raw);
  return n.toLocaleString('vi-VN') + ' đ';
}

export interface GateOutManagementResult {
  gateOutId: number;
  relocationMessage?: string;
}

/**
 * POST /admin/gate-out → refresh occupancy → return gateOutId + relocation info.
 */
export async function performGateOutForManagement(containerId: string): Promise<GateOutManagementResult> {
  const res = await apiFetch('/admin/gate-out', {
    method: 'POST',
    body: JSON.stringify({ containerId }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gate-out thất bại (HTTP ${res.status})${body ? ': ' + body : ''}`);
  }

  const json: Rec = await res.json();
  const data: Rec = json.data ?? json;
  const gateOutId = Number(data.gateOutId ?? data.id ?? 0);
  const relocationMessage = data.relocationMessage ?? undefined;

  await refreshOccupancy();
  return { gateOutId, relocationMessage };
}

/**
 * GET /admin/gate-out/{gateOutId}/invoice
 */
export async function fetchGateOutInvoice(gateOutId: number): Promise<GateOutInvoice> {
  const res = await apiFetch(`/admin/gate-out/${gateOutId}/invoice`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json: Rec = await res.json();
  const d: Rec = json.data ?? json;
  return {
    invoiceId:      Number(d.invoiceId ?? d.id ?? 0),
    containerCode:  String(d.containerCode ?? d.containerId ?? d.code ?? '—'),
    cargoType:      String(d.cargoTypeName ?? d.cargoType ?? '—'),
    containerType:  String(d.containerTypeName ?? d.containerType ?? '—'),
    gateInTime:     fmtDateTime(String(d.gateInTime ?? d.startTime ?? '')),
    gateOutTime:    fmtDateTime(String(d.gateOutTime ?? d.endTime ?? '')),
    storageDays:    Number(d.storageDays ?? d.days ?? 0),
    feePerDay:      fmtMoney(d.dailyRate ?? d.feePerDay ?? d.rate),
    baseFee:        fmtMoney(d.baseFee),
    overduePenalty: fmtMoney(d.overduePenalty),
    totalAmount:    fmtMoney(d.totalFee ?? d.totalAmount ?? d.total ?? d.amount),
    isOverdue:      Boolean(d.isOverdue),
    overdueDays:    Number(d.overdueDays ?? 0),
  };
}
