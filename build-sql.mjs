// Builds supabase/schema.sql = schema.core.sql + practice content seed.
// Content source: scripts/content.json (the 20 problems from the prototype).
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const content = JSON.parse(readFileSync(new URL('scripts/content.json', root), 'utf8'));
const core = readFileSync(new URL('supabase/sql/schema.core.sql', root), 'utf8');

const SHORT = {
  statements: 'Statements', dcf: 'DCF', comps: 'Comps', precedents: 'Precedents',
  lbo: 'LBO', ma: 'M&A', restructuring: 'Restructuring', structuring: 'Structuring',
};

const TAG = '$v$';
function q(value) {
  const s = String(value);
  if (s.includes(TAG)) throw new Error(`Content contains ${TAG}: ${s.slice(0, 60)}`);
  return `${TAG}${s}${TAG}`;
}
const j = (value) => `${q(JSON.stringify(value))}::jsonb`;

const moduleRows = content.modules.map((m, i) =>
  `  (${q(m.id)}, ${q(m.name)}, ${q(SHORT[m.id] ?? m.name)}, ${q(m.tier)}, ${q(m.blurb)}, ${i + 1})`);

const perModule = {};
const problemRows = content.problems.map((p) => {
  if (!p.options.some((o) => o.id === p.answer)) throw new Error(`Bad answer for ${p.id}`);
  if (!content.modules.some((m) => m.id === p.module)) throw new Error(`Bad module for ${p.id}`);
  perModule[p.module] = (perModule[p.module] ?? 0) + 1;
  return `  (${q(p.id)}, ${q(p.module)}, ${p.difficulty}, ${p.minutes}, ${q(p.title)}, ${q(p.kind)},\n` +
    `   ${q(p.scenario)},\n   ${j(p.data)},\n   ${q(p.question)},\n   ${j(p.options)}, ${q(p.answer)},\n` +
    `   ${j(p.steps)},\n   ${q(p.concept)},\n   ${q(p.formula)},\n   ${j(p.hints)}, ${perModule[p.module]})`;
});

const seed = `insert into public.modules (id, name, short, level, blurb, sort)
values
${moduleRows.join(',\n')}
on conflict (id) do update set
  name = excluded.name, short = excluded.short, level = excluded.level,
  blurb = excluded.blurb, sort = excluded.sort;

insert into public.problems
  (id, module_id, difficulty, minutes, title, kind, scenario, data, question, options, answer, steps, concept, formula, hints, sort)
values
${problemRows.join(',\n')}
on conflict (id) do update set
  module_id = excluded.module_id, difficulty = excluded.difficulty, minutes = excluded.minutes,
  title = excluded.title, kind = excluded.kind, scenario = excluded.scenario, data = excluded.data,
  question = excluded.question, options = excluded.options, answer = excluded.answer,
  steps = excluded.steps, concept = excluded.concept, formula = excluded.formula,
  hints = excluded.hints, sort = excluded.sort;`;

if (!core.includes('-- @@SEED@@')) throw new Error('Seed marker missing');
const out = core.replace('-- @@SEED@@', seed);
writeFileSync(new URL('supabase/schema.sql', root), out);

// Public, answer-free catalog for the demo build and for docs.
console.log(`schema.sql written: ${out.length} chars, ${content.modules.length} modules, ${content.problems.length} problems`);
