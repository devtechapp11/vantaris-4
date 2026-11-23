export type RelicKind = 'blades' | 'fluted' | 'prisms' | 'archive' | 'lever' | 'interlock' | 'fracture' | 'gyro';

/** One sculpture per chapter, all from the same family as the Ledger Monolith. */
export const RELIC_OF: Record<string, RelicKind> = {
  statements: 'blades',
  dcf: 'fluted',
  comps: 'prisms',
  precedents: 'archive',
  lbo: 'lever',
  ma: 'interlock',
  restructuring: 'fracture',
  structuring: 'gyro',
};

export const posterUrl = (kind: RelicKind) => `${import.meta.env.BASE_URL}relics/${kind}.avif`;
