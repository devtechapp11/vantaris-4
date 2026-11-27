/**
 * The landing's first screen as plain markup, identical to the pre-rendered
 * copy in index.html: black, no text (act 0 is Vale waking in the dark). React
 * shows it while the session and the landing chunk load.
 */
export default function HeroShell() {
  return <div className="prerender" aria-hidden="true" />;
}
