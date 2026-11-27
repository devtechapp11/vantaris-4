import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { pitchDeckImage, type DeckFacts } from './pitchDeck';
import { sfx } from '../lib/sfx/engine';
import './rituals.css';

/** « Share » → the pitch-deck cover as a PNG: the share sheet where there is one, a download otherwise. */
export default function PitchDeckShare({ facts }: { facts: DeckFacts }) {
  const [withName, setWithName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const share = async () => {
    setBusy(true);
    setNote(null);
    sfx.press();
    const blob = await pitchDeckImage({ ...facts, name: withName ? facts.name?.split(' ')[0] : null });
    setBusy(false);
    if (!blob) return setNote('Your browser could not draw the card.');
    const file = new File([blob], 'project-vale.png', { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    try {
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: 'Project Vale' });
        return undefined;
      }
    } catch {
      return undefined; // the share sheet was dismissed
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setNote('Image saved.');
    return undefined;
  };
  return (
    <div className="deck-share">
      <label className="deck-name">
        <input type="checkbox" checked={withName} onChange={(e) => setWithName(e.target.checked)} /> Add my first name
      </label>
      <button type="button" className="btn btn--secondary btn--md" onClick={share} disabled={busy}>
        <Share2 size={16} aria-hidden="true" /> {busy ? 'Drawing…' : 'Share my pitch deck'}
      </button>
      {note && <p className="deck-note" role="status">{note}</p>}
    </div>
  );
}
