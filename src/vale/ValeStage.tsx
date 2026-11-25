import { BackSide } from 'three';
import { Environment, Lightformer, MeshReflectorMaterial } from '@react-three/drei';

export const POOL_Y = -1.55;

/**
 * The chrome studio: a void, four surgical softboxes (Lightformers, rendered
 * once into the environment map, no HDR download) and a dark reflecting pool.
 */
export default function ValeStage({ lowPower }: { lowPower: boolean }) {
  return (
    <>
      <color attach="background" args={['#05070B']} />
      {/* The pool fades into the void: no horizon line. */}
      <fog attach="fog" args={['#05070B', 7.5, 16]} />
      {/* Surgical studio light, rendered once into the environment: a steel dome
          for fill, a ceiling of strips, side panels, two tall softboxes behind
          the camera and a pale floor bounce. No horizontal band crosses the face
          (Vale has no mouth). */}
      <Environment resolution={256} frames={1}>
        <mesh scale={30}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial color="#2A3039" side={BackSide} toneMapped={false} />
        </mesh>
        <Lightformer form="rect" intensity={4} position={[0, 5, -3]} scale={[10, 0.5, 1]} color="#FFFFFF" />
        <Lightformer form="rect" intensity={2.6} position={[0, 5, 0]} scale={[12, 0.8, 1]} color="#FFFFFF" />
        <Lightformer form="rect" intensity={2.6} position={[0, 5, 3]} scale={[12, 0.8, 1]} color="#FFFFFF" />
        <Lightformer form="rect" intensity={2} position={[-5, 1, 1]} scale={[0.4, 6, 1]} color="#FFFFFF" />
        <Lightformer form="rect" intensity={1.6} position={[5, 0.5, 2]} scale={[0.4, 5, 1]} color="#FFFFFF" />
        <Lightformer form="rect" intensity={1.2} position={[-7, 0.5, -2]} scale={[3, 9, 1]} color="#E6E9EE" />
        <Lightformer form="rect" intensity={1.2} position={[7, 0.5, -2]} scale={[3, 9, 1]} color="#E6E9EE" />
        <Lightformer form="rect" intensity={1.5} position={[-4.5, 1, 8]} scale={[2.2, 10, 1]} color="#F8FAFC" />
        <Lightformer form="rect" intensity={1.5} position={[4.5, 1, 8]} scale={[2.2, 10, 1]} color="#F8FAFC" />
        <Lightformer form="rect" intensity={1} position={[0, -6, 0]} scale={[14, 14, 1]} color="#9AA3AE" />
        <Lightformer form="rect" intensity={0.45} position={[0, -2, 11]} scale={[60, 22, 1]} color="#C9CED6" />
        <Lightformer form="ring" intensity={0.6} position={[4, -1, -5]} scale={2} color="#FFFFFF" />
      </Environment>
      <mesh rotation-x={-Math.PI / 2} position={[0, POOL_Y, 0]}>
        <planeGeometry args={[40, 40]} />
        <MeshReflectorMaterial
          resolution={lowPower ? 256 : 1024}
          mixBlur={1}
          mixStrength={lowPower ? 18 : 38}
          blur={[300, 80]}
          roughness={0.85}
          depthScale={1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.2}
          color="#0A0D13"
          metalness={0.6}
          mirror={0}
        />
      </mesh>
    </>
  );
}
