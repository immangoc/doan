import { Suspense, useRef, useMemo, forwardRef, useImperativeHandle, useSyncExternalStore } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Text } from '@react-three/drei';
import * as THREE from 'three';
import { ContainerBlock } from './ContainerBlock';
import { GhostContainer } from './GhostContainer';
import {
  // Phase 3: ZONES, getGrid, countFilledSlots, TOTAL_SLOTS replaced by yardStore
  WARNING_THRESHOLD, WH_MAP,
} from '../../data/warehouse';
import type { WHType, ZoneInfo, PreviewPosition } from '../../data/warehouse';
import { subscribe, getImportedContainers } from '../../data/containerStore';
import {
  subscribeYard, getYardData,
  getZoneNames, getZoneGrid, countZoneFilledSlots, getZoneTotalSlots, getZoneDims,
  getSlotIdByCoords, isSlotLockedByCoords,
} from '../../store/yardStore';
import { getCachedYards } from '../../services/yardService';
import { getEffectiveLock, getSlotLockOverrides, subscribeSlotLock } from '../../store/slotLockStore';
import {
  subscribeOccupancy, getOccupancyData,
  getSlotOccupancy, countOccupiedZoneSlots, isOccupancyFetched,
} from '../../store/occupancyStore';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface OverviewSceneHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

// ─── 3D Dimensions ───────────────────────────────────────────────────────────
const CTN_W = 2.4;
const CTN_H = 2.6;
const CTN_L20 = 6.0;
const GAP = 0.5;
const RACK_GAP = 1.2;
const BLOCK_GAP = 3.0;
const ROW_GROUP_GAP = 2.5;

function colX(col: number): number {
  if (col < 2) return col * (CTN_W + GAP);
  if (col < 4) return (col - 2) * (CTN_W + GAP) + 2 * (CTN_W + GAP) + RACK_GAP;
  if (col < 6) return (col - 4) * (CTN_W + GAP) + 4 * (CTN_W + GAP) + RACK_GAP + BLOCK_GAP;
  return (col - 6) * (CTN_W + GAP) + 6 * (CTN_W + GAP) + RACK_GAP + BLOCK_GAP + RACK_GAP;
}

function rowZ(row: number): number {
  return row * (CTN_L20 + GAP) + (row >= 2 ? ROW_GROUP_GAP : 0);
}

const TOTAL_X = colX(7) + CTN_W;
const TOTAL_Z = rowZ(3) + CTN_L20;

// ─── Warning border ──────────────────────────────────────────────────────────
function WarningBorder({ centerX, centerZ, width, height }: {
  centerX: number; centerZ: number; width: number; height: number;
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (!matRef.current) return;
    const pulse = 0.3 + 0.25 * Math.sin(state.clock.elapsedTime * 3);
    matRef.current.opacity = pulse;
  });

  return (
    <mesh position={[centerX, 0.03, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[Math.max(width, height) / 2 + 0.5, Math.max(width, height) / 2 + 1.8, 4]} />
      <meshStandardMaterial
        ref={matRef}
        color="#EF4444"
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ─── Zone block ──────────────────────────────────────────────────────────────
interface ZoneBlockProps {
  position: [number, number, number];
  zoneName: string;
  whType: WHType;
  onClick: () => void;
  highlightId?: string;
  previewPosition?: PreviewPosition | null;
  onStartRelocate?: (containerCode: string, whType: WHType) => void;
  slotLockPick?: {
    enabled: boolean;
    floor: number;
    onPick: (pick: { whType: WHType; whName: string; zone: string; row: number; col: number; slotId: number; locked: boolean; reason?: string | null }) => void;
  };
}

function ZoneBlock({ position, zoneName, whType, onClick, highlightId, previewPosition, onStartRelocate, slotLockPick }: ZoneBlockProps) {
  const wh = WH_MAP[whType];
  const allYards = useSyncExternalStore(subscribeYard, getYardData);
  // Re-render when lock overrides change
  useSyncExternalStore(subscribeSlotLock, getSlotLockOverrides);
  const occupancyMap = useSyncExternalStore(subscribeOccupancy, getOccupancyData);
  const occupancyLoaded = isOccupancyFetched();

  const grid = getZoneGrid(allYards, whType, zoneName);
  const totalSlots = getZoneTotalSlots(allYards, whType, zoneName);
  const filledCount = occupancyLoaded
    ? countOccupiedZoneSlots(occupancyMap, whType, zoneName)
    : countZoneFilledSlots(allYards, whType, zoneName);
  const isWarning = filledCount / totalSlots >= WARNING_THRESHOLD;

  // Imported containers from store
  const allImported = useSyncExternalStore(subscribe, getImportedContainers);
  const importedForZone = useMemo(
    () => allImported.filter((c) => c.whType === whType && c.zone === zoneName),
    [allImported, whType, zoneName]
  );

  const containers = useMemo(() => {
    const items: {
      key: string;
      pos: [number, number, number];
      sizeType: '20ft' | '40ft';
      id: string;
      floor: number;
      slot: string;
      colorSeed: number;
      row: number;
      col: number;
      cargoType?: string;
      weight?: string;
      gateInDate?: string;
      storageDuration?: string;
    }[] = [];

    const { rows: gridRows, cols: gridCols, maxTier } = getZoneDims(allYards, whType, zoneName);
    const midCol = Math.floor(gridCols / 2);
    const numGroups = Math.floor(gridRows / 2);
    const maxLevels = maxTier || 3;

    if (occupancyLoaded) {
      // Phase 4: render only real occupied slots
      for (let tier = 1; tier <= maxLevels; tier++) {
        for (let row = 0; row < gridRows; row++) {
          for (let col = 0; col < gridCols; col++) {
            if (!grid[row]?.[col]) continue;
            const occ = getSlotOccupancy(occupancyMap, whType, zoneName, row, col, tier);
            if (!occ) continue;

            // Render rule:
            // - 40ft must only appear in the 40ft area (right half).
            const is40ft = occ.sizeType === '40ft';
            // Hard constraint: 40ft must only appear in the 40ft area (right half).
            // In this scene's grid layout, 40ft area starts at col 4 (0-based).
            if (is40ft && col < 4) continue;
            const y = (tier - 1) * CTN_H + CTN_H / 2;
            const x = colX(col);

            if (is40ft) {
              // 40ft visual spans 2 rows (to match 2D view): render once per row-pair.
              if (row % 2 === 1) continue;
              const baseRow = row;
              const nextRow = Math.min(baseRow + 1, gridRows - 1);
              const z = (rowZ(baseRow) + rowZ(nextRow)) / 2;
              items.push({
                key: `real-40-${tier}-${row}-${col}`,
                pos: [x, y, z],
                sizeType: '40ft',
                id: occ.containerCode || `CTN-${whType.charAt(0).toUpperCase()}${zoneName.replace('Zone ', '')}-F${tier}-R${baseRow + 1}C${col + 1}`,
                floor: tier,
                slot: `R${baseRow + 1}-${nextRow + 1}C${col + 1}`,
                colorSeed: occ.containerId,
                row: baseRow,
                col,
                cargoType: occ.cargoType,
                weight: occ.weight,
                gateInDate: occ.gateInDate,
                storageDuration: occ.storageDuration,
              });
            } else {
              items.push({
                key: `real-20-${tier}-${row}-${col}`,
                pos: [x, y, rowZ(row)],
                sizeType: '20ft',
                id: occ.containerCode || `CTN-${whType.charAt(0).toUpperCase()}${zoneName.replace('Zone ', '')}-F${tier}-R${row + 1}C${col + 1}`,
                floor: tier,
                slot: `R${row + 1}C${col + 1}`,
                colorSeed: occ.containerId,
                row,
                col,
                cargoType: occ.cargoType,
                weight: occ.weight,
                gateInDate: occ.gateInDate,
                storageDuration: occ.storageDuration,
              });
            }
          }
        }
      }
    } else {
      // Fallback: seeded fill-rate algorithm (mock data until occupancy loads)
      const zoneIdx = getZoneNames(allYards, whType).indexOf(zoneName);
      const sr = (n: number) => {
        const x = Math.sin(n * 31.7 + zoneIdx * 7.3) * 43758.5453;
        return x - Math.floor(x);
      };

      const filled20: Set<string>[] = Array.from({ length: maxLevels }, () => new Set());
      const filled40: Set<string>[] = Array.from({ length: maxLevels }, () => new Set());

      for (let level = 0; level < maxLevels; level++) {
        const fillRate = level === 0 ? 1.0 : level === 1 ? 0.6 : level === 2 ? 0.3 : 0.1;

        for (let row = 0; row < gridRows; row++) {
          for (let col = 0; col < midCol; col++) {
            const slotKey = `${row}-${col}`;
            if (!grid[row]?.[col]) continue;
            if (level > 0 && !filled20[level - 1].has(slotKey)) continue;
            if (level > 0 && sr(level * 100 + row * 10 + col) > fillRate) continue;
            filled20[level].add(slotKey);
            items.push({
              key: `20-${level}-${row}-${col}`,
              pos: [colX(col), level * CTN_H + CTN_H / 2, rowZ(row)],
              sizeType: '20ft',
              id: `CTN-${whType.charAt(0).toUpperCase()}${zoneName.replace('Zone ', '')}-F${level + 1}-R${row + 1}C${col + 1}`,
              floor: level + 1,
              slot: `R${row + 1}C${col + 1}`,
              colorSeed: level * 1000 + row * 100 + col * 10 + zoneIdx * 3,
              row,
              col,
            });
          }
        }

        for (let groupIdx = 0; groupIdx < numGroups; groupIdx++) {
          const baseRow = groupIdx * 2;
          for (let col = midCol; col < gridCols; col++) {
            const slotKey = `${groupIdx}-${col}`;
            if (!grid[baseRow]?.[col]) continue;
            if (level > 0 && !filled40[level - 1].has(slotKey)) continue;
            if (level > 0 && sr(level * 200 + groupIdx * 50 + col) > fillRate) continue;
            filled40[level].add(slotKey);
            const z0 = rowZ(baseRow);
            const z1 = rowZ(baseRow + 1);
            items.push({
              key: `40-${level}-${groupIdx}-${col}`,
              pos: [colX(col), level * CTN_H + CTN_H / 2, (z0 + z1) / 2],
              sizeType: '40ft',
              id: `CTN-${whType.charAt(0).toUpperCase()}${zoneName.replace('Zone ', '')}-F${level + 1}-R${baseRow + 1}C${col + 1}`,
              floor: level + 1,
              slot: `R${baseRow + 1}-${baseRow + 2}C${col + 1}`,
              colorSeed: level * 1000 + groupIdx * 200 + col * 10 + 5 + zoneIdx * 3,
              row: baseRow,
              col,
            });
          }
        }
      }
    }

    return items;
  }, [grid, allYards, occupancyMap, occupancyLoaded, whType, zoneName]);

  const centerX = TOTAL_X / 2;
  const centerZ = TOTAL_Z / 2;

  return (
    <group position={position}>
      <mesh position={[centerX, 0.01, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TOTAL_X + 3.5, TOTAL_Z + 3.5]} />
        <meshStandardMaterial color={wh.color} transparent opacity={0.12} />
      </mesh>
      <mesh position={[centerX, 0.02, centerZ]} rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <planeGeometry args={[TOTAL_X + 3, TOTAL_Z + 3]} />
        <meshStandardMaterial color={wh.plateColor} transparent opacity={0.55} />
      </mesh>
      <Text position={[centerX, 0.1, TOTAL_Z + 3.5]} rotation={[-Math.PI / 2, 0, 0]}
        fontSize={2.2} color={wh.color} fontWeight="bold" anchorX="center">
        {zoneName.replace('Zone ', '')}
      </Text>
      <Text position={[5.5, 0.1, -2.2]} rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.9} color="#9CA3AF" anchorX="center">20ft</Text>
      <Text position={[TOTAL_X - 5.5, 0.1, -2.2]} rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.9} color="#9CA3AF" anchorX="center">40ft</Text>

      {containers.map((ctn) => (
        <ContainerBlock key={ctn.key} id={ctn.id} position={ctn.pos} status={wh.status}
          sizeType={ctn.sizeType} colorSeed={ctn.colorSeed}
          zone={zoneName.replace('Zone ', '')} floor={ctn.floor} slot={ctn.slot}
          highlightId={highlightId}
          cargoType={ctn.cargoType} weight={ctn.weight}
          gateInDate={ctn.gateInDate} storageDuration={ctn.storageDuration}
          onStartRelocate={onStartRelocate ? (code) => onStartRelocate(code, whType) : undefined}
          locked={(() => {
            const lock = isSlotLockedByCoords(getCachedYards(), whType, zoneName, ctn.row, ctn.col);
            const slotId = lock.slotId ?? getSlotIdByCoords(getCachedYards(), whType, zoneName, ctn.floor, ctn.row, ctn.col);
            return getEffectiveLock({ slotId, backendLocked: lock.locked, backendReason: lock.reason ?? null }).locked;
          })()}
          lockPickEnabled={!!slotLockPick?.enabled}
          onLockPick={() => {
            if (!slotLockPick?.enabled) return;
            const lock = isSlotLockedByCoords(getCachedYards(), whType, zoneName, ctn.row, ctn.col);
            const slotId = lock.slotId ?? getSlotIdByCoords(getCachedYards(), whType, zoneName, ctn.floor, ctn.row, ctn.col);
            if (!slotId) return;
            const eff = getEffectiveLock({ slotId, backendLocked: lock.locked, backendReason: lock.reason ?? null });
            slotLockPick.onPick({
              whType,
              whName: wh.name,
              zone: zoneName,
              row: ctn.row,
              col: ctn.col,
              slotId,
              locked: eff.locked,
              reason: eff.reason ?? null,
            });
          }}
        />
      ))}

      {/* Imported containers (from store) */}
      {importedForZone.map((ic) => {
        const is40ft = ic.sizeType === '40ft';
        const y = (ic.floor - 1) * CTN_H + CTN_H / 2;
        const x = colX(ic.col);
        const z = is40ft
          ? (rowZ(ic.row) + rowZ(ic.row + 1)) / 2
          : rowZ(ic.row);
        return (
          <ContainerBlock
            key={`imported-${ic.code}`}
            id={ic.code}
            position={[x, y, z]}
            status={wh.status}
            sizeType={ic.sizeType}
            colorSeed={Date.parse('2026-01-01') + ic.code.length * 137}
            zone={zoneName.replace('Zone ', '')}
            floor={ic.floor}
            slot={ic.slot}
            highlightId={highlightId}
            locked={(() => {
              const lock = isSlotLockedByCoords(getCachedYards(), whType, zoneName, ic.row, ic.col);
              const slotId = lock.slotId ?? getSlotIdByCoords(getCachedYards(), whType, zoneName, ic.floor, ic.row, ic.col);
              return getEffectiveLock({ slotId, backendLocked: lock.locked, backendReason: lock.reason ?? null }).locked;
            })()}
            lockPickEnabled={!!slotLockPick?.enabled}
            onLockPick={() => {
              if (!slotLockPick?.enabled) return;
              const lock = isSlotLockedByCoords(getCachedYards(), whType, zoneName, ic.row, ic.col);
              const slotId = lock.slotId ?? getSlotIdByCoords(getCachedYards(), whType, zoneName, ic.floor, ic.row, ic.col);
              if (!slotId) return;
              const eff = getEffectiveLock({ slotId, backendLocked: lock.locked, backendReason: lock.reason ?? null });
              slotLockPick.onPick({
                whType,
                whName: wh.name,
                zone: zoneName,
                row: ic.row,
                col: ic.col,
                slotId,
                locked: eff.locked,
                reason: eff.reason ?? null,
              });
            }}
          />
        );
      })}

      {/* Ghost container preview */}
      {previewPosition && previewPosition.zone === zoneName && (() => {
        const is40ft = previewPosition.sizeType === '40ft';
        const ghostY = (previewPosition.floor - 1) * CTN_H + CTN_H / 2;
        let ghostX: number;
        let ghostZ: number;
        if (is40ft) {
          const groupIdx = Math.floor(previewPosition.row / 2);
          const baseRow = groupIdx * 2;
          ghostX = colX(previewPosition.col);
          ghostZ = (rowZ(baseRow) + rowZ(baseRow + 1)) / 2;
        } else {
          ghostX = colX(previewPosition.col);
          ghostZ = rowZ(previewPosition.row);
        }
        return (
          <GhostContainer
            position={[ghostX, ghostY, ghostZ]}
            sizeType={previewPosition.sizeType}
            color={wh.color}
            label={previewPosition.containerCode ?? 'Vị trí gợi ý'}
          />
        );
      })()}

      {isWarning && (
        <WarningBorder centerX={centerX} centerZ={centerZ} width={TOTAL_X + 3} height={TOTAL_Z + 3} />
      )}
    </group>
  );
}

// ─── Warehouse group (3 zones) ───────────────────────────────────────────────
const ZONE_SPACING = 34;

interface WarehouseGroupProps {
  position: [number, number, number];
  whType: WHType;
  onZoneClick: (zone: ZoneInfo) => void;
  highlightId?: string;
  previewPosition?: PreviewPosition | null;
  onStartRelocate?: (containerCode: string, whType: WHType) => void;
  slotLockPick?: {
    enabled: boolean;
    floor: number;
    onPick: (pick: { whType: WHType; whName: string; zone: string; row: number; col: number; slotId: number; locked: boolean; reason?: string | null }) => void;
  };
}

function WarehouseGroup({ position, whType, onZoneClick, highlightId, previewPosition, onStartRelocate, slotLockPick }: WarehouseGroupProps) {
  const wh = WH_MAP[whType];
  const allYards = useSyncExternalStore(subscribeYard, getYardData);
  const occupancyMap = useSyncExternalStore(subscribeOccupancy, getOccupancyData);
  const zones = getZoneNames(allYards, whType);

  function handleZoneClick(zoneName: string) {
    const total = getZoneTotalSlots(allYards, whType, zoneName);
    const occupiedSlots = isOccupancyFetched()
      ? countOccupiedZoneSlots(occupancyMap, whType, zoneName)
      : countZoneFilledSlots(allYards, whType, zoneName);
    onZoneClick({
      name: zoneName,
      type: wh.name,
      fillRate: total > 0 ? Math.round((occupiedSlots / total) * 100) : 0,
      emptySlots: total - occupiedSlots,
      totalSlots: total,
      recentContainers: wh.recentContainers,
    });
  }

  const totalWidth = (zones.length - 1) * ZONE_SPACING + TOTAL_X;

  return (
    <group position={position}>
      <Text position={[totalWidth / 2, 0.15, -8]} rotation={[-Math.PI / 2, 0, 0]}
        fontSize={3.5} color={wh.color} fontWeight="bold" anchorX="center">
        {wh.name}
      </Text>
      <mesh position={[totalWidth / 2, -0.01, TOTAL_Z / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[totalWidth + 10, TOTAL_Z + 18]} />
        <meshStandardMaterial color={wh.color} transparent opacity={0.04} />
      </mesh>
      {zones.map((zone, i) => (
        <ZoneBlock key={`${whType}-${zone}`} position={[i * ZONE_SPACING, 0, 0]}
          zoneName={zone} whType={whType} onClick={() => handleZoneClick(zone)}
          highlightId={highlightId}
          previewPosition={previewPosition?.whType === whType ? previewPosition : null}
          onStartRelocate={onStartRelocate}
          // Allow click-container-to-lock in overview as well
          slotLockPick={slotLockPick}
        />
      ))}
    </group>
  );
}

// ─── Camera controls ─────────────────────────────────────────────────────────
const MIN_DIST = 30;
const MAX_DIST = 400;

function CameraControls({ handleRef, centerX, centerZ }: {
  handleRef: React.MutableRefObject<OverviewSceneHandle | null>;
  centerX: number;
  centerZ: number;
}) {
  const orbitRef = useRef<any>(null);
  const { camera } = useThree();

  handleRef.current = {
    zoomIn: () => {
      if (!orbitRef.current) return;
      const tgt = orbitRef.current.target;
      camera.position.sub(tgt).multiplyScalar(0.75);
      if (camera.position.length() < MIN_DIST) camera.position.setLength(MIN_DIST);
      camera.position.add(tgt);
      orbitRef.current.update();
    },
    zoomOut: () => {
      if (!orbitRef.current) return;
      const tgt = orbitRef.current.target;
      camera.position.sub(tgt).multiplyScalar(1.35);
      if (camera.position.length() > MAX_DIST) camera.position.setLength(MAX_DIST);
      camera.position.add(tgt);
      orbitRef.current.update();
    },
    resetView: () => {
      if (!orbitRef.current) return;
      camera.position.set(centerX, 120, centerZ + 130);
      orbitRef.current.target.set(centerX, 0, centerZ);
      orbitRef.current.update();
    },
  };

  return (
    <OrbitControls ref={orbitRef} makeDefault
      maxPolarAngle={Math.PI / 2 - 0.05} minDistance={MIN_DIST} maxDistance={MAX_DIST} />
  );
}

// ─── Overview Scene ──────────────────────────────────────────────────────────
interface OverviewSceneProps {
  onZoneClick: (zone: ZoneInfo) => void;
  highlightId?: string;
  previewPosition?: PreviewPosition | null;
  onStartRelocate?: (containerCode: string, whType: WHType) => void;
  slotLockPick?: {
    enabled: boolean;
    floor: number;
    onPick: (pick: { whType: WHType; whName: string; zone: string; row: number; col: number; slotId: number; locked: boolean; reason?: string | null }) => void;
  };
}

const WH_LAYOUT: { type: WHType; row: number; col: number }[] = [
  { type: 'cold', row: 0, col: 0 },
  { type: 'dry', row: 0, col: 1 },
  { type: 'fragile', row: 1, col: 0 },
  { type: 'other', row: 1, col: 1 },
  { type: 'damaged', row: 2, col: 0 },
];

const WH_COL_SPACING = 40;
const WH_ROW_SPACING = 25;

export const OverviewScene = forwardRef<OverviewSceneHandle, OverviewSceneProps>(
  ({ onZoneClick, highlightId, previewPosition, onStartRelocate, slotLockPick }, ref) => {
    const handleRef = useRef<OverviewSceneHandle | null>(null);

    useImperativeHandle(ref, () => ({
      zoomIn: () => handleRef.current?.zoomIn(),
      zoomOut: () => handleRef.current?.zoomOut(),
      resetView: () => handleRef.current?.resetView(),
    }), []);

    // Find max row and col in WH_LAYOUT to dynamically size the ground
    const maxRow = Math.max(...WH_LAYOUT.map(wl => wl.row));
    const maxCol = Math.max(...WH_LAYOUT.map(wl => wl.col));

    const warehouseWidth = 2 * ZONE_SPACING + TOTAL_X;
    
    // Total layout dimensions
    const layoutW = (maxCol + 1) * warehouseWidth + maxCol * WH_COL_SPACING;
    const layoutH = (maxRow + 1) * TOTAL_Z + maxRow * WH_ROW_SPACING;

    // Center coordinates
    const centerX = layoutW / 2;
    const centerZ = layoutH / 2;

    const groundW = layoutW + 80;
    const groundH = layoutH + 80;

    return (
      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(to bottom, #dbe4f0, #f5f7fa)' }}>
        <Canvas shadows camera={{ position: [centerX, 120, centerZ + 130], fov: 45 }}>
          <Suspense fallback={null}>
            <Environment preset="city" />
            <ambientLight intensity={0.5} />
            <directionalLight position={[60, 70, 50]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centerX, -0.05, centerZ]}>
              <planeGeometry args={[groundW, groundH]} />
              <meshStandardMaterial color="#F1F5F9" />
            </mesh>
            <ContactShadows position={[centerX, 0, centerZ]} opacity={0.3} scale={Math.max(groundW, groundH)} blur={2} far={10} />

            {WH_LAYOUT.map(({ type, row, col }) => (
              <WarehouseGroup key={type}
                position={[col * (warehouseWidth + WH_COL_SPACING), 0, row * (TOTAL_Z + WH_ROW_SPACING)]}
                whType={type} onZoneClick={onZoneClick} highlightId={highlightId}
                previewPosition={previewPosition}
                onStartRelocate={onStartRelocate}
                slotLockPick={slotLockPick}
              />
            ))}

            <CameraControls handleRef={handleRef} centerX={centerX} centerZ={centerZ} />
          </Suspense>
        </Canvas>
      </div>
    );
  }
);

OverviewScene.displayName = 'OverviewScene';
