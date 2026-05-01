import { Suspense, useRef, useMemo, useState, forwardRef, useImperativeHandle, useSyncExternalStore } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { toast } from 'sonner';
import { ContainerBlock } from './ContainerBlock';
import { GhostContainer } from './GhostContainer';
import {
  TOTAL_SLOTS, WARNING_THRESHOLD, WH_MAP,
} from '../../data/warehouse';
import type { WHType, ZoneInfo, PreviewPosition } from '../../data/warehouse';
import { subscribeYard, getYardData, getZoneNames, countZoneFilledSlots, getZoneTotalSlots, getZoneDims, getLockedSlotKeys, processApiYards, setYardData } from '../../store/yardStore';
import { subscribeOccupancy, getOccupancyData, getSlotOccupancy, countOccupiedZoneSlots, isOccupancyFetched } from '../../store/occupancyStore';
import { subscribeDamage, getPendingByCodeMap } from '../../store/damageStore';
import { getCachedYards } from '../../services/yardService';
import { apiFetch } from '../../services/apiClient';

export type { WHType, ZoneInfo };

export interface SceneHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  focusOn: (x: number, z: number) => void;
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

function WarningLabel({ centerX, centerZ, width }: { centerX: number; centerZ: number; width: number; }) {
  return (
    <Text position={[centerX, 0.15, centerZ - width / 2 - 3.5]} rotation={[-Math.PI / 2, 0, 0]} fontSize={1.2} color="#EF4444" fontWeight="bold" anchorX="center">
      {'⚠ SẮP ĐẦY (≥90%)'}
    </Text>
  );
}

interface ZoneBlockProps {
  position: [number, number, number];
  zoneName: string;
  whType: WHType;
  onClick: () => void;
  highlightId?: string;
  previewPosition?: PreviewPosition | null;
  lockedSlotKeys: Set<string>;
  onLockToggle: (whType: WHType, zoneName: string, row: number, col: number, lock: boolean) => void;
  onDamageContainer: (payload: {
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

function ZoneBlock({ position, zoneName, whType, onClick, highlightId, previewPosition, lockedSlotKeys, onLockToggle, onDamageContainer }: ZoneBlockProps) {
  const wh = WH_MAP[whType];
  const allYards = useSyncExternalStore(subscribeYard, getYardData);
  const occupancyMap = useSyncExternalStore(subscribeOccupancy, getOccupancyData);
  const damagePending = useSyncExternalStore(subscribeDamage, getPendingByCodeMap);
  const occupancyLoaded = isOccupancyFetched();

  const totalSlots = getZoneTotalSlots(allYards, whType, zoneName);
  const filledCount = occupancyLoaded ? countOccupiedZoneSlots(occupancyMap, whType, zoneName) : countZoneFilledSlots(allYards, whType, zoneName);
  const isWarning = totalSlots > 0 && filledCount / totalSlots >= WARNING_THRESHOLD;

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
      weight?: string;
      gateInDate?: string;
      storageDuration?: string;
      whName?: string;
      blockName?: string;
      statusText?: string;
      isOverdue?: boolean;
      isPendingPlacement?: boolean;
    }[] = [];

    const { rows: gridRows, cols: gridCols, maxTier } = getZoneDims(allYards, whType, zoneName);
    const maxLevels = maxTier || 3;

    if (occupancyLoaded) {
      // Dedup: một container 40ft có thể có 2 entries trong occupancy (anchor row +
      // continuation row) nếu data từng được seed cho cả 2 slot. Giữ 1 entry duy
      // nhất per containerCode để tránh render trùng.
      const seen40ft = new Set<string>();

      for (let tier = 1; tier <= maxLevels; tier++) {
        for (let row = 0; row < gridRows; row++) {
          for (let col = 0; col < gridCols; col++) {
            const occ = getSlotOccupancy(occupancyMap, whType, zoneName, row, col, tier);
            if (!occ) continue;

            // ── Source of truth: occ.sizeType (lấy từ container.container_type ở DB).
            const is40ft = occ.sizeType === '40ft';
            const y = (tier - 1) * CTN_H + CTN_H / 2;
            const x = colX(col);

            if (is40ft) {
              if (seen40ft.has(occ.containerCode)) continue;
              seen40ft.add(occ.containerCode);

              const baseRow = row % 2 === 0 ? row : row - 1;
              const nextRow = Math.min(baseRow + 1, gridRows - 1);
              const z = (rowZ(baseRow) + rowZ(nextRow)) / 2;
              items.push({
                key: `real-40-${tier}-${baseRow}-${col}`,
                pos: [x, y, z],
                sizeType: '40ft',
                id: occ.containerCode,
                floor: tier,
                slot: `R${baseRow + 1}-${baseRow + 2}C${col + 1}`,
                colorSeed: occ.containerId,
                cargoType: occ.cargoType,
                containerType: occ.sizeType,
                weight: occ.weight,
                gateInDate: occ.gateInDate,
                storageDuration: occ.storageDuration,
                whName: occ.whName ?? wh.name,
                blockName: occ.blockName ?? zoneName,
                statusText: occ.statusText ?? 'Trong kho',
                isOverdue: occ.isOverdue,
                isPendingPlacement: occ.isPendingPlacement,
              });
            } else {
              items.push({
                key: `real-20-${tier}-${row}-${col}`,
                pos: [x, y, rowZ(row)],
                sizeType: '20ft',
                id: occ.containerCode,
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
                isOverdue: occ.isOverdue,
                isPendingPlacement: occ.isPendingPlacement,
              });
            }
          }
        }
      }
    }

    return items;
  }, [allYards, occupancyMap, occupancyLoaded, whType, zoneName]);

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
          whName={wh.name}
          blockName={zoneName}
          isOverdue={ctn.isOverdue}
          isPendingPlacement={ctn.isPendingPlacement}
          isDamageReported={damagePending.has(ctn.id)}
          onDamageClick={onDamageContainer}
        />
      ))}

      {previewPosition && (() => {
        const zoneMatch = previewPosition.zone.trim().toLowerCase() === zoneName.trim().toLowerCase();
        if (!zoneMatch) return null;
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
        <>
          <WarningBorder centerX={centerX} centerZ={centerZ} width={TOTAL_X + 3} height={TOTAL_Z + 3} />
          <WarningLabel centerX={centerX} centerZ={centerZ} width={TOTAL_Z + 3} />
        </>
      )}

      {/* Locked slot markers */}
      {(() => {
        const { rows: gridRows, cols: gridCols } = getZoneDims(allYards, whType, zoneName);
        const markers: JSX.Element[] = [];
        for (let row = 0; row < gridRows; row++) {
          for (let col = 0; col < gridCols; col++) {
            const key = `${whType}/${zoneName}/${row}/${col}`;
            if (!lockedSlotKeys.has(key)) continue;
            const x = colX(col);
            const z = rowZ(row);
            markers.push(
              <group key={`lock-${row}-${col}`} position={[x, 0.06, z]}>
                <mesh rotation={[-Math.PI / 2, 0, 0]} onClick={(e) => { e.stopPropagation(); onLockToggle(whType, zoneName, row, col, false); }}>
                  <planeGeometry args={[CTN_W, CTN_L20]} />
                  <meshStandardMaterial color="#EF4444" transparent opacity={0.45} side={THREE.DoubleSide} />
                </mesh>
                <Text position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={1.2} color="#DC2626" anchorX="center" anchorY="middle">
                  {'🔒'}
                </Text>
              </group>
            );
          }
        }
        return markers;
      })()}
    </group>
  );
}

const MIN_DIST = 15;
const MAX_DIST = 200;

function CameraControls({ handleRef, centerX }: { handleRef: React.MutableRefObject<SceneHandle | null>, centerX: number }) {
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
      const cz = TOTAL_Z / 2;
      camera.position.set(centerX, 45, cz + 55);
      orbitRef.current.target.set(centerX, 0, cz);
      orbitRef.current.update();
    },
    focusOn: (x: number, z: number) => {
      if (!orbitRef.current) return;
      const target = new THREE.Vector3(x, 0, z);
      const offset = new THREE.Vector3(18, 28, 18);
      camera.position.copy(target).add(offset);
      orbitRef.current.target.copy(target);
      orbitRef.current.update();
    },
  };

  return <OrbitControls ref={orbitRef} makeDefault maxPolarAngle={Math.PI / 2 - 0.05} minDistance={MIN_DIST} maxDistance={MAX_DIST} target={[centerX, 0, TOTAL_Z / 2]} />;
}

interface WarehouseSceneProps {
  warehouseType: WHType;
  onZoneClick: (zone: ZoneInfo) => void;
  highlightId?: string;
  previewPosition?: PreviewPosition | null;
  onDamageContainer: (payload: {
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

const ZONE_SPACING = 34;

const WarehouseScene = forwardRef<SceneHandle, WarehouseSceneProps>(
  ({ warehouseType, onZoneClick, highlightId, previewPosition, onDamageContainer }, ref) => {
    const handleRef = useRef<SceneHandle | null>(null);
    const allYards = useSyncExternalStore(subscribeYard, getYardData);
    const occupancyMap = useSyncExternalStore(subscribeOccupancy, getOccupancyData);
    const zones = getZoneNames(allYards, warehouseType);
    const [lockRefreshKey, setLockRefreshKey] = useState(0);

    const lockedSlotKeys = useMemo(() => {
      void lockRefreshKey; // dependency trigger
      return getLockedSlotKeys(allYards, getCachedYards());
    }, [allYards, lockRefreshKey]);

    async function handleLockToggle(wh: WHType, zoneName: string, row: number, col: number, lock: boolean) {
      // Find yard and zone from reactive store which already has correct whType
      const matchedYard = allYards.find(y => y.whType === wh);
      if (!matchedYard) { toast.error('Không tìm thấy dữ liệu kho'); return; }
      
      const matchedZone = matchedYard.zones.find(z => z.zoneName === zoneName);
      if (!matchedZone) { toast.error('Không tìm thấy zone'); return; }

      const cachedYards = getCachedYards();
      let slotId: number | undefined;

      const targetYard = cachedYards.find(y => y.yardId === matchedYard.yardId);
      const targetZone = targetYard?.zones.find(z => z.zoneId === matchedZone.zoneId);
      
      if (targetZone) {
        for (const b of targetZone.blocks) {
          for (const s of b.slots) {
            if (s.rowNo === row + 1 && s.bayNo === col + 1) { slotId = s.slotId; break; }
          }
          if (slotId) break;
        }
      }
      if (!slotId) { toast.error('Không tìm thấy slot'); return; }

      try {
        const action = lock ? 'lock' : 'unlock';
        const res = await apiFetch(`/admin/slot-lock/slots/${slotId}/${action}`, { 
          method: 'PUT',
          body: JSON.stringify({})
        });
        if (!res.ok) throw new Error('API error');
        // Update slot in cached data
        for (const y of cachedYards) {
          for (const z of y.zones) {
            for (const b of z.blocks) {
              for (const s of b.slots) {
                if (s.slotId === slotId) s.isLocked = lock;
              }
            }
          }
        }
        // Re-process and sync reactive store
        setYardData(processApiYards(cachedYards));
        setLockRefreshKey(k => k + 1);
        toast.success(lock
          ? `🔒 Đã khóa vị trí R${row + 1}B${col + 1} tại ${zoneName}`
          : `🔓 Đã mở khóa vị trí R${row + 1}B${col + 1} tại ${zoneName}`);
      } catch {
        toast.error('Lỗi khi thay đổi trạng thái khóa');
      }
    }

    useImperativeHandle(ref, () => ({
      zoomIn: () => handleRef.current?.zoomIn(),
      zoomOut: () => handleRef.current?.zoomOut(),
      resetView: () => handleRef.current?.resetView(),
      focusOn: (x: number, z: number) => handleRef.current?.focusOn(x, z),
    }), []);

    function handleZoneClick(zoneName: string) {
      const wh = WH_MAP[warehouseType];
      const total = getZoneTotalSlots(allYards, warehouseType, zoneName);
      const occupiedSlots = isOccupancyFetched()
        ? countOccupiedZoneSlots(occupancyMap, warehouseType, zoneName)
        : countZoneFilledSlots(allYards, warehouseType, zoneName);

      onZoneClick({
        name: zoneName,
        type: wh.name,
        fillRate: total > 0 ? Math.round((occupiedSlots / total) * 100) : 0,
        emptySlots: total - occupiedSlots,
        totalSlots: total,
        recentContainers: wh.recentContainers,
      });
    }

    const zoneSpan = zones.length > 0 ? (zones.length - 1) * ZONE_SPACING : 0;
    const centerGroupX = zoneSpan / 2 + TOTAL_X / 2;
    const groundW = Math.max(140, zoneSpan + TOTAL_X + 40);

    return (
      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(to bottom, #dbe4f0, #f5f7fa)' }}>
        <Canvas shadows camera={{ position: [centerGroupX, 45, TOTAL_Z / 2 + 55], fov: 45 }}>
          <Suspense fallback={null}>
            <Environment preset="city" />
            <ambientLight intensity={0.5} />
            <directionalLight position={[30, 35, 25]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centerGroupX, -0.02, TOTAL_Z / 2]}>
              <planeGeometry args={[groundW, 60]} />
              <meshStandardMaterial color="#F1F5F9" />
            </mesh>
            <ContactShadows position={[centerGroupX, 0, TOTAL_Z / 2]} opacity={0.3} scale={groundW} blur={2} far={10} />
            {zones.map((zone, i) => (
              <ZoneBlock
                key={`${warehouseType}-${zone}`}
                position={[i * ZONE_SPACING, 0, 0]}
                zoneName={zone}
                whType={warehouseType}
                onClick={() => handleZoneClick(zone)}
                highlightId={highlightId}
                previewPosition={previewPosition?.whType === warehouseType ? previewPosition : null}
                lockedSlotKeys={lockedSlotKeys}
                onLockToggle={handleLockToggle}
                onDamageContainer={onDamageContainer}
              />
            ))}
            <CameraControls handleRef={handleRef} centerX={centerGroupX} />
          </Suspense>
        </Canvas>
      </div>
    );
  }
);

WarehouseScene.displayName = 'WarehouseScene';
export { WarehouseScene };
