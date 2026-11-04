import { CHAPTERS } from '../content/landing';

/**
 * The landing hero as plain markup, identical to the pre-rendered copy in
 * index.html. React shows it while the session and the landing chunk load,
 * so the hand-off from static HTML to the app is seamless.
 */
export default function HeroShell() {
  const hero = CHAPTERS[0];
  return (
    <div className="prerender" aria-hidden="true">
      <div className="prerender-copy">
        <p className="t-eyebrow">{hero.eyebrow}</p>
        <p className="t-display text-chrome prerender-title">{hero.title}</p>
        <p className="t-lead">{hero.body}</p>
        <div className="prerender-cta"><span className="btn btn--primary btn--lg btn--auto">Start free</span></div>
      </div>
    </div>
  );
}
