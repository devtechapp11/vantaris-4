
import { useMemo } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { ChromaticAberration, EffectComposer } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { easing } from 'maath'
import { stageState } from './stage'

type Key = { pos: [number, number, number]; look: [number, number, number]; fov: number }

/** Un keyframe par acte (0 → 7). Valeurs de départ : à régler à l'œil sur /dev/stage. */
export const ACT_KEYS: Key[] = [
  { pos: [0, 0.4, 6.5], look: [0, 0.2, 0], fov: 32 },   // 0 Éveil : plan serré, Vale dans le noir
  { pos: [0, 0.4, 8.6], look: [0, -0.7, 0], fov: 30 },  // 1 Hook : Vale debout, bassin visible (au-dessus du titre)
  { pos: [3.4, 2.6, 7.5], look: [0, 0, 0], fov: 38 },   // 2 Survol : vue plongeante (« fly-over »)
  { pos: [-1.2, 0.7, 6.2], look: [1.5, 0.2, 0], fov: 30 }, // 3 Live deal : Vale à gauche, carte à droite
  { pos: [0, 0.6, 6.4], look: [0, 0.1, 0], fov: 32 },   // 4 Dress code : Vale centré, plein pied
  { pos: [2.2, 0.6, 6.0], look: [-1.6, 0.3, 0], fov: 30 }, // 5 App : Vale à droite du téléphone
  { pos: [0, 0.3, 4.0], look: [0, 0.3, 0], fov: 28 },   // 6 Membership : Vale derrière la carte Pro
  { pos: [0, 0.4, 6.5], look: [0, 0.2, 0], fov: 32 },   // 7 Final : retour au plan d'ouverture (boucle igloo)
]

const smooth = (t: number) => t * t * (3 - 2 * t)

/** Acts where the camera holds still for the first part (the dress code is four screens tall). */
const HOLD: Record<number, number> = { 4: 0.8 }

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const look = useMemo(() => new THREE.Vector3(), [])
  const pos = useMemo(() => new THREE.Vector3(), [])
  const tgt = useMemo(() => new THREE.Vector3(), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, dt) => {
    const p = THREE.MathUtils.clamp(stageState.progress, 0, ACT_KEYS.length - 1)
    const i = Math.min(Math.floor(p), ACT_KEYS.length - 2)
    const a = ACT_KEYS[i]!
    const b = ACT_KEYS[i + 1]!
    const hold = HOLD[i] ?? 0
    const t = smooth(THREE.MathUtils.clamp((p - i - hold) / (1 - hold), 0, 1))
    pos.set(...a.pos).lerp(tgt.set(...b.pos), t)
    tgt.set(...a.look).lerp(tmp.set(...b.look), t)
    // Portrait screens: step back along the same line so Vale keeps his share of the width.
    const aspect = size.width / Math.max(1, size.height)
    if (aspect < 1) pos.sub(tgt).multiplyScalar(Math.min(1.9, 0.8 / aspect)).add(tgt)
    easing.damp3(camera.position, pos, 0.35, dt)
    easing.damp3(look, tgt, 0.35, dt)
    camera.lookAt(look)
    const fov = THREE.MathUtils.lerp(a.fov, b.fov, t)
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = THREE.MathUtils.damp(camera.fov, fov, 4, dt)
      camera.updateProjectionMatrix()
    }
  })
  return null
}

/** Aberration chromatique proportionnelle à la vitesse de scroll : 0 à l'arrêt, max 0.0016 en plein vol. */
export function VelocityAberration() {
  const offset = useMemo(() => new THREE.Vector2(0, 0), [])
  useFrame((_, dt) => {
    const v = Math.min(Math.abs(stageState.velocity) / 40, 1)
    offset.x = THREE.MathUtils.damp(offset.x, 0.0016 * v, 8, dt)
    offset.y = offset.x * 0.5
  })
  return (
    <EffectComposer multisampling={0}>
      <ChromaticAberration
        offset={offset}
        radialModulation
        modulationOffset={0.35}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}
