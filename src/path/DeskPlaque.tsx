import { Lock } from 'lucide-react';
import MetalPlate from '../components/fx/MetalPlate';

type Props = { desk: string; reached: boolean; elite?: boolean; tierLabel?: string | null; caption?: string };

/** « ANALYST DESK » engraved on a plate: dark steel until reached, brushed platinum once it is yours. */
export default function DeskPlaque({ desk, reached, elite = false, tierLabel = null, caption }: Props) {
  const tone = elite && !reached ? 'glass' : reached ? 'platinum' : 'steel';
  return (
    <div className={`plaque ${reached ? 'is-reached' : ''} ${elite ? 'plaque--elite' : ''}`}>
      <span className="plaque-rule" aria-hidden="true" />
      <MetalPlate tone={tone} size="md" className="plaque-plate">
        {!reached && (elite || tierLabel) && <Lock size={11} strokeWidth={2} aria-hidden="true" />}
        {`${desk} desk`.toUpperCase()}
      </MetalPlate>
      {tierLabel && !reached && <span className="plaque-tier">{tierLabel}</span>}
      <span className="plaque-rule" aria-hidden="true" />
      {caption && <span className="plaque-cap">{caption}</span>}
    </div>
  );
}
