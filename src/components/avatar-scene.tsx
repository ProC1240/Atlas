'use client';

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls, useGLTF } from '@react-three/drei';
import { MathUtils, type Group, type Mesh } from 'three';
import { avatars, type GodId } from '@/domain/avatars';
import assets from '@/domain/avatar-assets.json';
import { WebGL } from './webgl';

type Props = {
  god?: GodId;
  interactive?: boolean;
  ceremony?: boolean;
  onReady?: () => void;
};

function Sculpture({
  god,
  ceremony,
  onReady,
}: {
  god: GodId;
  ceremony: boolean;
  onReady: () => void;
}) {
  const { scene } = useGLTF(assets[god].model, false, false);
  const model = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((node) => {
      if ((node as Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return copy;
  }, [scene]);
  const group = useRef<Group>(null);
  const notified = useRef(false);
  const reduced = useRef(false);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      reduced.current = query.matches;
      invalidate();
    };
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [invalidate]);
  useFrame((_, delta) => {
    if (!notified.current) {
      notified.current = true;
      onReady();
    }
    if (!ceremony || !group.current) return;
    const rotation = group.current.rotation;
    if (Math.abs(rotation.y) < 0.001) return;
    rotation.y = reduced.current ? 0 : MathUtils.damp(rotation.y, 0, 5, Math.min(delta, 0.1));
    invalidate();
  });
  return (
    <group ref={group} rotation={[0, ceremony ? -0.85 : -0.3, 0]} position={[0, -1.85, 0]}>
      <primitive object={model} dispose={null} />
    </group>
  );
}

function CameraFit() {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1);
    camera.position.set(0, 0.2, Math.max(6.35, 3.5 / aspect));
    camera.lookAt(0, -0.02, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  return null;
}

class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Poster({ god, onReady }: { god: GodId; onReady?: () => void }) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);
  return (
    <img
      className="avatar-poster"
      src={`/avatars/${god}-concept.webp`}
      alt={`${god} character concept`}
    />
  );
}

export function AvatarScene({
  god = 'zeus',
  interactive = false,
  ceremony = false,
  onReady,
}: Props) {
  const [readyGod, setReadyGod] = useState<GodId | null>(null);
  const current = avatars.find((avatar) => avatar.id === god)!;
  const ready = readyGod === god;
  const fallback = <Poster god={god} onReady={onReady} />;
  return (
    <div className="avatar-render" data-avatar={god} data-ready={ready}>
      <SceneBoundary key={god} fallback={fallback}>
        <WebGL fallback={fallback}>
          {!ready && (
            <div className="avatar-loading" role="status" aria-label={`Loading ${current.name}`}>
              <span className="loading-orbit" />
            </div>
          )}
          <Canvas
            shadows
            frameloop="demand"
            dpr={[1, 1.5]}
            camera={{ position: [0, 0.2, 6.35], fov: 38, near: 0.1, far: 30 }}
            gl={{ antialias: true, alpha: true }}
            aria-label={`${current.name} interactive 3D sculpture`}
          >
            <ambientLight intensity={0.3} />
            <hemisphereLight args={['#e9edff', '#42372e', 0.6]} />
            <directionalLight
              position={[-3, 5, 5]}
              intensity={3.2}
              color="#fff0dc"
              castShadow
              shadow-mapSize={[1024, 1024]}
              shadow-camera-left={-2.5}
              shadow-camera-right={2.5}
              shadow-camera-top={2.5}
              shadow-camera-bottom={-2.5}
              shadow-normalBias={0.025}
            />
            <directionalLight position={[4, 2, -2]} intensity={3} color={current.accent} />
            <directionalLight position={[2, 0, 4]} intensity={0.6} color="#d1e5ff" />
            <Environment resolution={64} frames={1}>
              <Lightformer position={[-3, 3, 4]} scale={[4, 4, 1]} intensity={2} />
              <Lightformer
                position={[4, 1, -3]}
                rotation={[0, Math.PI, 0]}
                scale={[2, 5, 1]}
                intensity={2}
              />
            </Environment>
            <Suspense fallback={null}>
              <Sculpture
                key={god}
                god={god}
                ceremony={ceremony}
                onReady={() => {
                  setReadyGod(god);
                  onReady?.();
                }}
              />
            </Suspense>
            <CameraFit />
            {ceremony && <pointLight position={[0, 0.3, 2]} color="#f5dfa1" intensity={2} />}
            {interactive && !ceremony && (
              <OrbitControls
                enablePan={false}
                enableZoom={false}
                minPolarAngle={1.1}
                maxPolarAngle={1.8}
              />
            )}
          </Canvas>
        </WebGL>
      </SceneBoundary>
    </div>
  );
}
