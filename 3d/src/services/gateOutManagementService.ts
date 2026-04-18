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
  gateInTime: string;
  gateOutTime: string;
  storageDays: number;
  feePerDay: string;
  totalAmount: string;
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
    containerCode: String(d.containerCode ?? d.code ?? ''),
    cargoType:     String(d.cargoTypeName ?? d.cargoType ?? ''),
    gateInTime:    String(d.gateInTime ?? d.startTime ?? ''),
    gateOutTime:   String(d.gateOutTime ?? d.endTime ?? ''),
    storageDays:   Number(d.storageDays ?? d.days ?? 0),
    feePerDay:     String(d.feePerDay ?? d.rate ?? '—'),
    totalAmount:   String(d.totalAmount ?? d.total ?? d.amount ?? '—'),
  };
}
