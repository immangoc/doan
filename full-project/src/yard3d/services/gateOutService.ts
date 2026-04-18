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
    };
  });
}

/**
 * POST /admin/gate-out with containerId.
 * On success, refreshes the 3D occupancy grid.
 */
export async function performGateOut(containerId: string): Promise<void> {
  const res = await apiFetch('/admin/gate-out', {
    method: 'POST',
    body: JSON.stringify({ containerId }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gate-out thất bại (HTTP ${res.status})${body ? ': ' + body : ''}`);
  }

  await refreshOccupancy();
}

// ─── Waiting list ─────────────────────────────────────────────────────────────

/**
 * Fetch containers waiting for gate-in from approved admin orders.
 * GET /admin/orders?statusName=APPROVED&size=100
 *
 * Flattens each approved order's containerIds so the 3D gate-in flow can
 * open the exact container selected by admin approval.
 */
export async function fetchWaitingContainers(): Promise<WaitingItem[]> {
  const res = await apiFetch('/admin/orders?statusName=APPROVED&size=100&sortBy=createdAt&direction=desc');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json: Rec = await res.json();
  const orders = toList(json);

  const rawItems = orders.flatMap((o: Rec) => {
    const containerIds = Array.isArray(o.containerIds) ? o.containerIds : [];
    const customerName = String(o.customerName ?? o.customerFullName ?? o.fullName ?? '');
    const cargoType = String(o.cargoTypeName ?? o.cargoType ?? '');
    const containerType = String(o.containerTypeName ?? o.containerType ?? '');
    const weight = String(o.grossWeight ?? o.weight ?? '');
    const orderDate = formatDate(String(o.createdAt ?? o.orderDate ?? ''));

    return containerIds.length > 0
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
  }).filter((item) => item.containerCode);

  const checked = await Promise.all(rawItems.map(async (item) => {
    const status = await containerStatus(item.containerCode);
    return { item, status };
  }));

  return checked
    .filter(({ status }) => status === 'GATE_IN' || status === 'IN_YARD')
    .map(({ item }) => item);
}
