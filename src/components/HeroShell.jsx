import { PITCH } from '../content/landing';

/**
 * The landing's first screen as plain markup, identical to the pre-rendered
 * copy in index.html: black, with the hook cue. React shows it while the
 * session and the landing chunk load, so the hand-off is seamless.
 */
export default function HeroShell() {
  return (
    <div className="prerender" aria-hidden="true">
      <p className="kicker prerender-cue">{PITCH.hook}</p>
    </div>
  );
}
