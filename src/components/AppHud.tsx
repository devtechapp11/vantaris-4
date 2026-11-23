import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../landing/hud/hud.css';

const FLOOR: Record<string, string> = { '/': 'PATH', '/blitz': 'BLITZ', '/practice': 'TRAINING', '/ranking': 'RANK', '/profile': 'VAULT', '/plans': 'PLANS' };

/**
 * The landing's instrument finish, carried into the app: « + » marks in the
 * corners and a line of mono telemetry in each side margin (floor, desk, sync).
 */
export default function AppHud({ desk }: { desk: string }) {
  const { pathname } = useLocation();
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    addEventListener('online', on);
    addEventListener('offline', off);
    return () => {
      removeEventListener('online', on);
      removeEventListener('offline', off);
    };
  }, []);
  const floor = FLOOR[pathname] ?? (pathname.startsWith('/practice') ? 'TRAINING' : 'DESK');
  return (
    <div className="hud hud--app" aria-hidden="true">
      <i className="hud-mark hud-mark--tl" />
      <i className="hud-mark hud-mark--tr" />
      <i className="hud-mark hud-mark--bl" />
      <i className="hud-mark hud-mark--br" />
      <span className="hud-tele hud-tele--l">VANTARIS // FLOOR_01 · {floor}</span>
      <span className="hud-tele hud-tele--r">
        DESK {desk.toUpperCase()} · SYNC <b className={online ? 'is-on' : ''}>{online ? '■' : '□'}</b>
      </span>
    </div>
  );
}
