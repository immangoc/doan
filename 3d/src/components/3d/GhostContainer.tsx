// ─── Ghost Container – semi-transparent preview of where a container will go ──
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

const WIDTH = 2.4;
const HEIGHT = 2.6;
const RAIL_H = 0.12;

interface GhostContainerProps {
  position: [number, number, number];
  sizeType: '20ft' | '40ft';
  color: string;
  label?: string;
}

export function GhostContainer({ position, sizeType, color, label }: GhostContainerProps) {
  const LENGTH = sizeType === '40ft' ? 12.0 : 6.0; // 40ft = exactly 2× 20ft
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    // Gentle floating animation
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.15;

    if (matRef.current) {
      // Pulsing opacity
      const pulse = 0.25 + 0.15 * Math.sin(state.clock.elapsedTime * 3);
      matRef.current.opacity = pulse;
    }
  });

  return (
    <group position={position}>
      <group ref={groupRef}>
        {/* Ghost body */}
        <mesh>
          <boxGeometry args={[WIDTH, HEIGHT, LENGTH]} />
          <meshStandardMaterial
            ref={matRef}
            color={color}
            transparent
            opacity={0.3}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Wireframe outline */}
        <mesh>
          <boxGeometry args={[WIDTH + 0.05, HEIGHT + 0.05, LENGTH + 0.05]} />
          <meshBasicMaterial
            color={color}
            wireframe
            transparent
            opacity={0.6}
          />
        </mesh>

        {/* Top rail ghost */}
        <mesh position={[0, HEIGHT / 2 + RAIL_H / 2, 0]}>
          <boxGeometry args={[WIDTH + 0.06, RAIL_H, LENGTH + 0.06]} />
          <meshStandardMaterial color={color} transparent opacity={0.2} depthWrite={false} />
        </mesh>

        {/* Bottom rail ghost */}
        <mesh position={[0, -HEIGHT / 2 - RAIL_H * 0.7, 0]}>
          <boxGeometry args={[WIDTH + 0.06, RAIL_H * 1.3, LENGTH + 0.06]} />
          <meshStandardMaterial color={color} transparent opacity={0.2} depthWrite={false} />
        </mesh>

        {/* Ground glow indicator */}
        <mesh position={[0, -HEIGHT / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[WIDTH + 1, LENGTH + 1]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.15}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Label */}
        {label && (
          <Html position={[0, HEIGHT / 2 + 1.2, 0]} center style={{ pointerEvents: 'none' }}>
            <div style={{
              background: `${color}ee`,
              color: '#fff',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}>
              {label}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}
