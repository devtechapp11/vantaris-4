import { useMemo } from 'react';
import Seal, { MONOGRAM } from './Seal';
import { accuracy, tickets } from './vault';
import './rituals.css';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

/**
 * La Vault: three shelves, real data only — Deal Tickets (each closed lesson),
 * Deal Toys (a glass block per mastered chapter, engraved with its accuracy
 * when the tickets know it) and the Seals (chapters at 3★, from the server).
 */
export default function VaultShelves({ stars }: { stars?: Record<string, number> }) {
  const list = useMemo(() => tickets(), []);
  const mastered = Object.entries(stars ?? {}).filter(([, n]) => n >= 3).map(([k]) => k);
  return (
    <div className="vs">
      <section className="vs-shelf" aria-labelledby="vs-tickets">
        <h3 id="vs-tickets" className="vs-title kicker">Deal tickets <span className="fig-mono">{list.length}</span></h3>
        {list.length ? (
          <ol className="vs-row vs-tickets">
            {list.slice(0, 12).map((t) => (
              <li key={t.at} className="vs-ticket">
                <span className="vs-t-date fig-mono">{fmt(t.at)}</span>
                <span className="vs-t-deal">{t.title}</span>
                <span className="vs-t-xp fig-mono">+{t.xp} XP</span>
              </li>
            ))}
          </ol>
        ) : <p className="vs-empty">Close a lesson: its ticket lands here.</p>}
      </section>
      <section className="vs-shelf" aria-labelledby="vs-toys">
        <h3 id="vs-toys" className="vs-title kicker">Deal toys <span className="fig-mono">{mastered.length}</span></h3>
        {mastered.length ? (
          <ul className="vs-row">
            {mastered.map((k) => {
              const pct = accuracy(k, list);
              return (
                <li key={k} className="vs-toy" aria-label={`${MONOGRAM[k] ?? k} deal toy${pct != null ? `, ${pct}% accuracy` : ''}`}>
                  <span className="vs-toy-face">{MONOGRAM[k] ?? k}{pct != null && <> · {pct}%</>}</span>
                </li>
              );
            })}
          </ul>
        ) : <p className="vs-empty">Master a chapter (3★) to earn its deal toy.</p>}
      </section>
      <section className="vs-shelf" aria-labelledby="vs-seals">
        <h3 id="vs-seals" className="vs-title kicker">Seals <span className="fig-mono">{mastered.length}</span></h3>
        {mastered.length ? (
          <ul className="vs-row">{mastered.map((k) => <li key={k}><Seal skill={k} size={72} /></li>)}</ul>
        ) : <p className="vs-empty">Each chapter closed at 3★ is sealed here.</p>}
      </section>
    </div>
  );
}
