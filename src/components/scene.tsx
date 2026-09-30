'use client';
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  BufferGeometry,
  Float32BufferAttribute,
  DoubleSide,
  Spherical,
  Vector3,
  type Group,
} from 'three';
import type { OrbitControls as Controls } from 'three-stdlib';
import { muscleById, type MuscleId } from '@/domain/catalog';
import { avatars, type GodId } from '@/domain/avatars';

type Vec = [number, number, number];
function Pectoral({
  side,
  color,
  onClick,
}: {
  side: number;
  color: string;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const geometry = useMemo(() => {
    const outline: Vec[] = [
      [0.025, 1.235, 0.155],
      [0.2, 1.25, 0.15],
      [0.405, 1.18, 0.09],
      [0.425, 1.095, 0.08],
      [0.33, 0.975, 0.18],
      [0.155, 0.952, 0.2],
      [0.025, 0.98, 0.18],
    ];
    const center: Vec = [0.205, 1.09, 0.266];
    const positions = [...center, ...outline.flat()].map((v, i) => (i % 3 === 0 ? v * side : v));
    const indices: number[] = [];
    for (let i = 1; i <= outline.length; i++) {
      const next = i === outline.length ? 1 : i + 1;
      indices.push(...(side === 1 ? [0, next, i] : [0, i, next]));
    }
    const mesh = new BufferGeometry();
    mesh.setAttribute('position', new Float32BufferAttribute(positions, 3));
    mesh.setIndex(indices);
    mesh.computeVertexNormals();
    return mesh;
  }, [side]);
  return (
    <mesh geometry={geometry} onClick={onClick}>
      <meshStandardMaterial color={color} side={DoubleSide} roughness={0.8} />
    </mesh>
  );
}
function Stone({
  position = [0, 0, 0],
  scale = [1, 1, 1],
  color = '#cad5c6',
  rotation = [0, 0, 0],
  onClick,
}: {
  position?: Vec;
  scale?: Vec;
  color?: string;
  rotation?: Vec;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) {
  return (
    <mesh
      position={position}
      scale={scale}
      rotation={rotation}
      onClick={onClick ?? ((event) => event.stopPropagation())}
      castShadow
      receiveShadow
    >
      <sphereGeometry args={[1, 24, 16]} />
      <meshStandardMaterial color={color} roughness={0.78} metalness={0.03} />
    </mesh>
  );
}
function CameraRig({
  selected,
  back,
  reset,
}: {
  selected: MuscleId | null;
  back: boolean;
  reset: number;
}) {
  const controls = useRef<Controls>(null);
  const { camera, invalidate } = useThree();
  const moving = useRef(true);
  const destination = useRef(new Vector3(0, 0.3, 5.2)),
    target = useRef(new Vector3(0, 0.2, 0));
  const currentOrbit = useRef(new Spherical()),
    desiredOrbit = useRef(new Spherical()),
    offset = useRef(new Vector3());
  useEffect(() => {
    const focus = selected ? muscleById[selected].focus : [0, 0.15, 0];
    target.current.set(focus[0] * 0.6, focus[1], 0);
    destination.current.set(
      focus[0] * 0.45,
      focus[1] + 0.15,
      (back ? -1 : 1) * (selected ? 2.65 : 5.3),
    );
    moving.current = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      camera.position.copy(destination.current);
      controls.current?.target.copy(target.current);
      controls.current?.update();
      moving.current = false;
    }
    invalidate();
  }, [selected, back, reset, invalidate]);
  useFrame((_, dt) => {
    if (!moving.current || !controls.current) return;
    const a = 1 - Math.exp(-6 * Math.min(dt, 0.1));
    const current = currentOrbit.current.setFromVector3(
      offset.current.copy(camera.position).sub(controls.current.target),
    );
    const desired = desiredOrbit.current.setFromVector3(
      offset.current.copy(destination.current).sub(target.current),
    );
    current.radius += (desired.radius - current.radius) * a;
    current.phi += (desired.phi - current.phi) * a;
    const angle = desired.theta - current.theta;
    current.theta += Math.atan2(Math.sin(angle), Math.cos(angle)) * a;
    controls.current.target.lerp(target.current, a);
    camera.position.copy(controls.current.target).add(offset.current.setFromSpherical(current));
    controls.current.update();
    if (
      camera.position.distanceTo(destination.current) < 0.005 &&
      controls.current.target.distanceTo(target.current) < 0.005
    )
      moving.current = false;
    else invalidate();
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      minDistance={1.6}
      maxDistance={7}
      minPolarAngle={0.45}
      maxPolarAngle={2.5}
      onStart={() => {
        moving.current = false;
      }}
    />
  );
}
function AnatomicalFigure({
  selected,
  onSelect,
}: {
  selected: MuscleId | null;
  onSelect: (id: MuscleId) => void;
}) {
  const [hover, setHover] = useState<MuscleId | null>(null);
  function part(id: MuscleId, position: Vec, scale: Vec, rotation: Vec = [0, 0, 0], key = '') {
    return (
      <group
        key={id + key + position.join(',')}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(id);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHover(null);
          document.body.style.cursor = '';
        }}
      >
        <Stone
          position={position}
          scale={scale}
          rotation={rotation}
          color={selected === id ? '#e69c94' : hover === id ? '#f1e2ce' : '#c1cbbb'}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(id);
          }}
        />
      </group>
    );
  }
  useEffect(
    () => () => {
      document.body.style.cursor = '';
    },
    [],
  );
  return (
    <group>
      <Stone position={[0, 0.79, 0]} scale={[0.41, 0.6, 0.2]} color="#859788" />
      <Stone position={[0, 0.04, 0]} scale={[0.34, 0.27, 0.22]} color="#929f8c" />
      <Stone position={[0, 1.43, 0]} scale={[0.125, 0.19, 0.12]} />
      <Stone position={[0, 1.68, 0]} scale={[0.2, 0.275, 0.2]} />
      <Stone position={[0, 1.63, 0.18]} scale={[0.035, 0.065, 0.045]} />
      <Stone position={[0, 1.76, 0.176]} scale={[0.16, 0.03, 0.035]} color="#9da994" />
      {[-1, 1].map((s) => (
        <group key={s}>
          <group
            onPointerOver={(e) => {
              e.stopPropagation();
              setHover('chest');
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHover(null);
              document.body.style.cursor = '';
            }}
          >
            <Pectoral
              side={s}
              color={selected === 'chest' ? '#e69c94' : hover === 'chest' ? '#f1e2ce' : '#c1cbbb'}
              onClick={(e) => {
                e.stopPropagation();
                onSelect('chest');
              }}
            />
          </group>
          {part('shoulders', [s * 0.515, 1.095, 0], [0.176, 0.2, 0.185], [0, 0, s * 0.28])}
          <Stone
            position={[s * 0.64, 0.76, 0]}
            scale={[0.13, 0.3, 0.13]}
            rotation={[0, 0, s * 0.29]}
            color="#879884"
          />
          {part('biceps', [s * 0.65, 0.78, 0.09], [0.103, 0.235, 0.089], [0, 0, s * 0.28])}
          {part('triceps', [s * 0.635, 0.78, -0.1], [0.117, 0.25, 0.09], [0, 0, s * 0.27])}
          {part('forearms', [s * 0.81, 0.31, 0.01], [0.099, 0.27, 0.104], [0, 0, s * 0.25])}
          <Stone position={[s * 0.9, -0.02, 0.02]} scale={[0.079, 0.135, 0.054]} />
          {[0, 1, 2, 3].map((i) => (
            <Stone
              key={i}
              position={[s * (0.86 + i * 0.024), -0.139 + Math.abs(1.5 - i) * 0.01, 0.02]}
              scale={[0.016, 0.071, 0.023]}
            />
          ))}
          {part('back', [s * 0.252, 0.85, -0.158], [0.178, 0.365, 0.1], [0, 0, -s * 0.27])}
          {part('back', [s * 0.23, 1.22, -0.08], [0.215, 0.112, 0.096], [0, 0, -s * 0.28], 'trap')}
          {part('core', [s * 0.289, 0.53, 0.112], [0.067, 0.3, 0.069], [0, 0, -s * 0.2], 'oblique')}
          {[0, 1, 2].map((i) =>
            part(
              'core',
              [s * 0.092, 0.81 - i * 0.159, 0.182],
              [0.096, 0.072, 0.044],
              [0, 0, 0],
              String(i),
            ),
          )}
          {part('glutes', [s * 0.169, 0.017, -0.16], [0.185, 0.23, 0.141])}
          <Stone position={[s * 0.23, -0.37, 0]} scale={[0.171, 0.48, 0.16]} color="#829480" />
          {part('quads', [s * 0.239, -0.32, 0.112], [0.151, 0.405, 0.095], [0, 0, -s * 0.055])}
          {part('quads', [s * 0.16, -0.599, 0.118], [0.086, 0.151, 0.081], [0, 0, 0], 'inner')}
          {part('hamstrings', [s * 0.241, -0.366, -0.129], [0.143, 0.38, 0.08])}
          <Stone position={[s * 0.227, -0.779, 0.035]} scale={[0.103, 0.114, 0.102]} />
          <Stone position={[s * 0.217, -1.092, 0.005]} scale={[0.084, 0.32, 0.081]} />
          {part('calves', [s * 0.23, -1.042, -0.084], [0.11, 0.237, 0.098])}
          <Stone position={[s * 0.217, -1.457, 0.112]} scale={[0.106, 0.067, 0.22]} />
        </group>
      ))}
      <mesh position={[0, -1.56, 0]}>
        <cylinderGeometry args={[0.66, 0.7, 0.08, 48]} />
        <meshStandardMaterial color="#244a3a" roughness={0.8} />
      </mesh>
    </group>
  );
}
export function GreekBust({
  god = 'zeus',
  faceForward = false,
}: {
  god?: GodId;
  faceForward?: boolean;
}) {
  const sculpture = useRef<Group>(null);
  const reduced = useRef(false);
  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);
  useFrame(({ invalidate }, delta) => {
    if (!faceForward || !sculpture.current) return;
    const rotation = sculpture.current.rotation;
    if (Math.abs(rotation.y) < 0.001) return;
    rotation.y = reduced.current ? 0 : rotation.y * Math.exp(-5 * Math.min(delta, 0.1));
    invalidate();
  });
  const accent = avatars.find((a) => a.id === god)?.accent ?? '#bec9af';
  const beard = god === 'zeus' || god === 'poseidon';
  const helmet = god === 'athena' || god === 'ares';
  return (
    <group ref={sculpture} position={[0, -0.18, 0]} rotation={[0, faceForward ? -0.95 : -0.28, 0]}>
      <mesh position={[0, -0.92, 0]}>
        <cylinderGeometry args={[0.43, 0.55, 0.22, 48]} />
        <meshStandardMaterial color="#345343" roughness={0.75} />
      </mesh>
      <Stone position={[0, -0.61, 0]} scale={[0.63, 0.32, 0.29]} color={accent} />
      <Stone position={[0, -0.2, 0]} scale={[0.2, 0.36, 0.2]} color={accent} />
      <Stone position={[0, 0.38, 0]} scale={[0.365, 0.51, 0.33]} color={accent} />
      <Stone position={[0, 0.1, 0.113]} scale={[0.29, 0.275, 0.25]} color={accent} />
      <Stone position={[0, 0.32, 0.31]} scale={[0.054, 0.13, 0.087]} color={accent} />
      <Stone position={[0, 0.145, 0.335]} scale={[0.102, 0.014, 0.014]} color="#8f9e85" />
      {beard && <Stone position={[0, -0.015, 0.17]} scale={[0.27, 0.25, 0.22]} color="#8fa286" />}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Stone position={[s * 0.374, 0.31, 0]} scale={[0.055, 0.112, 0.075]} color={accent} />
          <Stone
            position={[s * 0.146, 0.433, 0.292]}
            scale={[0.092, 0.031, 0.024]}
            color="#7c8e75"
          />
          <Stone
            position={[s * 0.146, 0.49, 0.288]}
            scale={[0.129, 0.035, 0.055]}
            rotation={[0, 0, -s * 0.14]}
            color={accent}
          />
          <Stone position={[s * 0.157, 0.42, 0.318]} scale={[0.046, 0.018, 0.012]} color={accent} />
          <Stone
            position={[s * 0.196, 0.279, 0.225]}
            scale={[0.127, 0.091, 0.052]}
            color={accent}
          />
          <Stone
            position={[s * 0.245, -0.441, 0.206]}
            scale={[0.225, 0.025, 0.024]}
            rotation={[0, 0, s * 0.1]}
            color="#94ab91"
          />
          {Array.from({ length: 7 }, (_, i) => (
            <Stone
              key={i}
              position={[
                s * (0.31 * Math.sin(i * 0.28)),
                0.76 - 0.16 * (i / 6),
                -0.025 + 0.22 * Math.cos(i * 0.3),
              ]}
              scale={[0.12, 0.105, 0.103]}
              color={helmet ? '#78927d' : '#7f9279'}
            />
          ))}
          {beard &&
            Array.from({ length: 7 }, (_, i) => (
              <Stone
                key={'beard' + i}
                position={[s * (0.245 - i * 0.035), 0.075 - i * 0.036, 0.28 + Math.sin(i) * 0.035]}
                scale={[0.066, 0.115, 0.058]}
                rotation={[0, 0, -s * 0.2]}
                color="#8ca285"
              />
            ))}
          {god === 'hermes' &&
            [0, 1, 2].map((i) => (
              <Stone
                key={'wing' + i}
                position={[s * (0.44 + i * 0.073), 0.64 + i * 0.09, -0.045]}
                scale={[0.045, 0.18, 0.055]}
                rotation={[0, 0, -s * (0.45 + i * 0.1)]}
                color="#d5e8cd"
              />
            ))}
          {helmet && (
            <Stone
              position={[s * 0.32, 0.32, 0.06]}
              scale={[0.072, 0.24, 0.13]}
              rotation={[0, 0, -s * 0.15]}
              color="#81977a"
            />
          )}
        </group>
      ))}
      {helmet && (
        <>
          <Stone position={[0, 0.716, -0.02]} scale={[0.39, 0.31, 0.35]} color="#839c81" />
          <Stone
            position={[0, 0.94, -0.11]}
            scale={[0.077, 0.26, 0.35]}
            color={god === 'ares' ? '#ab705f' : '#bcb27b'}
          />
          <Stone position={[0, 0.432, 0.334]} scale={[0.037, 0.18, 0.035]} color="#99ad8f" />
        </>
      )}
      {god === 'poseidon' && (
        <group position={[0, 0.86, 0]}>
          {[-1, 0, 1].map((i) => (
            <mesh key={i} position={[i * 0.18, i === 0 ? 0.065 : 0, 0.15]}>
              <coneGeometry args={[0.058, 0.27, 4]} />
              <meshStandardMaterial color="#7da7a0" metalness={0.3} roughness={0.55} />
            </mesh>
          ))}
        </group>
      )}
      {god === 'zeus' && (
        <Stone position={[0, 0.78, 0.194]} scale={[0.27, 0.044, 0.088]} color="#a9bc82" />
      )}
    </group>
  );
}
function Lighting() {
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 5, 4]} intensity={3.2} color="#f6f6d8" castShadow />
      <directionalLight position={[-4, 1, -3]} intensity={2.8} color="#62cbab" />
      <directionalLight position={[0, 0, 4]} intensity={0.45} />
    </>
  );
}
function WebGL({
  children,
  fallback,
  className = '',
  onUnavailable,
}: {
  children: ReactNode;
  fallback: ReactNode;
  className?: string;
  onUnavailable?: () => void;
}) {
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2');
      setSupported(Boolean(gl));
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      setSupported(false);
    }
  }, []);
  useEffect(() => {
    if (supported === false) onUnavailable?.();
  }, [supported, onUnavailable]);
  if (supported !== true)
    return (
      <div className={`scene-fallback ${className}`}>
        {supported === null ? <span className="loading-orbit" /> : fallback}
      </div>
    );
  return <div className={`three-scene ${className}`}>{children}</div>;
}
export function AnatomyScene({
  selected,
  onSelect,
  back,
  reset,
}: {
  selected: MuscleId | null;
  onSelect: (id: MuscleId) => void;
  back: boolean;
  reset: number;
}) {
  return (
    <WebGL
      fallback={
        <>
          <span className="sculpture-glyph">◎</span>
          <p>
            3D is unavailable on this device.
            <br />
            Choose a muscle from the list.
          </p>
        </>
      }
    >
      <Canvas
        frameloop="demand"
        dpr={[1, 1.6]}
        camera={{ position: [0, 0.3, 5.3], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        aria-label="Interactive 3D muscle illustration. Use the muscle list for keyboard navigation."
      >
        <Suspense fallback={null}>
          <Lighting />
          <AnatomicalFigure selected={selected} onSelect={onSelect} />
          <CameraRig selected={selected} back={back} reset={reset} />
        </Suspense>
      </Canvas>
    </WebGL>
  );
}
function SceneReady({ onReady }: { onReady?: () => void }) {
  const notified = useRef(false);
  useFrame(() => {
    if (notified.current) return;
    notified.current = true;
    onReady?.();
  });
  return null;
}
export function AvatarScene({
  god = 'zeus',
  interactive = false,
  ceremony = false,
  onReady,
}: {
  god?: GodId;
  interactive?: boolean;
  ceremony?: boolean;
  onReady?: () => void;
}) {
  return (
    <WebGL
      onUnavailable={onReady}
      fallback={<div className="bust-fallback">{god.substring(0, 1).toUpperCase()}</div>}
    >
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.15, 3.7], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        aria-label={`${god} stylized Greek bust`}
      >
        <Suspense fallback={null}>
          <Lighting />
          <GreekBust god={god} faceForward={ceremony} />
          <SceneReady onReady={onReady} />
          {ceremony && <pointLight position={[0, 0.3, 2]} color="#d0f5b6" intensity={2} />}
          {interactive && !ceremony && (
            <OrbitControls
              enablePan={false}
              enableZoom={false}
              minPolarAngle={0.8}
              maxPolarAngle={1.9}
            />
          )}
        </Suspense>
      </Canvas>
    </WebGL>
  );
}
