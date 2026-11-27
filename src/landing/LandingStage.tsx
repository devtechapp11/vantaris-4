import { useState } from 'react';
import ValeCanvas from '../vale/ValeCanvas';
import ValePoster from '../vale/ValePoster';
import { CameraRig, ACT_KEYS, VelocityAberration } from './CameraRig';
import Director from './Director';

/**
 * The landing's one canvas, fixed behind the eight acts: the pool, Vale, the
 * camera rig on the scroll and, on capable screens only, the velocity
 * aberration (phones: dpr 1.25, a 256 px reflector, no post-processing).
 */
export default function LandingStage({ lowPower, reduced }: { lowPower: boolean; reduced: boolean }) {
  const [ready, setReady] = useState(false);
  const k = ACT_KEYS[0];
  return (
    <div className={`lstage ${ready ? 'is-ready' : ''}`} aria-hidden="true">
      <ValePoster gone={ready} />
      <ValeCanvas lowPower={lowPower} reduced={reduced} fit={false} camera={{ position: k.pos, fov: k.fov }} onReady={() => setReady(true)}>
        <CameraRig />
        <Director reduced={reduced} />
        {!lowPower && !reduced && <VelocityAberration />}
      </ValeCanvas>
    </div>
  );
}
