/**
 * Phase 4 — Fetches real container positions from the backend and populates
 * the occupancyStore with slot-level occupancy data.
 *
 * Flow:
 *  1. GET /admin/containers?statusName=IN_YARD&size=500  → list of containers
 *  2. GET /admin/containers/{id}/position  (batched, max 20 in parallel)
 *  3. Cross-reference (slotId / blockId + rowNo + bayNo) with the reverse map
 *     built from the raw ApiYard[] returned by fetchAllYards().
 *  4. Call setOccupancyData() to push the result into the reactive store.
 */
import { apiFetch } from './apiClient';
import type { ApiYard } from './yardService';
import type { WHType } from '../data/warehouse';
import {
  makeSlotKey, setOccupancyData,
} from '../store/occupancyStore';
import type { SlotOccupancy, OccupancyMap } from '../store/occupancyStore';

// ─── Internal types ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

interface ContainerInfo {
  containerId:   number;
  containerCode: string;
  cargoType:     string;
  weight:        string;
  gateInDate:    string;
  sizeType:      '20ft' | '40ft';
}

interface ContainerPosition {
  containerId: string; // container code string (the request ID)
  slotId?:     number;
  blockId?:    number;
  rowNo:       number;
  bayNo:       number;
  tier:        number;
  whName?:     string;
  zoneName?:   string;
  blockName?:  string;
  statusText?: string;
}

interface SlotCoords {
  whType:   WHType;
  zoneName: string;
  row:      number; // 0-based
  col:      number; // 0-based
}

// ─── WHType inference (mirrors yardStore.ts) ──────────────────────────────────

function inferWHType(yardType: string, yardName: string): WHType {
  const t = (yardType ?? '').toLowerCase();
  const n = (yardName ?? '').toLowerCase();
  if (t === 'cold'    || n.includes('lạnh'))                    return 'cold';
  if (t === 'dry'     || n.includes('khô'))                     return 'dry';
  if (t === 'fragile' || n.includes('vỡ') || n.includes('dễ'))  return 'fragile';
  if (t === 'damaged' || n.includes('hỏng'))                    return 'damaged';
  return 'other';
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatDate(raw: string): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function computeStorageDuration(rawDate: string): string {
  if (!rawDate) return '—';
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return '—';
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days < 1)  return 'Hôm nay';
  if (days < 30) return `${days} ngày`;
  return `${Math.floor(days / 30)} tháng`;
}

// ─── Reverse map: slotId / blockId → scene coordinates ───────────────────────

function buildReverseMap(yards: ApiYard[]): {
  bySlotId:  Map<number, SlotCoords>;
  byBlockId: Map<number, { whType: WHType; zoneName: string }>;
} {
  const bySlotId  = new Map<number, SlotCoords>();
  const byBlockId = new Map<number, { whType: WHType; zoneName: string }>();

  for (const yard of yards) {
    const whType = inferWHType(yard.yardType, yard.yardName);
    for (const zone of yard.zones) {
      for (const block of zone.blocks) {
        byBlockId.set(block.blockId, { whType, zoneName: zone.zoneName });
        for (const slot of block.slots) {
          bySlotId.set(slot.slotId, {
            whType,
            zoneName: zone.zoneName,
            row: slot.rowNo - 1, // backend 1-based → scene 0-based
            col: slot.bayNo - 1,
          });
        }
      }
    }
  }

  return { bySlotId, byBlockId };
}

// ─── Fetch containers in yard ─────────────────────────────────────────────────

async function fetchContainersInYard(): Promise<ContainerInfo[]> {
  // Lấy mọi container đang có vị trí trong kho — IN_YARD (kho thường), DAMAGED_PENDING
  // (đã báo, chưa di chuyển), DAMAGED (đã chuyển vào kho hỏng).
  const statuses = ['IN_YARD', 'DAMAGED_PENDING', 'DAMAGED'];
  const responses = await Promise.all(
    statuses.map((s) => apiFetch(`/admin/containers?statusName=${s}&size=2000`)),
  );

  const list: Rec[] = [];
  for (const res of responses) {
    if (!res.ok) continue;
    const json: Rec = await res.json();
    const data: unknown = json.data ?? json;
    const arr: Rec[] = Array.isArray(data)
      ? (data as Rec[])
      : Array.isArray((data as Rec).content) ? (data as Rec).content as Rec[] : [];
    list.push(...arr);
  }

  return list.map((c: Rec) => {
    const rawWeight = c.weight ?? c.grossWeight ?? c.totalWeight ?? null;
    const weightStr = rawWeight != null ? `${rawWeight} kg` : '—';
    // Try multiple field names the backend may use for container size/type
    const sizeRaw   = String(
      c.sizeType ?? c.containerSize ?? c.containerType ?? c.containerTypeName ?? c.size ?? ''
    );
    // ContainerResponse.containerId is the container CODE string (e.g. "CTN-001"),
    // not a numeric DB id. Use it as containerCode for API calls.
    const code = String(c.containerId ?? c.containerCode ?? c.code ?? c.containerNumber ?? c.containerNo ?? '');
    const gateInRaw = String(c.gateInDate ?? c.importDate ?? c.arrivalDate ?? c.checkInDate ?? c.createdAt ?? c.updatedAt ?? '');
    return {
      containerId:   code.split('').reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) & 0xffffff, 0),
      containerCode: code,
      cargoType:     String(c.cargoType ?? c.cargoTypeName ?? c.cargo ?? ''),
      weight:        weightStr,
      gateInDate:    gateInRaw,
      // '40ft' if any size field contains "40"; otherwise '20ft'
      sizeType:      sizeRaw.toUpperCase().includes('40') ? '40ft' : '20ft',
    };
  });
}

// ─── Fetch overdue container IDs ─────────────────────────────────────────────

async function fetchOverdueContainerIds(): Promise<Set<string>> {
  try {
    const res = await apiFetch('/admin/containers/overdue');
    if (!res.ok) return new Set();
    const json: Rec = await res.json();
    const data: unknown = json.data ?? json;
    const list: string[] = Array.isArray(data) ? (data as string[]) : [];
    return new Set(list.map(String));
  } catch {
    return new Set();
  }
}

// ─── Fetch one container position ─────────────────────────────────────────────

async function fetchOnePosition(id: string): Promise<ContainerPosition | null> {
  try {
    const res = await apiFetch(`/admin/containers/${id}/position`);
    if (!res.ok) return null;
    const json: Rec = await res.json();
    const d: Rec = json.data ?? json;
    return {
      containerId: id,
      slotId:  d.slotId  != null ? Number(d.slotId)  : undefined,
      blockId: d.blockId != null ? Number(d.blockId) : undefined,
      rowNo:   Number(d.rowNo  ?? d.row  ?? 1),
      bayNo:   Number(d.bayNo  ?? d.bay  ?? d.col ?? 1),
      tier:    Number(d.tier   ?? d.tierNo ?? d.tiers ?? d.floor ?? 1),
      whName:  String(d.whName ?? d.yardName ?? d.warehouseName ?? ''),
      zoneName:String(d.zoneName ?? d.zone ?? ''),
      blockName:String(d.blockName ?? d.block ?? ''),
      statusText:String(d.statusName ?? d.status ?? 'Trong kho'),
    };
  } catch {
    return null;
  }
}

// ─── Batch fetching (max 20 in parallel) ──────────────────────────────────────

async function fetchPositionsInBatches(
  ids: string[],
): Promise<(ContainerPosition | null)[]> {
  const BATCH = 20;
  const results: (ContainerPosition | null)[] = [];

  for (let i = 0; i < ids.length; i += BATCH) {
    // TODO: replace with GET /admin/blocks/{blockId}/occupancy when backend adds bulk endpoint
    const batch = ids.slice(i, i + BATCH);
    const batchResults = await Promise.all(batch.map(fetchOnePosition));
    results.push(...batchResults);
  }

  return results;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Fetches all IN_YARD containers + their positions (batched),
 * cross-references them with the raw yard structure, and calls setOccupancyData().
 * Called from App.tsx after fetchAllYards() succeeds.
 * Errors are swallowed — scenes fall back to mock seeded data.
 */
export async function fetchAndSetOccupancy(yards: ApiYard[]): Promise<void> {
  const { bySlotId, byBlockId } = buildReverseMap(yards);

  const containers = await fetchContainersInYard();

  const ids       = containers.map((c) => c.containerCode);
  const [positions, overdueIds, pendingTasksRes] = await Promise.all([
    fetchPositionsInBatches(ids),
    fetchOverdueContainerIds(),
    apiFetch('/admin/placement-tasks/pending').catch(() => null),
  ]);

  const map: OccupancyMap = new Map();

  for (let i = 0; i < containers.length; i++) {
    const ctn = containers[i];
    const pos = positions[i];
    if (!pos) continue;

    // Resolve backend coordinates → scene coordinates
    let coords: SlotCoords | null = null;

    if (pos.slotId != null) {
      coords = bySlotId.get(pos.slotId) ?? null;
    }

    if (!coords && pos.blockId != null) {
      const zoneInfo = byBlockId.get(pos.blockId);
      if (zoneInfo) {
        coords = {
          whType:   zoneInfo.whType,
          zoneName: zoneInfo.zoneName,
          row:      pos.rowNo - 1, // backend 1-based → scene 0-based
          col:      pos.bayNo - 1,
        };
      }
    }

    if (!coords) continue;

    const key: string = makeSlotKey(
      coords.whType, coords.zoneName,
      coords.row, coords.col,
      pos.tier,
    );

    const gateInDate = formatDate(ctn.gateInDate);
    const storageDuration = computeStorageDuration(ctn.gateInDate);
    const occ: SlotOccupancy = {
      containerId:     ctn.containerId,
      containerCode:   ctn.containerCode,
      cargoType:       ctn.cargoType,
      weight:          ctn.weight,
      gateInDate,
      storageDuration,
      sizeType:        ctn.sizeType,
      tier:            pos.tier,
      whName:          pos.whName ?? '',
      zoneName:        pos.zoneName ?? '',
      blockName:       pos.blockName ?? '',
      statusText:      pos.statusText ?? 'Trong kho',
      isOverdue:       overdueIds.has(ctn.containerCode),
    };

    map.set(key, occ);
  }

  // Overlay pending placement tasks so they show up immediately after gate-in
  let pendingTasks: Rec[] = [];
  if (pendingTasksRes && pendingTasksRes.ok) {
    const json = await pendingTasksRes.json().catch(() => ({}));
    pendingTasks = (json.data ?? json) as Rec[];
  }

  for (const task of pendingTasks) {
    const slotId = Number(task.slotId);
    if (!slotId) continue;
    
    const coords = bySlotId.get(slotId);
    if (!coords) continue;
    
    const tier = Number(task.tier ?? 1);
    const key = makeSlotKey(coords.whType, coords.zoneName, coords.row, coords.col, tier);
    
    const gateInDate = formatDate(task.createdAt);
    const weightStr = task.grossWeight ? `${task.grossWeight} kg` : '—';
    const cType = String(task.containerType ?? '');
    const code = String(task.containerId ?? '');
    
    const occ: SlotOccupancy = {
      containerId:     code.split('').reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) & 0xffffff, 0),
      containerCode:   code,
      cargoType:       String(task.cargoType ?? ''),
      weight:          weightStr,
      gateInDate,
      storageDuration: 'Chờ xếp chỗ',
      sizeType:        cType.toUpperCase().includes('40') ? '40ft' : '20ft',
      tier:            tier,
      whName:          String(task.yardName ?? ''),
      zoneName:        String(task.zoneName ?? ''),
      blockName:       String(task.blockName ?? ''),
      statusText:      'Đang chờ xếp chỗ',
      isOverdue:       false,
      isPendingPlacement: true,
    };
    
    map.set(key, occ);
  }

  setOccupancyData(map);
}
