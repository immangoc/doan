/**
 * Module-level reactive store for yard structure data.
 * Uses the same subscribe/snapshot pattern as containerStore.ts so it is
 * compatible with useSyncExternalStore — including inside R3F Canvas trees.
 */
import { buildSlotGrid, mergeBlockGrids } from '../adapters/slotGridAdapter';
import type { ApiYard } from '../services/yardService';
import {
  ZONES as MOCK_ZONES,
  getGrid as mockGetGrid,
  countFilledSlots as mockCountFilledSlots,
  TOTAL_SLOTS as MOCK_TOTAL_SLOTS,
} from '../data/warehouse';
import type { WHType } from '../data/warehouse';

// ─── Processed types ──────────────────────────────────────────────────────────

export interface ProcessedZone {
  zoneId:     number;
  zoneName:   string;
  grid:       boolean[][];
  rows:       number;
  cols:       number;
  maxTier:    number;
  totalSlots: number;
}

export interface ProcessedYard {
  yardId:   number;
  yardName: string;
  whType:   WHType;
  zones:    ProcessedZone[];
}

// ─── WHType inference ─────────────────────────────────────────────────────────

function inferWHType(yardType: string, yardName: string): WHType {
  const t = (yardType ?? '').toLowerCase();
  const n = (yardName ?? '').toLowerCase();
  if (t === 'cold'    || n.includes('lạnh'))                    return 'cold';
  if (t === 'dry'     || n.includes('khô'))                     return 'dry';
  if (t === 'fragile' || n.includes('vỡ') || n.includes('dễ'))  return 'fragile';
  if (t === 'damaged' || n.includes('hỏng'))                    return 'damaged';
  return 'other';
}

// ─── Process raw API data → ProcessedYard[] ───────────────────────────────────

export function processApiYards(apiYards: ApiYard[]): ProcessedYard[] {
  return apiYards.map((yard) => {
    const whType = inferWHType(yard.yardType, yard.yardName);

    const zones: ProcessedZone[] = yard.zones.map((zone) => {
      // Use mergeBlockGrids to combine all blocks in the zone into one grid
      // totalSlots from adapter = Math.floor(groundSpots * 0.75) * maxTier — includes tier multiplier
      const { grid, rows, cols, maxTier, totalSlots } = mergeBlockGrids(
        zone.blocks.map((b) => b.slots)
      );
      return {
        zoneId:     zone.zoneId,
        zoneName:   zone.zoneName,
        grid,
        rows,
        cols,
        maxTier,
        totalSlots,
      };
    });

    return { yardId: yard.yardId, yardName: yard.yardName, whType, zones };
  });
}

// ─── Module-level store ───────────────────────────────────────────────────────

let yardData: ProcessedYard[] = [];
const listeners = new Set<() => void>();

export function subscribeYard(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getYardData(): ProcessedYard[] {
  return yardData;
}

export function setYardData(data: ProcessedYard[]): void {
  yardData = data;
  listeners.forEach((fn) => fn());
}

// ─── Pure helper functions (accept data snapshot as first arg) ────────────────
// These are called with the result of useSyncExternalStore(subscribeYard, getYardData)
// so they re-run whenever the store updates.

function findZone(
  yards: ProcessedYard[],
  whType: WHType,
  zoneName: string,
): ProcessedZone | undefined {
  return yards
    .find((y) => y.whType === whType)
    ?.zones.find((z) => z.zoneName === zoneName);
}

/** Zone names for a given warehouse type. Falls back to mock ZONES. */
export function getZoneNames(yards: ProcessedYard[], whType: WHType | string): string[] {
  const yard = yards.find((y) => y.whType === whType);
  if (yard && yard.zones.length > 0) return yard.zones.map((z) => z.zoneName);
  return whType === 'damaged' ? ['Zone A', 'Zone B'] : MOCK_ZONES;
}

/**
 * Slot existence grid for a zone. Falls back to mock seeded grid.
 * grid[row][col] = true means the slot exists in the backend structure.
 * Phase 4 will use this to show real occupancy.
 */
export function getZoneGrid(
  yards: ProcessedYard[],
  whType: WHType,
  zoneName: string,
): boolean[][] {
  const zone = findZone(yards, whType, zoneName);
  if (zone && zone.grid.length > 0) return zone.grid;
  // Fallback: mock seeded grid
  return mockGetGrid(whType, zoneName);
}

/**
 * Tier-filtered grid for a floor level.
 * Uses real grid as base; applies mock fill-rate for upper tiers until Phase 4.
 */
export function getZoneGridForFloor(
  yards: ProcessedYard[],
  whType: WHType,
  zoneName: string,
  floor: number,
): boolean[][] {
  const baseGrid = getZoneGrid(yards, whType, zoneName);
  if (floor <= 1) return baseGrid;
  if (whType === 'damaged') {
    return baseGrid.map(row => row.map(() => false));
  }

  // Apply seeded fill-rate for upper floors (Phase 4 will use real occupancy)
  const fillRate = floor === 2 ? 0.6 : floor === 3 ? 0.3 : 0.1;
  const sr = (n: number) => {
    const x = Math.sin(n * 31.7) * 43758.5453;
    return x - Math.floor(x);
  };

  // Need floor-1 grid to enforce stacking constraint
  const belowGrid = getZoneGridForFloor(yards, whType, zoneName, floor - 1);

  return baseGrid.map((row, ri) =>
    row.map((exists, ci) => {
      if (!exists) return false;
      if (!belowGrid[ri]?.[ci]) return false;
      return sr(floor * 100 + ri * 10 + ci) < fillRate;
    })
  );
}

/** Total slot count for a zone (all tiers). Uses real backend-derived capacity. */
export function getZoneTotalSlots(
  yards: ProcessedYard[],
  whType: WHType,
  zoneName: string,
): number {
  if (whType === 'damaged') return 24; // 1 tier: 16(20ft) + 8(40ft) = 24 containers
  const zone = findZone(yards, whType, zoneName);
  if (zone && zone.totalSlots > 0) return zone.totalSlots;
  return MOCK_TOTAL_SLOTS; // 96 fallback khi chưa có dữ liệu
}

/** Looks up the raw DB slotId given structural coordinates */
export function getSlotIdByCoords(
  apiYards: ApiYard[],
  whType: WHType,
  zoneName: string,
  _floor: number,
  row: number,
  col: number
): number | undefined {
  for (const y of apiYards) {
    if (inferWHType(y.yardType, y.yardName) !== whType) continue;
    for (const z of y.zones) {
      if (z.zoneName !== zoneName) continue;
      for (const b of z.blocks) {
        for (const s of b.slots) {
          // Backend is 1-based, Frontend is 0-based
          if (s.rowNo === row + 1 && s.bayNo === col + 1) {
            // Optional: tier check if maxTier logic defines specific DB logic per slot
            return s.slotId;
          }
        }
      }
    }
  }
  return undefined;
}

/** Returns whether the raw DB slot at given coords is locked. */
export function isSlotLockedByCoords(
  apiYards: ApiYard[],
  whType: WHType,
  zoneName: string,
  row: number,
  col: number
): { locked: boolean; slotId?: number; reason?: string | null; lockedAt?: string | null } {
  for (const y of apiYards) {
    if (inferWHType(y.yardType, y.yardName) !== whType) continue;
    for (const z of y.zones) {
      if (z.zoneName !== zoneName) continue;
      for (const b of z.blocks) {
        for (const s of b.slots) {
          if (s.rowNo === row + 1 && s.bayNo === col + 1) {
            return {
              locked: Boolean((s as any).locked),
              slotId: s.slotId,
              reason: (s as any).lockReason ?? null,
              lockedAt: (s as any).lockedAt ?? null,
            };
          }
        }
      }
    }
  }
  return { locked: false };
}

/**
 * Filled-slot count for a zone.
 * In Phase 3 this is the total slot count (all slots "exist" = all could be filled).
 * Phase 4 will replace this with actual occupancy from the backend.
 */
export function countZoneFilledSlots(
  yards: ProcessedYard[],
  whType: WHType,
  zoneName: string,
): number {
  if (yards.length === 0) {
    // Still loading — use mock count
    return mockCountFilledSlots(whType, zoneName);
  }
  // Phase 3: return total slots as "filled" count (structure loaded, occupancy pending Phase 4)
  // Phase 4 will use real occupancy
  return getZoneTotalSlots(yards, whType, zoneName);
}

/** Grid dimensions for a zone. Used to drive dynamic rendering loops. */
export function getZoneDims(
  yards: ProcessedYard[],
  whType: WHType,
  zoneName: string,
): { rows: number; cols: number; maxTier: number } {
  const zone = findZone(yards, whType, zoneName);
  if (zone && zone.grid.length > 0) {
    return { rows: zone.rows, cols: zone.cols, maxTier: zone.maxTier };
  }
  
  if (whType === 'damaged') return { rows: 4, cols: 8, maxTier: 1 };
  return { rows: 4, cols: 8, maxTier: 4 }; // fallback to mock dimensions
}

// Also export a convenience wrapper that reads from module-level store directly.
// Useful for the mock-fill seeded algorithm that runs inside useMemo.
export { buildSlotGrid };
