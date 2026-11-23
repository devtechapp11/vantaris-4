import { makeExercise, type Brief, type Exercise } from './templates.ts';
import { parseBrief } from '../../pedagogy/dealBrief.ts';

/** A deal-case exercise shaped like a lesson multiple-choice question. */
export function toQuestion(ex: Exercise, narrative?: string | null, served?: Brief | null) {
  const brief = (served && parseBrief(served)) || ex.brief;
  return {
    type: 'choice' as const,
    stage: 'Deal case',
    prompt: `${narrative || ex.prompt} ${ex.question}`,
    data: ex.data,
    options: ex.options,
    answer: ex.answerIndex,
    hint: ex.brief.formula ? `Reach for ${ex.brief.formula}.` : ex.brief.rule,
    explain: `${ex.brief.rule} The classic trap: ${ex.brief.trap.charAt(0).toLowerCase()}${ex.brief.trap.slice(1)}`,
    brief: { id: `tpl-${ex.template}`, ...brief },
  };
}

export const finQuestion = (template: string, seed: number, difficulty: number, narrative?: string | null, brief?: Brief | null) =>
  toQuestion(makeExercise(template, seed, difficulty), narrative, brief);
