import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../app/AppContext';
import LessonShell from '../exercise/engine/LessonShell';
import { CHAPTERS } from '../content/path';

const SKILLS = new Set(['statements', 'dcf', 'comps', 'precedents', 'lbo', 'ma', 'restructuring', 'structuring']);

/** /lesson/:node: a V4 lesson of five (MCQ, formula, slider…), graded answer by answer. */
export default function Lesson() {
  const { node = 'statements' } = useParams();
  const navigate = useNavigate();
  const { refreshMe } = useApp() as { refreshMe: () => Promise<unknown> };
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
        refreshMe().catch(() => {});
        navigate('/');
      }}
    />
  );
}
