import { useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { apiFetch } from '../../services/apiClient';

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
  onStartRelocate?: (containerCode: string) => void;
  /** When enabled, clicking the container triggers lock-pick instead of opening tooltip. */
  lockPickEnabled?: boolean;
  onLockPick?: (containerCode: string) => void;
  /** Visual hint: container sits on a locked slot. */
  locked?: boolean;
  // Phase 4: real data props (optional — falls back to mock if not provided)
  cargoType?:      string;
  weight?:         string;
  gateInDate?:     string;
  storageDuration?: string;
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
  onStartRelocate,
  lockPickEnabled,
  onLockPick,
  locked,
  cargoType,
  weight,
  gateInDate,
  storageDuration,
}: ContainerBlockProps) {
  const LENGTH = sizeType === '40ft' ? 12.0 : 6.0; // 40ft = exactly 2× 20ft
  const baseColor = getContainerColor(colorSeed);
  const color = locked ? '#111827' : baseColor;
  const frameColor = darkenHex(color, locked ? 10 : 45);

  const bounceRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.MeshStandardMaterial>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [selected, setSelected] = useState(false);
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [tooltipNudge, setTooltipNudge] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Close tooltip when clicking outside (only when selected)
  useEffect(() => {
    if (!selected) return;
    const onDown = (ev: MouseEvent) => {
      const t = ev.target as Node | null;
      if (!t) return;
      if (tooltipRef.current?.contains(t)) return;
      setSelected(false);
      setShowDamageModal(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [selected]);

  // Prevent tooltip from overflowing the viewport (clamp into view).
  useLayoutEffect(() => {
    if (!(hovered || selected)) return;
    const el = tooltipRef.current;
    if (!el) return;

    let raf = 0;
    const PAD = 12;

    const measureAndClamp = () => {
      const rect = el.getBoundingClientRect();
      let dx = 0;
      let dy = 0;

      if (rect.left < PAD) dx = PAD - rect.left;
      if (rect.right > window.innerWidth - PAD) dx = (window.innerWidth - PAD) - rect.right;
      if (rect.top < PAD) dy = PAD - rect.top;
      if (rect.bottom > window.innerHeight - PAD) dy = (window.innerHeight - PAD) - rect.bottom;

      setTooltipNudge({ x: dx, y: dy });
    };

    raf = window.requestAnimationFrame(measureAndClamp);
    const onResize = () => window.requestAnimationFrame(measureAndClamp);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.cancelAnimationFrame(raf);
    };
  }, [hovered, selected, showDamageModal]);

  const handleReportDamage = async () => {
    setReporting(true);
    try {
      // 1) Mark status as DAMAGED on backend (adds to "Quản lý kho hỏng" list)
      const res = await apiFetch(`/admin/containers/${id}/damage`, { method: 'POST' });
      if (res.ok) {
        // Notify management page to refresh immediately
        window.dispatchEvent(new CustomEvent('wms:damaged-refresh', { detail: { containerId: id } }));
      }

      alert(`Đã báo hỏng container ${id}!`);
      setShowDamageModal(false);
      setSelected(false);
    } catch (e: any) {
      alert(`Lỗi báo hỏng container ${id}: ${e?.message || 'Không xác định'}`);
      setShowDamageModal(false);
      setSelected(false);
    } finally {
      setReporting(false);
    }
  };

  const isHighlighted = !!(highlightId && id.toLowerCase().includes(highlightId.toLowerCase()));

  const corrugatedTex = useMemo(() => getCorrugatedTexture(color), [color]);

  useFrame((state) => {
    if (!bounceRef.current) return;
    if (isHighlighted) {
      bounceRef.current.position.y = Math.sin(state.clock.elapsedTime * 5) * 0.35;
    } else if (hovered) {
      bounceRef.current.position.y = Math.sin(state.clock.elapsedTime * 4) * 0.1;
    } else if (Math.abs(bounceRef.current.position.y) > 0.001) {
      bounceRef.current.position.y = THREE.MathUtils.lerp(bounceRef.current.position.y, 0, 0.1);
    }

    if (bodyRef.current) {
      if (isHighlighted) {
        const pulse = 0.25 + 0.2 * Math.sin(state.clock.elapsedTime * 6);
        bodyRef.current.emissiveIntensity = pulse;
      } else if (locked) {
        const pulse = 0.15 + 0.12 * Math.sin(state.clock.elapsedTime * 5);
        bodyRef.current.emissiveIntensity = pulse;
      }
    }
  });

  const vLabel          = `Zone ${zone} - ${statusLabel[status]} - Tầng ${floor} - ${slot}`;
  const displayCargo    = cargoType      ?? `${sizeType} - ${statusLabel[status]}`;
  const displayWeight   = weight         ?? '—';
  const displayGateIn   = gateInDate     ?? '—';
  const displayDuration = storageDuration ?? '—';

  return (
    <group position={position}>
      <group ref={bounceRef}>
        {/* Main corrugated body */}
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            if (lockPickEnabled) {
              onLockPick?.(id);
              return;
            }
            setSelected(!selected);
          }}
          onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
          onPointerOut={(e)  => { e.stopPropagation(); setHovered(false); }}
        >
          <boxGeometry args={[WIDTH, HEIGHT, LENGTH]} />
          <meshStandardMaterial
            ref={bodyRef}
            map={corrugatedTex}
            emissive={isHighlighted ? '#FACC15' : locked ? '#EF4444' : hovered ? baseColor : '#000000'}
            emissiveIntensity={isHighlighted ? 0.3 : locked ? 0.18 : hovered ? 0.2 : 0}
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
        {(hovered || selected) && (
          <Html
            position={[0, HEIGHT / 2 + 1.5, 0]}
            center
            // Key fix to avoid flicker:
            // - hover tooltip should NOT capture pointer events (so mesh onPointerOut won't fire)
            // - when selected, allow interaction inside tooltip (buttons)
            style={{ pointerEvents: selected ? 'auto' : 'none', zIndex: 50 }}
          >
            {showDamageModal ? (
              <div
                ref={tooltipRef}
                style={{
                transform: `translate3d(${tooltipNudge.x}px, ${tooltipNudge.y}px, 0)`,
                background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.2)', padding: '20px', width: '320px',
                fontFamily: 'Inter, sans-serif',
                maxWidth: 'calc(100vw - 24px)',
                maxHeight: 'calc(100vh - 24px)',
                overflow: 'auto',
              }}
              >
                <h3 style={{ margin: '0 0 10px', fontSize: '16px', color: '#111827', fontWeight: 600 }}>Quản lý kho hỏng</h3>
                <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#4B5563' }}>
                  Xác nhận đưa container <strong>{id}</strong> vào Kho Hỏng?
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowDamageModal(false)}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #D1D5DB', background: '#fff', cursor: 'pointer', fontSize: '14px' }}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleReportDamage}
                    disabled={reporting}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#DC2626', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
                  >
                    {reporting ? 'Đang xử lý...' : 'Xác nhận'}
                  </button>
                </div>
              </div>
            ) : (
              <div
                ref={tooltipRef}
                style={{
                transform: `translate3d(${tooltipNudge.x}px, ${tooltipNudge.y}px, 0)`,
                background: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                padding: '14px 18px',
                width: '290px',
                fontFamily: 'Inter, -apple-system, sans-serif',
                maxWidth: 'calc(100vw - 24px)',
                maxHeight: 'calc(100vh - 24px)',
                overflow: 'auto',
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
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '12px' }}>
                  <tbody>
                    {[
                      { label: 'Mã số Container:', value: id },
                      ...(locked ? [{ label: 'Vị trí:', value: 'ĐANG BỊ KHÓA', style: { color: '#DC2626', fontWeight: '800' as const } }] : []),
                      { label: 'Loại hàng:', value: displayCargo },
                      { label: 'Trọng lượng:', value: displayWeight },
                      { label: 'Trạng thái:', value: 'Lưu kho', style: { color: '#F97316', fontWeight: '600' as const } },
                      { label: 'Vị trí:', value: vLabel, style: { fontWeight: '700' as const, color: '#111827' } },
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
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '10px', textAlign: 'center' }}>
                  {selected ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {onStartRelocate && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onStartRelocate(id); }}
                          style={{
                            width: '100%', padding: '8px', borderRadius: '6px',
                            border: '1px solid #bfdbfe', background: '#eff6ff',
                            color: '#1d4ed8', fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                          Dời vị trí (thủ công)
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowDamageModal(true); }}
                        style={{
                          width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #FCA5A5', background: '#FEF2F2',
                          color: '#DC2626', fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                          <line x1="12" y1="9" x2="12" y2="13"/>
                          <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        Báo hỏng container
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Click để thao tác</div>
                  )}
                </div>
              </div>
            )}
          </Html>
        )}
      </group>
    </group>
  );
}
