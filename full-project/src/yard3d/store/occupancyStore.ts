/**
 * Module-level reactive store for slot occupancy data (Phase 4).
 * Slot key: `${whType}/${zoneName}/${row}/${col}/${tier}`  (row/col 0-based, tier 1-based)
 * Uses the same subscribe/snapshot pattern as yardStore and containerStore,
 * so it is compatible with useSyncExternalStore inside R3F Canvas trees.
 */
import type { WHType } from '../data/warehouse';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SlotOccupancy {
  containerId:     number;
  containerCode:   string;
  cargoType:       string;
  weight:          string;       // formatted, e.g. "25000 kg"
  gateInDate:      string;       // formatted dd/MM/yyyy
  storageDuration: string;       // computed, e.g. "12 ngày", "3 tháng"
  sizeType:        '20ft' | '40ft';
  tier:            number;       // 1-based
  whName?:         string;
  zoneName?:       string;
  blockName?:      string;
  statusText?:     string;
  isOverdue?:      boolean;      // true when storageEndDate has passed and container still in yard
}

export type OccupancyMap = Map<string, SlotOccupancy>;

// ─── Key helpers ──────────────────────────────────────────────────────────────

export function makeSlotKey(
  whType: WHType | string,
  zoneName: string,
  row: number,
  col: number,
  tier: number,
): string {
  return `${whType}/${zoneName}/${row}/${col}/${tier}`;
}

// ─── Module-level store ───────────────────────────────────────────────────────

let occupancyData: OccupancyMap = new Map();
let occupancyFetched = false;
const listeners = new Set<() => void>();

export function subscribeOccupancy(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getOccupancyData(): OccupancyMap {
  return occupancyData;
}

/** True once setOccupancyData() has been called at least once (even with an empty map). */
export function isOccupancyFetched(): boolean {
  return occupancyFetched;
}

export function setOccupancyData(map: OccupancyMap): void {
  occupancyData = map;
  occupancyFetched = true;
  listeners.forEach((fn) => fn());
}

// ─── Pure helpers (accept snapshot as first arg) ──────────────────────────────

/** Get occupancy for a specific slot. Returns null if not occupied. */
export function getSlotOccupancy(
  map: OccupancyMap,
  whType: WHType | string,
  zoneName: string,
  row: number,
  col: number,
  tier: number,
): SlotOccupancy | null {
  return map.get(makeSlotKey(whType, zoneName, row, col, tier)) ?? null;
}

/**
 * Returns a boolean occupancy grid for a zone at a specific tier (1-based).
 * Only checks slots that exist in the provided existence grid.
 * Falls back to existenceGrid when no occupancy data is loaded yet.
 */
export function getOccupancyBoolGrid(
  map: OccupancyMap,
  whType: WHType | string,
  zoneName: string,
  tier: number,
  existenceGrid: boolean[][],
): boolean[][] {
  if (map.size === 0) return existenceGrid; // not loaded — caller should use mock
  return existenceGrid.map((row, ri) =>
    row.map((exists, ci) => {
      if (!exists) return false;
      return map.has(makeSlotKey(whType, zoneName, ri, ci, tier));
    })
  );
}

/** Count occupied slots across all tiers for a zone. */
export function countOccupiedZoneSlots(
  map: OccupancyMap,
  whType: WHType | string,
  zoneName: string,
): number {
  const prefix = `${whType}/${zoneName}/`;
  let count = 0;
  for (const key of map.keys()) {
    if (key.startsWith(prefix)) count++;
  }
  return count;
}
