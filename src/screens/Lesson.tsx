import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../app/AppContext';
import LessonShell from '../exercise/engine/LessonShell';
import { CHAPTERS } from '../content/path';
import { START_KEYS, get, put } from '../onboarding/keys';

const WEEK = 7 * 864e5;

/** After a finished lesson, on the free tier: the closable plans card on the Path, at most once a week. */
function armPlansCard(free: boolean) {
  if (!free) return;
  const last = Number(get(START_KEYS.plansNudge) ?? 0);
  if (Date.now() - last < WEEK) return;
  put(START_KEYS.plansNudge, String(Date.now()));
  put(START_KEYS.plansCard, '1');
}

const SKILLS = new Set(['statements', 'dcf', 'comps', 'precedents', 'lbo', 'ma', 'restructuring', 'structuring']);

/** /lesson/:node: a V4 lesson of five (MCQ, formula, slider…), graded answer by answer. */
export default function Lesson() {
  const { node = 'statements' } = useParams();
  const navigate = useNavigate();
  const { refreshMe, me } = useApp() as { refreshMe: () => Promise<unknown>; me: { tier?: { id: string } } | null };
  const skill = SKILLS.has(node) ? node : 'statements';
  const chapter = (CHAPTERS as { id: string; title?: string; name?: string }[]).find((c) => c.id === skill);
  const title = chapter?.title ?? chapter?.name ?? skill.toUpperCase();
  return (
    <LessonShell
      key={skill}
      skill={skill}
      title={title}
      onExit={() => navigate('/')}
      onDone={() => {
        armPlansCard((me?.tier?.id ?? 'free') === 'free');
        refreshMe().catch(() => {});
        navigate('/');
      }}
    />
  );
}
