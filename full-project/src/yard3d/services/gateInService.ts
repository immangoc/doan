/**
 * Phase 5 — Gate-In flow and position recommendation.
 *
 * fetchRecommendation(): POST /admin/optimization/recommend
 * confirmGateIn():
 *   Step 1 — POST /admin/gate-in           → get containerId
 *   Step 2 — POST /admin/containers/{id}/position → assign slot
 *   Step 3 — fetchAndSetOccupancy()        → refresh 3D grid
 */
import { apiFetch } from './apiClient';
import { getCachedYards } from './yardService';
import { fetchAndSetOccupancy } from './containerPositionService';
import type { SuggestedPosition } from '../data/containerStore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

// ─── WHType inference (same as yardStore / containerPositionService) ──────────

function inferWHType(yardType: string, yardName: string) {
  const t = (yardType ?? '').toLowerCase();
  const n = (yardName ?? '').toLowerCase();
  if (t === 'cold'    || n.includes('lạnh'))                    return 'cold' as const;
  if (t === 'dry'     || n.includes('khô'))                     return 'dry' as const;
  if (t === 'fragile' || n.includes('vỡ') || n.includes('dễ'))  return 'fragile' as const;
  if (t === 'damaged' || n.includes('hỏng'))                    return 'damaged' as const;
  return 'other' as const;
}

// ─── Occupancy refresh ────────────────────────────────────────────────────────

/** Re-fetches all IN_YARD containers and their positions to update the 3D grid. */
export async function refreshOccupancy(): Promise<void> {
  const yards = getCachedYards();
  if (yards.length > 0) {
    await fetchAndSetOccupancy(yards);
  }
}

// ─── Recommendation ───────────────────────────────────────────────────────────

/**
 * Calls POST /admin/optimization/recommend and maps the top-1 result to
 * SuggestedPosition so the existing UI card can display it without changes.
 */
export async function fetchRecommendation(
  cargoType:  string,
  weight:     string,
  sizeType:   '20ft' | '40ft',
): Promise<SuggestedPosition | null> {
  const grossWeight = parseFloat(weight) || 0;

  const res = await apiFetch('/admin/optimization/recommend', {
    method: 'POST',
    body: JSON.stringify({
      cargoTypeName:  cargoType,
      grossWeight,
      containerType:  sizeType,
    }),
  });

  if (!res.ok) throw new Error(`Gợi ý vị trí thất bại (HTTP ${res.status})`);

  const json: Rec    = await res.json();
  const wrapper: Rec = (json.data ?? json) as Rec;
  // Backend wraps slot list in PlacementRecommendation.recommendations
  const list: Rec[]  = Array.isArray(wrapper.recommendations)
    ? wrapper.recommendations
    : Array.isArray(wrapper) ? wrapper : [];
  if (list.length === 0) return null;

  // For 40ft: prefer slots in right-half cols (bay > 4, 1-based).
  // For 20ft: any bay is fine.
  const matchingGeo = list.find((r) => {
    const bay = Number(r.bayNo ?? r.bay ?? r.col ?? 1);
    return sizeType === '40ft' ? bay > 4 : bay <= 4;
  });

  // Fallback to first item when no perfect match
  const top: Rec = matchingGeo ?? list[0];

  const rawRowNo  = Number(top.rowNo   ?? top.row  ?? 1);
  let   rawBayNo  = Number(top.bayNo   ?? top.bay  ?? top.col ?? 1);
  const tier      = Number(top.recommendedTier ?? top.tier ?? top.tierNo ?? top.floor ?? 1);
  const yardType  = String(top.yardType ?? top.whType ?? top.type ?? '');
  const yardName  = String(top.yardName ?? top.whName ?? top.yard ?? '');
  const apiZone   = String(top.zoneName ?? top.zone ?? '');
  const rawSlotId = top.slotId  != null ? Number(top.slotId)  : undefined;
  const rawBlockId= top.blockId != null ? Number(top.blockId) : undefined;

  // ── Resolve scene coordinates from slotId ──────────────────────────────────
  // yardService.ts hardcodes zone names as "Zone A", "Zone B", "Zone C".
  // The recommendation API may return a different zone name (e.g. "A3", "Bãi A").
  // We look up slotId in the cached yards to get the authoritative scene zone/row/col.
  let sceneZone = apiZone || 'Zone A';
  let sceneRow  = rawRowNo - 1;   // 0-based
  let sceneBay  = rawBayNo;       // 1-based, will be adjusted below

  if (rawSlotId != null) {
    const cachedYards = getCachedYards();
    outer: for (const yard of cachedYards) {
      for (let zi = 0; zi < yard.zones.length; zi++) {
        const zone = yard.zones[zi];
        for (const block of zone.blocks) {
          const slot = block.slots.find((s) => s.slotId === rawSlotId);
          if (slot) {
            sceneZone = zone.zoneName; // "Zone A", "Zone B", "Zone C"
            sceneRow  = slot.rowNo - 1;
            sceneBay  = slot.bayNo;    // keep 1-based for constraint enforcement below
            break outer;
          }
        }
      }
    }
  }

  // Enforce column constraints (1-based bayNo):
  // 40ft → right-half (bayNo >= 5); 20ft → left-half (bayNo <= 4)
  let correctedSlotId = rawSlotId;
  if (sizeType === '40ft' && sceneBay <= 4) {
    sceneBay = 5;
    // Re-resolve slotId for the corrected bay
    const whType = inferWHType(yardType, yardName);
    const cachedYards = getCachedYards();
    for (const yard of cachedYards) {
      if (inferWHType(yard.yardType, yard.yardName) !== whType) continue;
      for (const zone of yard.zones) {
        if (zone.zoneName !== sceneZone) continue;
        for (const block of zone.blocks) {
          const slot = block.slots.find(s => s.rowNo === sceneRow + 1 && s.bayNo === sceneBay);
          if (slot) { correctedSlotId = slot.slotId; break; }
        }
      }
    }
  }
  if (sizeType === '20ft' && sceneBay > 4) {
    sceneBay = 4;
    const whType = inferWHType(yardType, yardName);
    const cachedYards = getCachedYards();
    for (const yard of cachedYards) {
      if (inferWHType(yard.yardType, yard.yardName) !== whType) continue;
      for (const zone of yard.zones) {
        if (zone.zoneName !== sceneZone) continue;
        for (const block of zone.blocks) {
          const slot = block.slots.find(s => s.rowNo === sceneRow + 1 && s.bayNo === sceneBay);
          if (slot) { correctedSlotId = slot.slotId; break; }
        }
      }
    }
  }

  const colIndex = sceneBay - 1; // 0-based for scene rendering

  return {
    whType:    inferWHType(yardType, yardName),
    whName:    yardName || cargoType,
    zone:      sceneZone,
    floor:     tier,
    row:       sceneRow,
    col:       colIndex,
    slot:      `R${sceneRow + 1}C${sceneBay}`,
    sizeType,
    efficiency: Number(top.efficiency ?? top.finalScore ?? top.score ?? top.optimizationScore ?? 0) || 0,
    moves:      Number(top.moves ?? top.relocationsEstimated ?? top.relocations ?? 0),
    slotId:     correctedSlotId,
    blockId:    rawBlockId,
  };
}

// ─── Yard ID resolver ────────────────────────────────────────────────────────

/**
 * Looks up the yardId from cached yards by exact yardName, falling back to
 * inferred WHType. Returns 0 if no match (caller should validate).
 */
export function resolveYardId(whName: string, whType: string): number {
  const yards = getCachedYards();
  const byName = yards.find((y) => y.yardName === whName);
  if (byName) return byName.yardId;
  const byType = yards.find((y) => inferWHType(y.yardType, y.yardName) === whType);
  return byType?.yardId ?? 0;
}

// ─── Gate-in params ───────────────────────────────────────────────────────────

export interface GateInParams {
  containerCode:      string;
  cargoType:          string;
  sizeType:           '20ft' | '40ft';
  weight:             string;
  exportDate:         string;
  priority:           string;
  yardId:             number;   // required — resolved from recommendation or zone selection
  slotId:             number;   // required — from recommendation (POST /admin/containers/{id}/position)
  tier:               number;   // 1-based (floor / recommendedTier)
  /** When true (container selected from waiting list), skip existence check/creation — container already exists. */
  skipContainerCheck?: boolean;
}

// ─── Gate-in 3-step flow ──────────────────────────────────────────────────────

/**
 * Correct 4-step gate-in flow:
 *  Step 1 — Ensure container exists in DB (create if 404)
 *  Step 2 — POST /admin/gate-in { containerId, yardId }
 *  Step 3 — POST /admin/containers/{containerId}/position { slotId, tier }
 *  Step 4 — refreshOccupancy() — updates 3D grid in all scenes
 *
 * Throws a descriptive Error string if any step fails.
 */
export async function confirmGateIn(params: GateInParams): Promise<void> {
  const containerCode = params.containerCode || `CTN-${Date.now()}`;

  if (!params.slotId) {
    throw new Error('Chưa có vị trí khả dụng — vui lòng lấy gợi ý vị trí trước khi xác nhận');
  }
  if (!params.yardId) {
    throw new Error('Không xác định được kho đích — vui lòng thử lại');
  }

  // ── Step 1: Ensure container exists ──────────────────────────────────────────
  let skipGateIn = false;
  let confirmedContainerId = containerCode;

  // Always check container status first (even from waiting list)
  const checkRes = await apiFetch(`/admin/containers/${encodeURIComponent(containerCode)}`);
  if (checkRes.status === 404) {
    if (params.skipContainerCheck) {
      // Container from waiting list doesn't exist yet — this shouldn't happen,
      // but we can create it
    }
    // Container not registered yet — create it
    let cargoTypeId = 1; // Hàng Khô
    const ctLower = (params.cargoType ?? '').toLowerCase();
    if (ctLower.includes('lạnh')) cargoTypeId = 2;
    else if (ctLower.includes('vỡ') || ctLower.includes('dễ')) cargoTypeId = 3;
    else if (ctLower.includes('khác')) cargoTypeId = 4;
    
    const containerTypeId = params.sizeType === '40ft' ? 2 : 1;

    const createRes = await apiFetch('/admin/containers', {
      method: 'POST',
      body: JSON.stringify({
        containerId: containerCode,
        grossWeight: parseFloat(params.weight) || 0,
        cargoTypeId,
        containerTypeId,
      }),
    });
    if (!createRes.ok) {
      const body = await createRes.text().catch(() => '');
      throw new Error(`Tạo container thất bại (HTTP ${createRes.status})${body ? ': ' + body : ''}`);
    }
  } else if (checkRes.ok) {
    const cJson = await checkRes.json().catch(() => ({})) as Rec;
    const cData = (cJson.data ?? cJson) as Rec;
    const status = String(cData.statusName ?? cData.status ?? '').toUpperCase();
    confirmedContainerId = String(cData.containerId ?? containerCode);
    if (status === 'GATE_IN' || status === 'IN_YARD') {
      skipGateIn = true;
    }
  } else if (!params.skipContainerCheck) {
    const body = await checkRes.text().catch(() => '');
    throw new Error(`Kiểm tra container thất bại (HTTP ${checkRes.status})${body ? ': ' + body : ''}`);
  }

  // ── Step 2: Gate-in ───────────────────────────────────────────────────────────
  if (!skipGateIn) {
    const gateInRes = await apiFetch('/admin/gate-in', {
      method: 'POST',
      body: JSON.stringify({
        containerId: confirmedContainerId,
        yardId:      params.yardId,
      }),
    });
    if (!gateInRes.ok) {
      const body = await gateInRes.text().catch(() => '');
      // If backend says container already has a gate-in record, just continue
      if (gateInRes.status === 400 && (body.includes('already has a gate-in') || body.includes('BOOKING_ALREADY_PROCESSED'))) {
        skipGateIn = true;
      } else {
        throw new Error(`Gate-in thất bại (HTTP ${gateInRes.status})${body ? ': ' + body : ''}`);
      }
    } else {
      const gateInJson = await gateInRes.json().catch(() => ({})) as Rec;
      const gateInData = (gateInJson.data ?? gateInJson) as Rec;
      confirmedContainerId = String(gateInData.containerId ?? confirmedContainerId);
    }
  }

  // ── Step 3: Create Placement Task ───────────────────────────────────────────────────
  const posRes = await apiFetch(`/admin/placement-tasks/containers/${encodeURIComponent(confirmedContainerId)}`, {
    method: 'POST',
    body: JSON.stringify({
      slotId: params.slotId,
      tier:   params.tier,
    }),
  });
  if (!posRes.ok) {
    const body = await posRes.text().catch(() => '');
    throw new Error(`Tạo lệnh xếp chỗ thất bại (HTTP ${posRes.status})${body ? ': ' + body : ''}`);
  }

  // ── Step 4: Refresh 3D grid ───────────────────────────────────────────────────
  await refreshOccupancy();

  // ── Step 5: Update the order status to IMPORTED (Đã nhập kho) ───────────────
  // If this container was picked from the waiting list (skipContainerCheck = true),
  // find the associated order and move it to IMPORTED status.
  if (params.skipContainerCheck) {
    try {
      // Find orders by container code to locate the order ID
      const ordersRes = await apiFetch(`/admin/orders?keyword=${encodeURIComponent(containerCode)}&size=10`);
      if (ordersRes.ok) {
        const ordersJson = await ordersRes.json().catch(() => ({})) as Rec;
        const ordersData = ordersJson.data ?? ordersJson;
        const orders = Array.isArray(ordersData) ? ordersData : (ordersData.content ?? []);
        for (const order of orders as Rec[]) {
          const status = String(order.statusName ?? '').toUpperCase();
          const containers = Array.isArray(order.containerIds) ? order.containerIds : [];
          if (['WAITING_CHECKIN', 'LATE_CHECKIN', 'READY_FOR_IMPORT', 'APPROVED'].includes(status)
              && containers.some((c: string) => c === containerCode)) {
            await apiFetch(`/admin/orders/${order.orderId}/status`, {
              method: 'PUT',
              body: JSON.stringify({ statusName: 'IMPORTED' }),
            }).catch(() => {}); // non-critical
          }
        }
      }
    } catch {
      // Order status update is best-effort — gate-in already succeeded
    }
  }
}
