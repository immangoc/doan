import { ContainerBlock } from './ContainerBlock';
import type { ContainerStatus } from './ContainerBlock';
import type { ContainerSize } from './ContainerBlock';

interface StackItem {
  id: string;
  status: ContainerStatus;
  sizeType: ContainerSize;
  position: [number, number, number];
}

interface ContainerStackProps {
  position: [number, number, number];
  rows: number;
  cols: number;
  levels: number;
}

const STATUSES: ContainerStatus[] = ['cold', 'dry', 'fragile', 'other'];

// 20ft dimensions
const WIDTH  = 2.4;
const HEIGHT = 2.6;
const LENGTH = 6.0;   // 20ft length
const GAP_X  = 0.5;
const GAP_Z  = 0.5;

// 40ft container length exactly spans 2×20ft + their gap
const LENGTH_40 = 2 * LENGTH + GAP_Z; // = 12.5

export function ContainerStack({ position, rows, cols, levels }: ContainerStackProps) {
  const containers: StackItem[] = [];

  // Cap maximum stacking at 4 floors
  const maxLevels = Math.min(levels, 4);

  for (let l = 0; l < maxLevels; l++) {
    // Track which row-col slots are claimed on this level
    const occupied = new Set<string>();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = `${r}-${c}`;
        if (occupied.has(key)) continue;
        if (Math.random() > 0.8) continue; // ~20% of slots stay empty

        const x = c * (WIDTH + GAP_X);
        const y = l * HEIGHT + HEIGHT / 2;
        const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
        const id = `CTN-${l}${r}${c}-${(Math.random() * 9000 + 1000) | 0}`;

        // Try to place a 40ft container (~35% of containers)
        const nextKey = `${r + 1}-${c}`;
        const can40ft = r + 1 < rows && !occupied.has(nextKey);
        const is40ft  = can40ft && Math.random() < 0.35;

        if (is40ft) {
          // Center is midway between row r and row r+1 (including the gap)
          const z = r * (LENGTH + GAP_Z) + (LENGTH + GAP_Z) / 2;
          containers.push({ id, status, sizeType: '40ft', position: [x, y, z] });
          occupied.add(key);
          occupied.add(nextKey);
        } else {
          const z = r * (LENGTH + GAP_Z);
          containers.push({ id, status, sizeType: '20ft', position: [x, y, z] });
          occupied.add(key);
        }
      }
    }
  }

  return (
    <group position={position}>
      {/* Subtle base pad */}
      <mesh
        position={[(cols * (WIDTH + GAP_X)) / 2 - WIDTH / 2, 0.01, (rows * (LENGTH + GAP_Z)) / 2 - LENGTH / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[cols * (WIDTH + GAP_X) + 1, rows * (LENGTH + GAP_Z) + 1]} />
        <meshStandardMaterial color="#E2E8F0" transparent opacity={0.5} />
      </mesh>

      {containers.map((ctn) => (
        <ContainerBlock
          key={ctn.id}
          id={ctn.id}
          position={ctn.position}
          status={ctn.status}
          sizeType={ctn.sizeType}
        />
      ))}
    </group>
  );
}

export { LENGTH_40 };
