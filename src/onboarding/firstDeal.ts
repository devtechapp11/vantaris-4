import type { ExercisePublic } from '../lib/exercises/schema'

/**
 * Le premier deal (landing acte 3 ET /start) : contenu fixe, zéro latence IA, compréhensible par un lycéen.
 * Clé côté serveur uniquement (seed) : { kind: 'mcq', correct: 'b' }
 */
export const FIRST_DEAL: ExercisePublic = {
  kind: 'mcq',
  id: 'onb-first-deal',
  prompt: 'A company earns $10M a year. Buyers pay 8× earnings. What is it worth?',
  choices: [
    { id: 'a', label: '$18M' },
    { id: 'b', label: '$80M' },
    { id: 'c', label: '$800M' },
  ],
}

export const FIRST_DEAL_TICKET = {
  number: '0001',
  type: 'VALUATION',
  value: '$80M',
  status: 'CLOSED',
}

export const FIRST_DEAL_BRIEF = {
  title: 'Valuation multiple',
  takeaway: 'Value = earnings × multiple. Bankers price companies this way every day. You just did it.',
}
