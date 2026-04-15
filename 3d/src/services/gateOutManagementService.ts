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
  containerId: string;
  cargoType?: string;
  gateInTime?: string;
  gateOutTime?: string;
  storageDays: number;
  dailyRate?: number;
  baseFee?: number;
  overduePenalty?: number;
  totalFee?: number;
  isOverdue?: boolean;
  overdueDays?: number;
}

/**
 * POST /admin/gate-out → refresh occupancy → return gateOutId for invoice fetch.
 */
export async function performGateOutForManagement(containerId: string): Promise<number> {
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

  await refreshOccupancy();
  return gateOutId;
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
    invoiceId:     Number(d.invoiceId ?? d.id ?? 0),
    containerId:   String(d.containerId ?? d.containerCode ?? d.code ?? ''),
    cargoType:     d.cargoType != null ? String(d.cargoType) : (d.cargoTypeName != null ? String(d.cargoTypeName) : ''),
    gateInTime:    d.gateInTime != null ? String(d.gateInTime) : '',
    gateOutTime:   d.gateOutTime != null ? String(d.gateOutTime) : '',
    storageDays:   Number(d.storageDays ?? d.days ?? 0),
    dailyRate:     d.dailyRate != null ? Number(d.dailyRate) : undefined,
    baseFee:       d.baseFee != null ? Number(d.baseFee) : undefined,
    overduePenalty:d.overduePenalty != null ? Number(d.overduePenalty) : undefined,
    totalFee:      d.totalFee != null ? Number(d.totalFee) : undefined,
    isOverdue:     d.isOverdue != null ? Boolean(d.isOverdue) : undefined,
    overdueDays:   d.overdueDays != null ? Number(d.overdueDays) : undefined,
  };
}
