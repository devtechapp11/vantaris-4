import { useEffect, useRef } from 'react';
import { useApp } from '../app/AppContext';
import { api } from '../lib/api';
import { clearDemoScore, readDemoScore, takeDemoTickets } from '../landing/demo/demoScore';

type Credit = { credited: number; reason?: string; me?: unknown } | null;

/** Once signed in, hands the landing demo's XP to the server (which caps it and credits it once). */
export default function DemoCredit() {
  const { me, setMe, showToast } = useApp() as { me: { profile?: unknown } | null; setMe: (m: unknown) => void; showToast: (t: string, k?: string) => void };
  const done = useRef(false);
  const signedIn = Boolean(me?.profile);
  useEffect(() => {
    if (!signedIn || done.current) return;
    const score = readDemoScore();
    if (!score || score.xp <= 0) return;
    done.current = true;
    const credit = (api as { creditDemo?: (xp: number) => Promise<Credit> }).creditDemo;
    credit?.(score.xp).then((res) => {
      if (!res) return; // server not ready: keep it on this device for later
      clearDemoScore();
      if (res.me) setMe(res.me);
      const tickets = takeDemoTickets();
      const onDesk = tickets > 0 ? ` · ${tickets} ticket${tickets > 1 ? 's' : ''} on your desk` : '';
      if (res.credited > 0) showToast(`+${res.credited} XP from your demo deals${onDesk}`, 'success');
      else if (onDesk) showToast(onDesk.slice(3).replace(/^./, (c) => c.toUpperCase()), 'success');
    }).catch(() => { done.current = false; });
  }, [signedIn, setMe, showToast]);
  return null;
}
