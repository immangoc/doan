import { Suspense, useRef, useMemo, forwardRef, useImperativeHandle, useSyncExternalStore } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Text } from '@react-three/drei';
import * as THREE from 'three';
import { ContainerBlock } from './ContainerBlock';
import { GhostContainer } from './GhostContainer';
import { WARNING_THRESHOLD, WH_MAP } from '../../data/warehouse';
import type { WHType, ZoneInfo, PreviewPosition } from '../../data/warehouse';
import { subscribe, getImportedContainers } from '../../data/containerStore';
import { subscribeYard, getYardData, getZoneNames, getZoneGrid, getZoneTotalSlots, getZoneDims } from '../../store/yardStore';
import { subscribeOccupancy, getOccupancyData, getSlotOccupancy, countOccupiedZoneSlots, isOccupancyFetched } from '../../store/occupancyStore';

export interface OverviewSceneHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

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

function WarningBorder({ centerX, centerZ, width, height }: { centerX: number; centerZ: number; width: number; height: number; }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.opacity = 0.3 + 0.25 * Math.sin(state.clock.elapsedTime * 3);
  });
  return (
    <mesh position={[centerX, 0.03, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[Math.max(width, height) / 2 + 0.5, Math.max(width, height) / 2 + 1.8, 4]} />
      <meshStandardMaterial ref={matRef} color="#EF4444" transparent opacity={0.3} side={THREE.DoubleSide} />
    </mesh>
  );
}

interface ZoneBlockProps {
  position: [number, number, number];
  zoneName: string;
  whType: WHType;
  onClick: () => void;
  highlightId?: string;
  previewPosition?: PreviewPosition | null;
  onDamageContainer?: (payload: {
    containerCode: string;
    cargoType: string;
    containerType: string;
    weight: string;
    whName: string;
    blockName: string;
    zone: string;
    slot: string;
    floor: number;
  }) => void;
}

function ZoneBlock({ position, zoneName, whType, onClick, highlightId, previewPosition, onDamageContainer }: ZoneBlockProps) {
  const wh = WH_MAP[whType];
  const allYards = useSyncExternalStore(subscribeYard, getYardData);
  const occupancyMap = useSyncExternalStore(subscribeOccupancy, getOccupancyData);
  const occupancyLoaded = isOccupancyFetched();

  const totalSlots = getZoneTotalSlots(allYards, whType, zoneName);
  const filledCount = countOccupiedZoneSlots(occupancyMap, whType, zoneName);
  const isWarning = totalSlots > 0 && filledCount / totalSlots >= WARNING_THRESHOLD;
  const grid = getZoneGrid(allYards, whType, zoneName);

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
      cargoType?: string;
      containerType?: string;
      weight?: string;
      gateInDate?: string;
      storageDuration?: string;
      whName?: string;
      blockName?: string;
      statusText?: string;
    }[] = [];

    const { rows: gridRows, cols: gridCols, maxTier } = getZoneDims(allYards, whType, zoneName);
    const midCol = Math.floor(gridCols / 2);
    const numGroups = Math.floor(gridRows / 2);
    const maxLevels = maxTier || 3;

    if (occupancyLoaded) {
      for (let tier = 1; tier <= maxLevels; tier++) {
        for (let row = 0; row < gridRows; row++) {
          for (let col = 0; col < gridCols; col++) {
            if (!grid[row]?.[col]) continue;
            const occ = getSlotOccupancy(occupancyMap, whType, zoneName, row, col, tier);
            if (!occ) continue;
            const is40ft = col >= midCol;
            const y = (tier - 1) * CTN_H + CTN_H / 2;
            const x = colX(col);
            if (is40ft) {
              const baseRow = row % 2 === 0 ? row : row - 1;
              const nextRow = Math.min(baseRow + 1, gridRows - 1);
              const z = (rowZ(baseRow) + rowZ(nextRow)) / 2;
              items.push({
                key: `real-40-${tier}-${row}-${col}`,
                pos: [x, y, z],
                sizeType: '40ft',
                id: occ.containerCode || `CTN-${whType}-${zoneName}-${tier}-${row}-${col}`,
                floor: tier,
                slot: `R${baseRow + 1}-${baseRow + 2}C${col + 1}`,
                colorSeed: occ.containerId,
                cargoType: occ.cargoType,
                containerType: occ.sizeType,
                weight: occ.weight,
                gateInDate: occ.gateInDate,
                storageDuration: occ.storageDuration,
                whName: wh.name,
                blockName: zoneName,
                statusText: 'Trong kho',
              });
            } else {
              items.push({
                key: `real-20-${tier}-${row}-${col}`,
                pos: [x, y, rowZ(row)],
                sizeType: '20ft',
                id: occ.containerCode || `CTN-${whType}-${zoneName}-${tier}-${row}-${col}`,
                floor: tier,
                slot: `R${row + 1}C${col + 1}`,
                colorSeed: occ.containerId,
                cargoType: occ.cargoType,
                containerType: occ.sizeType,
                weight: occ.weight,
                gateInDate: occ.gateInDate,
                storageDuration: occ.storageDuration,
                whName: wh.name,
                blockName: zoneName,
                statusText: 'Trong kho',
              });
            }
          }
        }
      }
    }

    return items;
  }, [allYards, occupancyMap, occupancyLoaded, whType, zoneName, grid]);

  const centerX = TOTAL_X / 2;
  const centerZ = TOTAL_Z / 2;

  return (
    <group position={position}>
      <mesh position={[centerX, 0.01, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TOTAL_X + 3.5, TOTAL_Z + 3.5]} />
        <meshStandardMaterial color={wh.color} transparent opacity={0.12} />
      </mesh>
      <mesh position={[centerX, 0.02, centerZ]} rotation={[-Math.PI / 2, 0, 0]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <planeGeometry args={[TOTAL_X + 3, TOTAL_Z + 3]} />
        <meshStandardMaterial color={wh.plateColor} transparent opacity={0.55} />
      </mesh>
      <Text position={[centerX, 0.1, TOTAL_Z + 3.5]} rotation={[-Math.PI / 2, 0, 0]} fontSize={2.2} color={wh.color} fontWeight="bold" anchorX="center">{zoneName.replace('Zone ', '')}</Text>
      <Text position={[5.5, 0.1, -2.2]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.9} color="#9CA3AF" anchorX="center">20ft</Text>
      <Text position={[TOTAL_X - 5.5, 0.1, -2.2]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.9} color="#9CA3AF" anchorX="center">40ft</Text>

      {containers.map((ctn) => (
        <ContainerBlock
          key={ctn.key}
          id={ctn.id}
          position={ctn.pos}
          status={wh.status}
          sizeType={ctn.sizeType}
          colorSeed={ctn.colorSeed}
          zone={zoneName.replace('Zone ', '')}
          floor={ctn.floor}
          slot={ctn.slot}
          highlightId={highlightId}
          cargoType={ctn.cargoType}
          weight={ctn.weight}
          gateInDate={ctn.gateInDate}
          storageDuration={ctn.storageDuration}
          whName={ctn.whName}
          blockName={ctn.blockName}
          statusText={ctn.statusText}
          onDamageClick={onDamageContainer}
        />
      ))}

      {importedForZone.map((ic) => {
        const is40ft = ic.sizeType === '40ft';
        const y = (ic.floor - 1) * CTN_H + CTN_H / 2;
        const x = colX(ic.col);
        const z = is40ft ? (rowZ(ic.row) + rowZ(ic.row + 1)) / 2 : rowZ(ic.row);
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
            cargoType={ic.cargoType}
            containerType={ic.sizeType}
            weight={ic.weight}
            gateInDate={ic.importDate}
            storageDuration={(ic as { storageDuration?: string }).storageDuration ?? ic.priority}
            whName={ic.whName}
            blockName={ic.zone}
            statusText="Trong kho"
            onDamageClick={onDamageContainer}
          />
        );
      })}

      {previewPosition && previewPosition.zone.trim().toLowerCase() === zoneName.trim().toLowerCase() && (() => {
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
        return <GhostContainer position={[ghostX, ghostY, ghostZ]} sizeType={previewPosition.sizeType} color={wh.color} label={previewPosition.containerCode ?? 'Vị trí gợi ý'} />;
      })()}

      {isWarning && <WarningBorder centerX={centerX} centerZ={centerZ} width={TOTAL_X + 3} height={TOTAL_Z + 3} />}
    </group>
  );
}

const MIN_DIST = 30;
const MAX_DIST = 400;

function CameraControls({ handleRef, centerX, centerZ }: { handleRef: React.MutableRefObject<OverviewSceneHandle | null>; centerX: number; centerZ: number; }) {
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

  return <OrbitControls ref={orbitRef} makeDefault maxPolarAngle={Math.PI / 2 - 0.05} minDistance={MIN_DIST} maxDistance={MAX_DIST} />;
}

interface OverviewSceneProps {
  onZoneClick: (zone: ZoneInfo) => void;
  highlightId?: string;
  previewPosition?: PreviewPosition | null;
  onDamageContainer?: (payload: {
    containerCode: string;
    cargoType: string;
    containerType: string;
    weight: string;
    whName: string;
    blockName: string;
    zone: string;
    slot: string;
    floor: number;
  }) => void;
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
const ZONE_SPACING = 34;

export const OverviewScene = forwardRef<OverviewSceneHandle, OverviewSceneProps>(
  ({ onZoneClick, highlightId, previewPosition, onDamageContainer }, ref) => {
    const handleRef = useRef<OverviewSceneHandle | null>(null);

    useImperativeHandle(ref, () => ({
      zoomIn: () => handleRef.current?.zoomIn(),
      zoomOut: () => handleRef.current?.zoomOut(),
      resetView: () => handleRef.current?.resetView(),
    }), []);

    const maxRow = Math.max(...WH_LAYOUT.map((wl) => wl.row));
    const maxCol = Math.max(...WH_LAYOUT.map((wl) => wl.col));
    const warehouseWidth = 2 * ZONE_SPACING + TOTAL_X;
    const layoutW = (maxCol + 1) * warehouseWidth + maxCol * WH_COL_SPACING;
    const layoutH = (maxRow + 1) * TOTAL_Z + maxRow * WH_ROW_SPACING;
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
              <WarehouseGroup
                key={type}
                position={[col * (warehouseWidth + WH_COL_SPACING), 0, row * (TOTAL_Z + WH_ROW_SPACING)]}
                whType={type}
                onZoneClick={onZoneClick}
                highlightId={highlightId}
                previewPosition={previewPosition}
                onDamageContainer={onDamageContainer}
              />
            ))}
            <CameraControls handleRef={handleRef} centerX={centerX} centerZ={centerZ} />
          </Suspense>
        </Canvas>
      </div>
    );
  }
);

interface WarehouseGroupProps {
  position: [number, number, number];
  whType: WHType;
  onZoneClick: (zone: ZoneInfo) => void;
  highlightId?: string;
  previewPosition?: PreviewPosition | null;
  onDamageContainer?: (payload: {
    containerCode: string;
    cargoType: string;
    containerType: string;
    weight: string;
    whName: string;
    blockName: string;
    zone: string;
    slot: string;
    floor: number;
  }) => void;
}

function WarehouseGroup({ position, whType, onZoneClick, highlightId, previewPosition, onDamageContainer }: WarehouseGroupProps) {
  const wh = WH_MAP[whType];
  const allYards = useSyncExternalStore(subscribeYard, getYardData);
  const occupancyMap = useSyncExternalStore(subscribeOccupancy, getOccupancyData);
  const zones = getZoneNames(allYards, whType);

  function handleZoneClick(zoneName: string) {
    const total = getZoneTotalSlots(allYards, whType, zoneName);
    const occupiedSlots = countOccupiedZoneSlots(occupancyMap, whType, zoneName);
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
      <Text position={[totalWidth / 2, 0.15, -8]} rotation={[-Math.PI / 2, 0, 0]} fontSize={3.5} color={wh.color} fontWeight="bold" anchorX="center">{wh.name}</Text>
      <mesh position={[totalWidth / 2, -0.01, TOTAL_Z / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[totalWidth + 10, TOTAL_Z + 18]} />
        <meshStandardMaterial color={wh.color} transparent opacity={0.04} />
      </mesh>
      {zones.map((zone, i) => (
        <ZoneBlock
          key={`${whType}-${zone}`}
          position={[i * ZONE_SPACING, 0, 0]}
          zoneName={zone}
          whType={whType}
          onClick={() => handleZoneClick(zone)}
          highlightId={highlightId}
          previewPosition={previewPosition?.whType === whType ? previewPosition : null}
          onDamageContainer={onDamageContainer}
        />
      ))}
    </group>
  );
}

OverviewScene.displayName = 'OverviewScene';
