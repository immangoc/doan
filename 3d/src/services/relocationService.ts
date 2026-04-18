/**
 * Phase 8 — Optimization & Relocation.
 *
 * fetchRelocationRecommendations(): POST /admin/optimization/recommend → top-5 suggestions
 * relocateContainer():              POST /admin/yard/relocate
 * swapContainers():                 POST /admin/yard/swap
 */
import { apiFetch } from './apiClient';
import { refreshOccupancy } from './gateInService';
import type { SuggestedPosition } from '../data/containerStore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

// ─── WHType helper (duplicated from gateInService — not exported there) ────────
function inferWHType(yardType: string, yardName: string) {
  const t = (yardType ?? '').toLowerCase();
  const n = (yardName ?? '').toLowerCase();
  if (t === 'cold'    || n.includes('lạnh'))                   return 'cold'     as const;
  if (t === 'dry'     || n.includes('khô'))                    return 'dry'      as const;
  if (t === 'fragile' || n.includes('vỡ') || n.includes('dễ')) return 'fragile'  as const;
  return 'other' as const;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RelocationRecommendation extends SuggestedPosition {
  rank: number;
}

export interface RelocateParams {
  containerId: number;
  rowNo:   number;    // 1-based
  bayNo:   number;    // 1-based
  tier:    number;    // 1-based (floor)
  slotId?:  number;
  blockId?: number;
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * POST /admin/optimization/recommend with containerId + cargo info.
 * Returns top-5 results mapped to RelocationRecommendation[].
 */
export async function fetchRelocationRecommendations(
  containerId: number,
  cargoType:   string,
  weight:      string,
  sizeType:    '20ft' | '40ft',
): Promise<RelocationRecommendation[]> {
  const grossWeight = parseFloat(weight) || 0;

  const res = await apiFetch('/admin/optimization/recommend', {
    method: 'POST',
    body: JSON.stringify({
      containerId,
      cargoTypeName: cargoType,
      grossWeight,
      containerType: sizeType,
    }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json: Rec    = await res.json();
  const wrapper: Rec = (json.data ?? json) as Rec;
  // Backend wraps slot list in PlacementRecommendation.recommendations
  const list: Rec[]  = Array.isArray(wrapper.recommendations)
    ? wrapper.recommendations
    : Array.isArray(wrapper) ? wrapper : [];

  return list.slice(0, 5).map((top, idx) => {
    const rowNo    = Number(top.rowNo   ?? top.row  ?? 1);
    const bayNo    = Number(top.bayNo   ?? top.bay  ?? top.col ?? 1);
    const tier     = Number(top.recommendedTier ?? top.tier ?? top.tierNo ?? top.floor ?? 1);
    const yardType = String(top.yardType ?? top.whType ?? top.type ?? '');
    const yardName = String(top.yardName ?? top.whName ?? top.yard ?? '');
    const zoneName = String(top.zoneName ?? top.zone ?? 'Zone A');

    return {
      rank:       idx + 1,
      whType:     inferWHType(yardType, yardName),
      whName:     yardName,
      zone:       zoneName,
      floor:      tier,
      row:        rowNo - 1,
      col:        bayNo - 1,
      slot:       `R${rowNo}C${bayNo}`,
      sizeType,
      efficiency: Number(top.efficiency ?? top.finalScore ?? top.score ?? top.optimizationScore ?? 0),
      moves:      Number(top.moves ?? top.relocationsEstimated ?? top.relocations ?? 0),
      slotId:     top.slotId  != null ? Number(top.slotId)  : undefined,
      blockId:    top.blockId != null ? Number(top.blockId) : undefined,
    };
  });
}

/**
 * POST /admin/yard/relocate
 * On success, refreshes the 3D occupancy grid.
 */
export async function relocateContainer(params: RelocateParams): Promise<void> {
  const body: Rec = params.slotId != null
    ? { containerId: params.containerId, slotId: params.slotId, tier: params.tier }
    : {
        containerId: params.containerId,
        blockId:     params.blockId,
        rowNo:       params.rowNo,
        bayNo:       params.bayNo,
        tier:        params.tier,
      };

  const res = await apiFetch('/admin/yard/relocate', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Dời container thất bại (HTTP ${res.status})${text ? ': ' + text : ''}`);
  }

  await refreshOccupancy();
}

/**
 * POST /admin/yard/swap
 * On success, refreshes the 3D occupancy grid.
 */
export async function swapContainers(containerIdA: number, containerIdB: number): Promise<void> {
  const res = await apiFetch('/admin/yard/swap', {
    method: 'POST',
    body: JSON.stringify({ containerIdA, containerIdB }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Hoán đổi thất bại (HTTP ${res.status})${text ? ': ' + text : ''}`);
  }

  await refreshOccupancy();
}
