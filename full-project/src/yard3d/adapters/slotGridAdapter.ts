import type { ApiSlot } from '../services/yardService';

/**
 * Result of converting a backend slot list into a 2D scene grid.
 *
 * Coordinate mapping — THIS IS THE ONLY PLACE where backend coords → scene coords:
 *   Backend  │  Scene
 *   ─────────┼──────────────────────────────────────────────
 *   rowNo    │  row  (grid row index, 0-based = rowNo - 1)
 *   bayNo    │  col  (grid col index, 0-based = bayNo - 1)
 *   maxTier  │  floor (1-based tier; max floors = maxTier)
 *
 * The 2D grid is boolean[][rows][cols] where true = slot exists.
 * Phase 4 will extend this to include occupancy (which slot has a container).
 */
export interface SlotGrid {
  grid: boolean[][];
  rows: number;
  cols: number;
  maxTier: number;
  totalSlots: number;
}

/** Convert a flat list of backend slots into a 2D boolean grid. */
export function buildSlotGrid(slots: ApiSlot[]): SlotGrid {
  if (slots.length === 0) {
    return { grid: [], rows: 0, cols: 0, maxTier: 0, totalSlots: 0 };
  }

  const rows    = Math.max(...slots.map((s) => s.rowNo));
  const cols    = Math.max(...slots.map((s) => s.bayNo));
  const maxTier = Math.max(...slots.map((s) => s.maxTier));

  // Initialise all slots as false (no container)
  const grid: boolean[][] = Array.from({ length: rows }, () =>
    new Array(cols).fill(false)
  );

  let groundSpots = 0;
  for (const slot of slots) {
    // rowNo / bayNo are 1-based in the backend → 0-based in scene
    if (!grid[slot.rowNo - 1][slot.bayNo - 1]) {
      grid[slot.rowNo - 1][slot.bayNo - 1] = true;
      groundSpots++;
    }
  }

  // Physical capacity = ground spots × 0.75 (accounting for 20ft vs 40ft mix) × max tier height
  const totalSlots = Math.floor(groundSpots * 0.75) * Math.max(1, maxTier);

  return { grid, rows, cols, maxTier, totalSlots };
}

/**
 * Merge slot lists from multiple blocks into a single zone grid.
 * Used when a zone has more than one block and we need one unified grid.
 */
export function mergeBlockGrids(blockSlotLists: ApiSlot[][]): SlotGrid {
  return buildSlotGrid(blockSlotLists.flat());
}
