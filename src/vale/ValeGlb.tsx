import { useGLTF } from '@react-three/drei';
import type { BufferGeometry, Mesh } from 'three';
import ValeModel from './ValeModel';

/**
 * Optional sculpted Vale: set VITE_VALE_GLB=/vale.glb at build time and drop
 * the file in public/. Expected meshes: Body (required), Visor, EyeL, EyeR.
 * The body keeps the procedural chrome material, reactions and gaze; the
 * visor and eyes are painted by that material, so Visor/EyeL/EyeR are only
 * used when the file provides them with their own materials.
 */
export const VALE_GLB: string | undefined = import.meta.env.VITE_VALE_GLB;

type Props = { url: string; reduced: boolean; lowPower: boolean; onReady?: () => void };

export default function ValeGlb({ url, reduced, lowPower, onReady }: Props) {
  const { nodes } = useGLTF(url) as unknown as { nodes: Record<string, Mesh> };
  const body = nodes.Body?.geometry as BufferGeometry | undefined;
  const extras = ['Visor', 'EyeL', 'EyeR'].map((n) => nodes[n]).filter(Boolean);
  return (
    <ValeModel reduced={reduced} lowPower={lowPower} onReady={onReady} bodyGeometry={body}>
      {extras.map((m) => <primitive key={m.name} object={m} />)}
    </ValeModel>
  );
}
