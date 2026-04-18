/**
 * Phase 6 — Gate-Out flow and Waiting List.
 *
 * searchInYardContainers(): GET /admin/containers?statusName=IN_YARD&keyword=...
 * performGateOut():         POST /admin/gate-out → refreshOccupancy()
 * fetchWaitingContainers(): GET /admin/orders?statusName=APPROVED
 *   → expands containerIds → batch-fetches container details
 */
import { apiFetch } from './apiClient';
import { refreshOccupancy } from './gateInService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InYardContainer {
  containerId: string;  // the string container code sent to gate-out API
  containerCode: string;
  cargoType: string;
  containerType: string;
  zone: string;
  whName: string;
  floor: number;
  slot: string;
  blockName: string;
  yardType: string;
  /** Additional detail — shown in ExportPanel */
  grossWeight: string;
  declaredValue: string;
  sealNumber: string;
  note: string;
  statusName: string;
  rowNo: number | null;
  bayNo: number | null;
  tier: number | null;
  inActiveOrder: boolean;
}

export interface StorageBill {
  containerId: string;
  firstStoredAt: string | null;
  days: number;
  billableDays: number;
  ratePerDay: number;
  subtotal: number;
  total: number;
  currency: string;
}

export interface WaitingItem {
  orderId:       number;
  containerCode: string;
  cargoType:     string;
  containerType: string;
  weight:        string;
  orderDate:     string;
  customerName:  string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toList(json: Rec): Rec[] {
  const data: unknown = json.data ?? json;
  if (Array.isArray(data)) return data as Rec[];
  const paged = data as Rec;
  return Array.isArray(paged.content) ? (paged.content as Rec[]) : [];
}

function formatDate(raw: string): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

async function containerStatus(containerCode: string): Promise<string | null> {
  if (!containerCode.trim()) return null;
  const res = await apiFetch(`/admin/containers/${encodeURIComponent(containerCode.trim())}`);
  if (res.status === 404) return null;
  if (!res.ok) return null;

  const json: Rec = await res.json().catch(() => ({}));
  const data: Rec = json.data ?? json;
  return String(data.statusName ?? data.status ?? '').toUpperCase() || null;
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * GET /admin/containers?statusName=IN_YARD&keyword=<keyword>&size=50
 * Returns containers currently in yard, optionally filtered by keyword.
 */
export async function searchInYardContainers(keyword: string): Promise<InYardContainer[]> {
  const params = new URLSearchParams({ statusName: 'IN_YARD', size: '50' });
  if (keyword.trim()) params.set('keyword', keyword.trim());

  const res = await apiFetch(`/admin/containers?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json: Rec = await res.json();
  return toList(json).map((c: Rec) => {
    // containerCode is the human-readable code like 'ABCU1234567'
    const containerCode = String(c.containerCode ?? c.container_number ?? c.code ?? c.containerId ?? '');

    // Build slot label:  e.g. "R2B5/T3" or "R2C5/T3"
    const row   = c.rowNo  != null ? `R${c.rowNo}`  : null;
    const bay   = c.bayNo  != null ? `B${c.bayNo}`  : null;
    const tier  = c.tier   != null ? `T${c.tier}`   : null;
    const slotLabel = [row, bay].filter(Boolean).join('') + (tier ? `/${tier}` : '');

    return {
      containerId:   containerCode,
      containerCode,
      cargoType:     String(c.cargoTypeName  ?? c.cargoType ?? c.type ?? ''),
      containerType: String(c.containerTypeName ?? c.containerType ?? c.sizeType ?? '20ft'),
      zone:          String(c.zoneName       ?? c.zone  ?? '—'),
      whName:        String(c.yardName       ?? c.whName ?? c.warehouse ?? '—'),
      floor:         Number(c.tier           ?? c.floor ?? 1),
      slot:          slotLabel || String(c.slotName ?? c.slot ?? '—'),
      blockName:     String(c.blockName      ?? ''),
      yardType:      String(c.yardType       ?? ''),
      grossWeight:   c.grossWeight   != null ? String(c.grossWeight)   : '',
      declaredValue: c.declaredValue != null ? String(c.declaredValue) : '',
      sealNumber:    String(c.sealNumber ?? ''),
      note:          String(c.note ?? ''),
      statusName:    String(c.statusName ?? ''),
      rowNo:         c.rowNo != null ? Number(c.rowNo) : null,
      bayNo:         c.bayNo != null ? Number(c.bayNo) : null,
      tier:          c.tier  != null ? Number(c.tier)  : null,
      inActiveOrder: Boolean(c.inActiveOrder),
    };
  });
}

/**
 * GET /admin/containers/{id}/storage-bill
 * Preview storage fee before gate-out. Returns null on 404 (no storage record yet).
 */
export async function fetchStorageBill(containerId: string): Promise<StorageBill | null> {
  const res = await apiFetch(`/admin/containers/${encodeURIComponent(containerId)}/storage-bill`);
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const json: Rec = await res.json().catch(() => ({}));
  const d = json.data ?? json;
  if (!d) return null;
  return {
    containerId:   String(d.containerId ?? containerId),
    firstStoredAt: d.firstStoredAt ? String(d.firstStoredAt) : null,
    days:          Number(d.days ?? 0),
    billableDays:  Number(d.billableDays ?? d.days ?? 0),
    ratePerDay:    Number(d.ratePerDay ?? 0),
    subtotal:      Number(d.subtotal ?? 0),
    total:         Number(d.total ?? d.subtotal ?? 0),
    currency:      String(d.currency ?? 'VND'),
  };
}

/**
 * POST /admin/gate-out with containerId + optional note.
 * On success, refreshes the 3D occupancy grid (errors during refresh are swallowed
 * so the caller doesn't see a success mutation followed by a UI failure).
 */
export async function performGateOut(containerId: string, note?: string): Promise<void> {
  const body: Rec = { containerId };
  if (note && note.trim()) body.note = note.trim();

  const res = await apiFetch('/admin/gate-out', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = `Gate-out thất bại (HTTP ${res.status})`;
    try {
      const errJson = await res.json();
      const apiMsg = errJson?.message ?? errJson?.error ?? errJson?.data?.message;
      if (apiMsg) message = String(apiMsg);
    } catch {
      const text = await res.text().catch(() => '');
      if (text) message += ': ' + text;
    }
    throw new Error(message);
  }

  try {
    await refreshOccupancy();
  } catch {
    // DB update already succeeded — don't surface a UI-refresh error to the user.
  }
}

// ─── Waiting list ─────────────────────────────────────────────────────────────

/**
 * Fetch containers waiting for gate-in from approved admin orders.
 * Queries orders in statuses APPROVED / WAITING_CHECKIN / LATE_CHECKIN in parallel.
 *
 * Flattens each order's containerIds so the 3D gate-in flow can
 * open the exact container selected by admin approval.
 * Containers already in yard (status IN_YARD) are filtered out.
 */
export async function fetchWaitingContainers(): Promise<WaitingItem[]> {
  const validStatuses = ['APPROVED', 'WAITING_CHECKIN', 'LATE_CHECKIN'];

  const responses = await Promise.all(
    validStatuses.map((s) =>
      apiFetch(`/admin/orders?statusName=${s}&size=100&sortBy=createdAt&direction=desc`)
        .then((r) => (r.ok ? r.json() : Promise.resolve({ data: { content: [] } })))
        .catch(() => ({ data: { content: [] } })),
    ),
  );

  const rawItems: WaitingItem[] = [];
  for (const json of responses) {
    const orders = toList(json as Rec);
    for (const o of orders) {
      const containerIds = Array.isArray(o.containerIds) ? o.containerIds : [];
      const customerName = String(o.customerName ?? o.customerFullName ?? o.fullName ?? '');
      const cargoType = String(o.cargoTypeName ?? o.cargoType ?? '');
      const containerType = String(o.containerTypeName ?? o.containerType ?? '');
      const weight = String(o.grossWeight ?? o.weight ?? '');
      const orderDate = formatDate(String(o.createdAt ?? o.orderDate ?? ''));

      const items = containerIds.length > 0
        ? containerIds.map((containerCode: string) => ({
            orderId: Number(o.orderId ?? o.id ?? 0),
            containerCode: String(containerCode ?? ''),
            cargoType,
            containerType,
            weight,
            orderDate,
            customerName,
          }))
        : [{
            orderId: Number(o.orderId ?? o.id ?? 0),
            containerCode: String(o.containerCode ?? o.code ?? o.containerId ?? ''),
            cargoType,
            containerType,
            weight,
            orderDate,
            customerName,
          }];

      for (const it of items) if (it.containerCode) rawItems.push(it);
    }
  }

  // Drop containers already placed in yard so the waiting list only shows ones pending check-in.
  const checked = await Promise.all(rawItems.map(async (item) => {
    const status = await containerStatus(item.containerCode);
    return { item, status };
  }));

  return checked
    .filter(({ status }) => status !== 'IN_YARD')
    .map(({ item }) => item);
}
