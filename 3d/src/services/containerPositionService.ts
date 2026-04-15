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
  statusName:    string;
}

interface ContainerPosition {
  containerId: string; // container code string (the request ID)
  slotId?:     number;
  blockId?:    number;
  rowNo:       number;
  bayNo:       number;
  tier:        number;
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

async function fetchContainersByStatus(statusName: string): Promise<ContainerInfo[]> {
  const res = await apiFetch(`/admin/containers?statusName=${encodeURIComponent(statusName)}&size=500`);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching containers (${statusName})`);
  const json: Rec = await res.json();
  const data: unknown = json.data ?? json;
  const list: Rec[] = Array.isArray(data)
    ? (data as Rec[])
    : Array.isArray((data as Rec).content) ? (data as Rec).content as Rec[] : [];

  return list.map((c: Rec) => {
    const rawWeight = c.weight ?? c.grossWeight ?? c.totalWeight ?? null;
    const weightStr = rawWeight != null ? `${rawWeight} kg` : '—';
    // Try multiple field names the backend may use for container size/type.
    // Some APIs may return containerTypeId (1=20ft, 2=40ft) instead of a string name.
    const typeIdRaw =
      c.containerTypeId ??
      c.containerTypeID ??
      c.container_type_id ??
      (typeof c.containerType === 'number' ? c.containerType : null) ??
      c.containerType?.id ??
      null;
    const typeId = typeIdRaw != null && !isNaN(Number(typeIdRaw)) ? Number(typeIdRaw) : null;
    const sizeRaw = String(
      c.sizeType ??
      c.containerSize ??
      c.containerTypeName ??
      c.containerType?.name ??
      c.containerType ??
      c.size ??
      ''
    );
    // ContainerResponse.containerId is the container CODE string (e.g. "CTN-001"),
    // not a numeric DB id. Use it as containerCode for API calls.
    const code = String(c.containerId ?? c.containerCode ?? c.code ?? c.containerNumber ?? c.containerNo ?? '');
    const gateInRaw = String(
      c.gateInDate ??
      c.gateInTime ??
      c.createdAt ??
      c.importDate ??
      c.arrivalDate ??
      c.checkInDate ??
      ''
    );
    return {
      containerId:   code.split('').reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) & 0xffffff, 0),
      containerCode: code,
      cargoType:     String(c.cargoType ?? c.cargoTypeName ?? c.cargo ?? ''),
      weight:        weightStr,
      gateInDate:    gateInRaw,
      // '40ft' if any size field contains "40" OR containerTypeId indicates 40ft; otherwise '20ft'
      sizeType:      (typeId === 2 || sizeRaw.toUpperCase().includes('40')) ? '40ft' : '20ft',
      statusName:    String(c.statusName ?? c.status ?? statusName ?? ''),
    };
  });
}

async function fetchContainersForOccupancy(): Promise<ContainerInfo[]> {
  const [inYard, damaged] = await Promise.all([
    fetchContainersByStatus('IN_YARD'),
    fetchContainersByStatus('DAMAGED'),
  ]);

  // Merge by containerCode (backend containerId is the code string)
  const map = new Map<string, ContainerInfo>();
  for (const c of [...inYard, ...damaged]) {
    if (!c.containerCode) continue;
    map.set(c.containerCode, c);
  }
  return Array.from(map.values());
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

  const containers = await fetchContainersForOccupancy();
  if (containers.length === 0) {
    // No containers — mark occupancy as loaded so scenes show empty grid, not mock
    setOccupancyData(new Map());
    return;
  }

  const ids       = containers.map((c) => c.containerCode);
  const positions = await fetchPositionsInBatches(ids);

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

    // If a container is marked DAMAGED, only show it in the damaged yard diagram.
    // This keeps 2D and 3D consistent: once it is "moved to kho hỏng" logically,
    // it must disappear from normal yards.
    const st = (ctn.statusName ?? '').toUpperCase();
    if (st === 'DAMAGED' && coords.whType !== 'damaged') {
      continue;
    }

    const key: string = makeSlotKey(
      coords.whType, coords.zoneName,
      coords.row, coords.col,
      pos.tier,
    );

    const occ: SlotOccupancy = {
      containerId:     ctn.containerId,
      containerCode:   ctn.containerCode,
      cargoType:       ctn.cargoType,
      weight:          ctn.weight,
      gateInDate:      formatDate(ctn.gateInDate),
      storageDuration: computeStorageDuration(ctn.gateInDate),
      sizeType:        ctn.sizeType,
      tier:            pos.tier,
    };

    map.set(key, occ);

    // NOTE:
    // UI layout treats bays 5..8 as dedicated 40ft slots (one bay = one 40ft position),
    // so we DO NOT mirror 40ft across adjacent bays in the occupancy map.
  }

  setOccupancyData(map);
}
