import { usePrefs } from '../../app/prefs';
import './soundbars.css';

/** Three platinum bars beside the mute button: moving while sound is on, flat when muted. */
export default function SoundBars() {
  const { sound } = usePrefs();
  return (
    <span className={`sbars ${sound ? 'is-on' : ''}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}
