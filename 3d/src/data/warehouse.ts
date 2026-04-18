// ─── Shared warehouse data – single source of truth ─────────────────────────
// Used by 2D, 3D, and Overview pages

import type { ContainerStatus } from '../components/3d/ContainerBlock';

// ─── Types ───────────────────────────────────────────────────────────────────
export type WHType = 'cold' | 'dry' | 'fragile' | 'other' | 'damaged';

export interface ZoneInfo {
  name: string;
  type: string;
  fillRate: number;
  emptySlots: number;
  totalSlots: number;
  recentContainers: string[];
}

export interface WHConfig {
  id: WHType;
  name: string;
  status: ContainerStatus;
  color: string;
  bgColor: string;
  plateColor: string;
  emptyColor: string;
  emptyBorder: string;
  totalFloors: number;
  hasTemp?: boolean;
  temp?: string;
  recentContainers: string[];
}

export interface WHStat {
  id: WHType;
  name: string;
  color: string;
  bgColor: string;
  pct: string;
  empty: number;
}

export interface SlotInfo {
  filled: boolean;
  label: string;
  type: '20ft' | '40ft';
  cargo?: string;
  weight?: string;
  temp?: string;
  originalType?: string;
  row?: number;
  col?: number;
  floor?: number;
}

export interface WaitingContainer {
  code: string;
  type: string;
  date: string;
}

export interface ExportContainer {
  code: string;
  type: string;
  zone: string;
  wh: string;
  floor: number;
  slot: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
/** @deprecated Phase 3 — use getZoneNames() from yardStore. Kept as fallback. */
export const ZONES = ['Zone A', 'Zone B', 'Zone C'];

/** @deprecated Phase 3 — use getZoneTotalSlots() from yardStore. Kept as fallback. */
export const TOTAL_SLOTS = 96; // 16x20ft + 8x40ft = 24 containers/floor × 4 floors
export const WARNING_THRESHOLD = 0.9;

// ─── Warehouse config (unified) ─────────────────────────────────────────────
export const WAREHOUSES: WHConfig[] = [
  {
    id: 'cold', name: 'Kho Lạnh', status: 'cold',
    color: '#3B82F6', bgColor: '#EFF6FF', plateColor: '#BFDBFE',
    emptyColor: '#DBEAFE', emptyBorder: '#BFDBFE',
    totalFloors: 4, hasTemp: true, temp: '18 độ C',
    recentContainers: ['CTN11230', 'CTN55321', 'CTN99012'],
  },
  {
    id: 'dry', name: 'Kho Khô', status: 'dry',
    color: '#F97316', bgColor: '#FFF7ED', plateColor: '#FDBA74',
    emptyColor: '#FED7AA', emptyBorder: '#FDBA74',
    totalFloors: 4,
    recentContainers: ['CTN02442', 'CTN4ry384', 'CTN84295'],
  },
  {
    id: 'fragile', name: 'Kho Hàng dễ vỡ', status: 'fragile',
    color: '#EF4444', bgColor: '#FEF2F2', plateColor: '#FECACA',
    emptyColor: '#FECACA', emptyBorder: '#FCA5A5',
    totalFloors: 4,
    recentContainers: ['CTN77810', 'CTN34521'],
  },
  {
    id: 'other', name: 'Kho khác', status: 'other',
    color: '#9CA3AF', bgColor: '#F9FAFB', plateColor: '#D1D5DB',
    emptyColor: '#E5E7EB', emptyBorder: '#D1D5DB',
    totalFloors: 4,
    recentContainers: ['CTN22310', 'CTN66741', 'CTN88952'],
  },
  {
    id: 'damaged', name: 'Kho Hỏng', status: 'damaged' as any,
    color: '#7F1D1D', bgColor: '#FEF2F2', plateColor: '#FCA5A5',
    emptyColor: '#FECACA', emptyBorder: '#EF4444',
    totalFloors: 1,
    recentContainers: [],
  },
];

// Quick lookup by type
export const WH_MAP: Record<WHType, WHConfig> = Object.fromEntries(
  WAREHOUSES.map((w) => [w.id, w])
) as Record<WHType, WHConfig>;

// ─── Floor assignments ───────────────────────────────────────────────────────
export const FLOOR_MAP: Record<WHType, number> = { cold: 1, dry: 2, fragile: 1, other: 2, damaged: 1 };

// ─── Waiting containers ──────────────────────────────────────────────────────
/** @deprecated Phase 6 — replaced by fetchWaitingContainers() in gateOutService. */
/* export const WAITING_CONTAINERS: WaitingContainer[] = [
  { code: 'CTN-2026-1234', type: 'Hàng Khô',   date: '19/03/2026' },
  { code: 'CTN-2026-1235', type: 'Hàng Lạnh',  date: '19/03/2026' },
  { code: 'CTN-2026-1236', type: 'Hàng dễ vỡ', date: '18/03/2026' },
]; */
export const WAITING_CONTAINERS: WaitingContainer[] = [];

// ─── Export containers (in storage) ──────────────────────────────────────────
/** @deprecated Phase 6 — replaced by searchInYardContainers() in gateOutService. */
/* export const EXPORT_CONTAINERS: ExportContainer[] = [
  { code: 'CTN-2026-0987', type: 'Hàng Khô',  zone: 'Zone B', wh: 'Kho Khô',  floor: 2, slot: 'R1C3' },
  { code: 'CTN-2026-0654', type: 'Hàng Lạnh', zone: 'Zone A', wh: 'Kho Lạnh', floor: 1, slot: 'R2C1' },
]; */
export const EXPORT_CONTAINERS: ExportContainer[] = [];

// ─── Grid generation ─────────────────────────────────────────────────────────
function makeGrid(seed: number): boolean[][] {
  const rows = 4, cols = 8;
  const sr = (n: number) => {
    const x = Math.sin(n + seed) * 10000;
    return x - Math.floor(x);
  };
  let idx = 0;
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (_, c) => {
      const isLeft = c < 4;
      const rate = isLeft
        ? 0.97
        : Math.max(0, 0.88 - Math.floor((c - 4) / 2) * (seed * 0.15 + 0.06));
      return sr(idx++) < rate;
    })
  );
}

const GRID_CACHE: Record<string, boolean[][]> = {};
const SEEDS: Record<string, number> = { cold: 2.1, dry: 3.5, fragile: 5.7, other: 7.2 };

/** @deprecated Phase 3 — use getZoneGrid() from yardStore. Kept as fallback. */
export function getGrid(whId: string, zone: string): boolean[][] {
  const key = `${whId}-${zone}`;
  if (!GRID_CACHE[key]) {
    const zoneSeed = ZONES.indexOf(zone) * 0.8;
    GRID_CACHE[key] = makeGrid((SEEDS[whId] ?? 1) + zoneSeed);
  }
  return GRID_CACHE[key];
}

// Get grid filtered by floor level (1-based). Floor 1 = base, Floor 2 = 60%, Floor 3 = 30%
const FLOOR_GRID_CACHE: Record<string, boolean[][]> = {};

/** @deprecated Phase 3 — use getZoneGridForFloor() from yardStore. Kept as fallback. */
export function getGridForFloor(whId: string, zone: string, floor: number): boolean[][] {
  if (floor <= 1) return getGrid(whId, zone);

  const key = `${whId}-${zone}-f${floor}`;
  if (FLOOR_GRID_CACHE[key]) return FLOOR_GRID_CACHE[key];

  const baseGrid = getGrid(whId, zone);
  const fillRate = floor === 2 ? 0.6 : floor === 3 ? 0.3 : 0.1;
  const level = floor - 1;

  const sr = (n: number) => {
    const x = Math.sin(n * 31.7 + ZONES.indexOf(zone) * 7.3) * 43758.5453;
    return x - Math.floor(x);
  };

  // For upper floors, a slot can only be filled if the floor below has it filled
  const belowGrid = floor === 2
    ? baseGrid
    : getGridForFloor(whId, zone, floor - 1);

  const result = baseGrid.map((row, ri) =>
    row.map((_, ci) => {
      if (!belowGrid[ri][ci]) return false;
      return sr(level * 100 + ri * 10 + ci) < fillRate;
    })
  );

  FLOOR_GRID_CACHE[key] = result;
  return result;
}

// ─── Count filled slots across 3 levels ──────────────────────────────────────
/** @deprecated Phase 3 — use countZoneFilledSlots() from yardStore. Kept as fallback. */
export function countFilledSlots(whType: string, zoneName: string): number {
  const grid = getGrid(whType, zoneName);
  const sr = (n: number) => {
    const x = Math.sin(n * 31.7 + ZONES.indexOf(zoneName) * 7.3) * 43758.5453;
    return x - Math.floor(x);
  };

  let count = 0;
  const f20: Set<string>[] = [new Set(), new Set(), new Set(), new Set()];
  const f40: Set<string>[] = [new Set(), new Set(), new Set(), new Set()];

  for (let level = 0; level < 4; level++) {
    const fillRate = level === 0 ? 1.0 : level === 1 ? 0.6 : level === 2 ? 0.3 : 0.1;

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const k = `${row}-${col}`;
        if (!grid[row][col]) continue;
        if (level > 0 && !f20[level - 1].has(k)) continue;
        if (level > 0 && sr(level * 100 + row * 10 + col) > fillRate) continue;
        f20[level].add(k);
        count++;
      }
    }

    for (let gi = 0; gi < 2; gi++) {
      const br = gi * 2;
      for (let col = 4; col < 8; col++) {
        const k = `${gi}-${col}`;
        if (!grid[br][col]) continue;
        if (level > 0 && !f40[level - 1].has(k)) continue;
        if (level > 0 && sr(level * 200 + gi * 50 + col) > fillRate) continue;
        f40[level].add(k);
        count++;
      }
    }
  }

  return count;
}

// ─── Stat card data (computed from actual container grid) ────────────────────
export function getWHStats(): WHStat[] {
  return WAREHOUSES.map((wh) => {
    let totalFilled = 0;
    const isDamaged = wh.id === 'damaged';
    const totalAllZones = isDamaged ? 24 * 2 : TOTAL_SLOTS * ZONES.length; // 48 or 288

    const zones = isDamaged ? ['Zone A', 'Zone B'] : ZONES;
    for (const zone of zones) {
      totalFilled += countFilledSlots(wh.id, zone);
    }
    const pct = Math.round((totalFilled / totalAllZones) * 100);
    const empty = totalAllZones - totalFilled;
    return {
      id: wh.id,
      name: wh.name,
      color: wh.color,
      bgColor: wh.bgColor,
      pct: `${pct}%`,
      empty,
    };
  });
}

// Pre-computed for convenience (same values on every call since grids are seeded)
export const WH_STATS: WHStat[] = getWHStats();

// ─── Preview position (shared type for ghost container) ─────────────────────
export interface PreviewPosition {
  whType: WHType;
  zone: string;
  floor: number;
  row: number;
  col: number;
  sizeType: '20ft' | '40ft';
  containerCode?: string;
}

// ─── Slot info (2D) ──────────────────────────────────────────────────────────
const CARGOS = ['Thủy sản', 'Thịt đông lạnh', 'Rau củ', 'Trái cây', 'Kem', 'Sữa'];

export function getSlotInfo(filled: boolean, is40ft: boolean, seed: number): SlotInfo {
  const sr = (n: number) => { const x = Math.sin(n + seed) * 10000; return x - Math.floor(x); };
  return {
    filled,
    label: 'CT01',
    type: is40ft ? '40ft' : '20ft',
    cargo: filled ? CARGOS[Math.floor(sr(seed + 1) * CARGOS.length)] : undefined,
    weight: filled ? `${Math.floor(sr(seed + 2) * 20 + 5) * 1000} kg` : undefined,
    temp: filled ? `${Math.floor(sr(seed + 3) * 10 - 5)}°C` : undefined,
  };
}
