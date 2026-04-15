import type { OccupancyMap, SlotOccupancy } from '../store/occupancyStore';
import { getSlotOccupancy } from '../store/occupancyStore';
import type { WHType } from '../data/warehouse';

export function isRowPairAnchorRow1Based(row1: number): boolean {
  return row1 % 2 === 1;
}

/** Normalize a 1-based row to the anchor row (odd) of its row-pair. */
export function normalizeRowPairAnchorRow1Based(row1: number): number {
  if (row1 <= 1) return 1;
  return row1 % 2 === 0 ? row1 - 1 : row1;
}

export function pairedRow1Based(anchorRow1: number): number {
  return anchorRow1 + 1;
}

/**
 * Model A support lookup:
 * returns occupancy from either row in the pair at same bay/col.
 * Input row/col are 0-based; tier is 1-based.
 */
export function getSupportInRowPair(
  map: OccupancyMap,
  whType: WHType | string,
  zoneName: string,
  row0: number,
  col0: number,
  tier: number,
): SlotOccupancy | null {
  const direct = getSlotOccupancy(map, whType, zoneName, row0, col0, tier);
  if (direct) return direct;
  const up = row0 > 0 ? getSlotOccupancy(map, whType, zoneName, row0 - 1, col0, tier) : null;
  if (up?.sizeType === '40ft') return up;
  const down = getSlotOccupancy(map, whType, zoneName, row0 + 1, col0, tier);
  if (down?.sizeType === '40ft') return down;
  return null;
}

