export const springs = {
  snappy: { type: 'spring', stiffness: 520, damping: 32 }, // buttons, toggles
  soft: { type: 'spring', stiffness: 220, damping: 26 }, // cards, panels
  heavy: { type: 'spring', stiffness: 140, damping: 16, mass: 1.3 }, // stars, combo badges, plates
} as const;

export type SpringName = keyof typeof springs;
