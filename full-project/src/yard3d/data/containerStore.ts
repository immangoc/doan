// ─── Container import store – tracks imported containers with real data ──────
// Provides: import history, recent containers per warehouse, position suggestions

import { ZONES, WAREHOUSES, getGridForFloor } from './warehouse';
import type { WHType } from './warehouse';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface ImportedContainer {
  code: string;
  cargoType: string;
  weight: string;
  whType: WHType;
  whName: string;
  zone: string;
  floor: number;
  row: number;
  col: number;
  slot: string;
  sizeType: '20ft' | '40ft';
  importDate: string;
  exportDate: string;
  priority: string;
}

export interface DamagedContainer extends ImportedContainer {
  status: 'damaged';
  damagedAt: string;
  sourceWarehouse: string;
}

export interface SuggestedPosition {
  whType: WHType;
  whName: string;
  zone: string;
  floor: number;
  row: number;
  col: number;
  slot: string;
  sizeType: '20ft' | '40ft';
  efficiency: number;
  moves: number;
  // Phase 5: populated by backend recommendation, used for position assignment
  slotId?:  number;
  blockId?: number;
}

// ─── Store ──────────────────────────────────────────────────────────────────
let importedContainers: ImportedContainer[] = [];
let damagedContainers: DamagedContainer[] = [];
let listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribe(fn: () => void): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function getImportedContainers(): ImportedContainer[] {
  return importedContainers;
}

export function getDamagedContainers(): DamagedContainer[] {
  return damagedContainers;
}

/** @deprecated Phase 5 — replaced by confirmGateIn() in gateInService. */
export function addImportedContainer(_ctn: ImportedContainer): void {
  /* Phase 5: body commented out — real gate-in is handled by gateInService.confirmGateIn()
  importedContainers = [_ctn, ...importedContainers];
  notify();
  */
}

/** Get recent container codes for a specific warehouse, most recent first */
export function getRecentContainersByWH(whType: WHType, limit = 5): ImportedContainer[] {
  return importedContainers
    .filter((c) => c.whType === whType)
    .slice(0, limit);
}

/** Get all recent containers across all warehouses */
export function getAllRecentContainers(limit = 10): ImportedContainer[] {
  return importedContainers.slice(0, limit);
}

// ─── Position suggestion algorithm ──────────────────────────────────────────
function cargoTypeToWHType(cargoType: string): WHType {
  if (cargoType === 'Hàng Lạnh') return 'cold';
  if (cargoType === 'Hàng dễ vỡ') return 'fragile';
  if (cargoType === 'Hàng hỏng') return 'damaged';
  if (cargoType === 'Khác') return 'other';
  return 'dry';
}

function cargoTypeToWHName(cargoType: string): string {
  const wh = WAREHOUSES.find((w) => w.id === cargoTypeToWHType(cargoType));
  return wh?.name ?? 'Kho Khô';
}

/** @deprecated Phase 5 — replaced by fetchRecommendation() in gateInService. */
export function findSuggestedPosition(_cargoType: string, _preferredSize: '20ft' | '40ft' = '20ft'): SuggestedPosition | null {
  /* Phase 5: body commented out — recommendation now comes from POST /admin/optimization/recommend
  const whType = cargoTypeToWHType(_cargoType);
  const whName = cargoTypeToWHName(_cargoType);

  for (const zone of ZONES) {
    for (let floor = 1; floor <= 3; floor++) {
      const grid = getGridForFloor(whType, zone, floor);

      if (_preferredSize === '20ft') {
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 4; col++) {
            if (grid[row][col]) continue;
            if (floor > 1) {
              const belowGrid = getGridForFloor(whType, zone, floor - 1);
              if (!belowGrid[row][col]) continue;
            }
            const taken = importedContainers.some(
              (c) => c.whType === whType && c.zone === zone && c.floor === floor && c.row === row && c.col === col
            );
            if (taken) continue;
            const efficiency = Math.round(85 + Math.random() * 12);
            return { whType, whName, zone, floor, row, col,
              slot: `R${row + 1}C${col + 1}`, sizeType: '20ft', efficiency, moves: 0 };
          }
        }
      } else {
        for (let groupIdx = 0; groupIdx < 2; groupIdx++) {
          const baseRow = groupIdx * 2;
          for (let col = 4; col < 8; col++) {
            if (grid[baseRow][col]) continue;
            if (floor > 1) {
              const belowGrid = getGridForFloor(whType, zone, floor - 1);
              if (!belowGrid[baseRow][col]) continue;
            }
            const taken = importedContainers.some(
              (c) => c.whType === whType && c.zone === zone && c.floor === floor && c.row === baseRow && c.col === col
            );
            if (taken) continue;
            const efficiency = Math.round(85 + Math.random() * 12);
            return { whType, whName, zone, floor, row: baseRow, col,
              slot: `R${baseRow + 1}-R${baseRow + 2}C${col + 1}`, sizeType: '40ft', efficiency, moves: 0 };
          }
        }
      }
    }
  }
  */
  return null;
}

/** Get imported containers for a specific zone */
export function getImportedForZone(whType: WHType, zoneName: string): ImportedContainer[] {
  return importedContainers.filter((c) => c.whType === whType && c.zone === zoneName);
}

export function addDamagedContainer(ctn: Omit<DamagedContainer, 'status' | 'damagedAt'>): DamagedContainer {
  const damaged: DamagedContainer = {
    ...ctn,
    status: 'damaged',
    damagedAt: new Date().toISOString(),
  };
  damagedContainers = [damaged, ...damagedContainers];
  notify();
  return damaged;
}

export { cargoTypeToWHType, cargoTypeToWHName };
