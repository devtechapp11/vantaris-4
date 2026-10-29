import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined); // undefined = still loading
  const [me, setMe] = useState(null);
  const [meError, setMeError] = useState(null);
  const [toast, setToast] = useState(null);
  const [paywall, setPaywall] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((text, kind = 'info') => {
    clearTimeout(toastTimer.current);
    setToast({ text, kind, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 3600);
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const data = await api.getMe();
      setMe(data);
      setMeError(null);
      return data;
    } catch (err) {
      setMeError(err);
      if (err.code === 'NOT_AUTHENTICATED' || err.code === 'UNAUTHENTICATED') {
        await api.signOut();
      }
      throw err;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    api.getSession().then((s) => alive && setSession(s ?? null));
    const off = api.onAuthChange((event, s) => {
      setSession(s ?? null);
      if (event === 'SIGNED_OUT') setMe(null);
      if (event === 'PASSWORD_RECOVERY') navigate('/reset-password', { replace: true });
    });
    return () => {
      alive = false;
      off();
    };
  }, [navigate]);

  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) return;
    refreshMe().catch(() => {});
  }, [userId, refreshMe]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      me,
      setMe,
      meError,
      refreshMe,
      toast,
      showToast,
      paywall,
      openPaywall: (reason, extra = {}) => setPaywall({ reason, ...extra }),
      closePaywall: () => setPaywall(null),
    }),
    [session, me, meError, refreshMe, toast, showToast, paywall],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
