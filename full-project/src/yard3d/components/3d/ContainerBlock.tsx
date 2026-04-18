import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

export type ContainerStatus = 'cold' | 'dry' | 'fragile' | 'other';
export type ContainerSize = '20ft' | '40ft';

const statusLabel: Record<ContainerStatus, string> = {
  cold:    'Hàng Lạnh',
  dry:     'Hàng Khô',
  fragile: 'Hàng dễ vỡ',
  other:   'Khác',
};

// ─── Realistic container color palette ───────────────────────────────────────
const PALETTE = [
  '#1B3B6F', '#1a3a5c', '#1D4ED8', '#2563EB', '#1E40AF', '#3B82F6',
  '#7C3A1C', '#8B4513', '#92400E', '#A0522D', '#6B3410',
  '#B45309', '#D97706',
  '#6B7280', '#4B5563', '#374151', '#9CA3AF',
  '#DC2626', '#7F1D1D',
  '#065F46',
];

export function getContainerColor(seed: number): string {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return PALETTE[Math.abs(Math.floor(x)) % PALETTE.length];
}

function darkenHex(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 0xFF) - amount);
  const g = Math.max(0, ((num >> 8) & 0xFF) - amount);
  const b = Math.max(0, (num & 0xFF) - amount);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// ─── Corrugated texture cache ────────────────────────────────────────────────
const texCache = new Map<string, THREE.CanvasTexture>();

function getCorrugatedTexture(baseColor: string): THREE.CanvasTexture {
  if (texCache.has(baseColor)) return texCache.get(baseColor)!;

  const W = 256, H = 128;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Base fill
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, W, H);

  // Corrugation ridges – sinusoidal vertical stripes
  const ridgePx = 8;
  for (let x = 0; x < W; x++) {
    const t = (x % ridgePx) / ridgePx;
    const sine = Math.sin(t * Math.PI * 2);
    if (sine > 0) {
      ctx.fillStyle = `rgba(255,255,255,${sine * 0.15})`;
    } else {
      ctx.fillStyle = `rgba(0,0,0,${-sine * 0.13})`;
    }
    ctx.fillRect(x, 5, 1, H - 10);
  }

  // Top frame band
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.fillRect(0, 0, W, 5);

  // Bottom frame band
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, H - 5, W, 5);

  // Corner post lines (left & right)
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(0, 0, 4, H);
  ctx.fillRect(W - 4, 0, 4, H);

  const tex = new THREE.CanvasTexture(canvas);
  texCache.set(baseColor, tex);
  return tex;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const WIDTH  = 2.4;
const HEIGHT = 2.6;
const RAIL_H = 0.12;

// ─── Component ───────────────────────────────────────────────────────────────
interface ContainerBlockProps {
  position: [number, number, number];
  status: ContainerStatus;
  id: string;
  sizeType?: ContainerSize;
  colorSeed?: number;
  zone?: string;
  floor?: number;
  slot?: string;
  highlightId?: string;
  onDamageClick?: (payload: {
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
  // Phase 4: real data props (optional — falls back to mock if not provided)
  cargoType?:       string;
  containerType?:   string;
  weight?:          string;
  gateInDate?:      string;
  storageDuration?: string;
  whName?:          string;
  blockName?:       string;
  statusText?:      string;
}

export function ContainerBlock({
  position,
  status,
  id,
  sizeType = '20ft',
  colorSeed = 0,
  zone = 'A',
  floor = 1,
  slot = 'CT01',
  highlightId,
  onDamageClick,
  cargoType,
  containerType,
  weight,
  gateInDate,
  storageDuration,
  whName,
  blockName,
  statusText,
}: ContainerBlockProps) {
  const LENGTH = sizeType === '40ft' ? 12.0 : 6.0; // 40ft = exactly 2× 20ft
  const color = getContainerColor(colorSeed);
  const frameColor = darkenHex(color, 45);

  const bounceRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const [tooltipHovered, setTooltipHovered] = useState(false);
  const [pinned, setPinned] = useState(false);

  const isHighlighted = !!(highlightId && id.toLowerCase().includes(highlightId.toLowerCase()));

  const corrugatedTex = useMemo(() => getCorrugatedTexture(color), [color]);

  useFrame((state) => {
    if (!bounceRef.current) return;
    if (isHighlighted) {
      bounceRef.current.position.y = Math.sin(state.clock.elapsedTime * 5) * 0.35;
    } else if (hovered || tooltipHovered || pinned) {
      bounceRef.current.position.y = Math.sin(state.clock.elapsedTime * 4) * 0.1;
    } else if (Math.abs(bounceRef.current.position.y) > 0.001) {
      bounceRef.current.position.y = THREE.MathUtils.lerp(bounceRef.current.position.y, 0, 0.1);
    }

    if (bodyRef.current && isHighlighted) {
      const pulse = 0.25 + 0.2 * Math.sin(state.clock.elapsedTime * 6);
      bodyRef.current.emissiveIntensity = pulse;
    }
  });

  const vLabel          = `Zone ${zone} - ${statusLabel[status]} - Tầng ${floor} - ${slot}`;
  const displayCargo    = cargoType      ?? containerType ?? `${sizeType} - ${statusLabel[status]}`;
  const displayWeight   = weight         ?? '—';
  const displayGateIn   = gateInDate     ?? '—';
  const displayDuration = storageDuration ?? '—';
  const displayStatus   = statusText     ?? 'Lưu kho';
  const displayZone     = zone           ?? '—';

  return (
    <group position={position}>
      <group ref={bounceRef}>
        {/* Main corrugated body */}
        <mesh
          onPointerOver={(e) => { e.stopPropagation(); setHovered(true); setPinned(false); }}
          onPointerOut={(e)  => { e.stopPropagation(); if (!tooltipHovered && !pinned) setHovered(false); }}
        >
          <boxGeometry args={[WIDTH, HEIGHT, LENGTH]} />
          <meshStandardMaterial
            ref={bodyRef}
            map={corrugatedTex}
            emissive={isHighlighted ? '#FACC15' : hovered ? color : '#000000'}
            emissiveIntensity={isHighlighted ? 0.3 : hovered ? 0.2 : 0}
            roughness={0.55}
            metalness={0.35}
          />
        </mesh>

        {/* Top rail */}
        <mesh position={[0, HEIGHT / 2 + RAIL_H / 2, 0]}>
          <boxGeometry args={[WIDTH + 0.06, RAIL_H, LENGTH + 0.06]} />
          <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.4} />
        </mesh>

        {/* Bottom rail */}
        <mesh position={[0, -HEIGHT / 2 - RAIL_H * 0.7, 0]}>
          <boxGeometry args={[WIDTH + 0.06, RAIL_H * 1.3, LENGTH + 0.06]} />
          <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.4} />
        </mesh>

        {/* Hover tooltip */}
        {(hovered || tooltipHovered || pinned) && (
          <Html position={[0, HEIGHT / 2 + 1.5, 0]} center style={{ pointerEvents: 'auto' }}>
            <div
              onMouseEnter={() => { setTooltipHovered(true); setHovered(true); }}
              onMouseLeave={() => { setTooltipHovered(false); if (!pinned) setHovered(false); }}
              style={{
                background: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                padding: '14px 18px',
                width: '290px',
                fontFamily: 'Inter, -apple-system, sans-serif',
                pointerEvents: 'auto',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '36px', height: '36px', borderRadius: '8px',
                  backgroundColor: '#FFF7ED',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <tbody>
                  {[
                    { label: 'Mã số Container:', value: id },
                    { label: 'Loại hàng:', value: displayCargo },
                    { label: 'Trọng lượng:', value: displayWeight },
                    { label: 'Trạng thái:', value: displayStatus, style: { color: '#F97316', fontWeight: '600' as const } },
                    { label: 'Vị trí:', value: vLabel, style: { fontWeight: '700' as const, color: '#111827' } },
                    { label: 'Zone:', value: displayZone },
                    { label: 'Ngày nhập bãi:', value: displayGateIn },
                    { label: 'Thời gian lưu kho:', value: displayDuration },
                  ].map(({ label, value, style }) => (
                    <tr key={label}>
                      <td style={{ color: '#6B7280', paddingBottom: '5px', paddingRight: '8px', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                        {label}
                      </td>
                      <td style={{ color: '#374151', paddingBottom: '5px', textAlign: 'right', ...style }}>
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPinned(true);
                    onDamageClick?.({
                      containerCode: id,
                      cargoType: displayCargo,
                      containerType: containerType ?? sizeType,
                      weight: displayWeight,
                      whName: whName ?? 'Kho hỏng',
                      blockName: blockName ?? `Zone ${zone}`,
                      zone,
                      slot,
                      floor,
                    });
                  }}
                  style={{
                    border: '1px solid #F59E0B',
                    background: '#FFF7ED',
                    color: '#C2410C',
                    borderRadius: '999px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Báo hỏng
                </button>
              </div>
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}
