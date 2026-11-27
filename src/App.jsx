import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { AppProvider, useApp } from './app/AppContext';
import { usePrefs } from './app/prefs';
import { Toast } from './components/chrome';
import { Sidebar, TabBar, TABS } from './components/Shell';
import { FeverFrame } from './components/Momentum';
import ObsidianField from './fx/field/ObsidianField';
import { comboOf } from './lib/momentum';
import Paywall from './components/Paywall';
import { LogoLoader } from './components/Logo';
import HeroShell from './components/HeroShell';
import { LiquidGlassFilter } from './components/glass/LiquidGlass';
import Mascot from './components/Mascot';
import { IS_DEMO } from './lib/config';
import { loaders } from './app/routes';
import { useScrollMemory, useSwipeBack } from './app/fluid';
import ErrorBoundary from './components/ErrorBoundary';
import CookieBanner from './components/CookieBanner';
import MetalBurst from './fx/MetalBurst';
import { useSfxUnlock } from './lib/sfx/useSfx';
import PromotionCeremony from './exercise/PromotionCeremony';
import BreakNudge from './rituals/BreakNudge';
import DemoCredit from './exercise/DemoCredit';
import { LEGAL_ORDER } from './content/legal';
import { track } from './lib/analytics';

// Every screen is its own chunk, so the landing page never downloads the app
// and the app never downloads the landing page's 3D scene.
const Landing = lazy(loaders.landing);
const AuthScreen = lazy(loaders.auth);
const ResetPassword = lazy(() => loaders.auth().then((m) => ({ default: m.ResetPassword })));
const Start = lazy(loaders.start);
const Path = lazy(loaders.home);
const Learn = lazy(loaders.learn);
const Lesson = lazy(loaders.lesson);
const Blitz = lazy(loaders.blitz);
const Practice = lazy(loaders.practice);
const Problem = lazy(loaders.problem);
const Ranking = lazy(loaders.ranking);
const Profile = lazy(loaders.profile);
const Plans = lazy(loaders.plans);
const Legal = lazy(loaders.legal);
const NotFound = lazy(loaders.notFound);
// Dev pages (/dev/type, /dev/vale): never linked, noindex, no session needed.
// eslint-disable-next-line no-undef
const DEV_PAGES = __DEV_PAGES__;
const DevType = DEV_PAGES ? lazy(() => import('./dev/DevType')) : null;
const DevVale = DEV_PAGES ? lazy(() => import('./dev/DevVale')) : null;

// The preview build runs inside a sandboxed frame, so it keeps its route in memory.
const Router = IS_DEMO ? MemoryRouter : BrowserRouter;
// The preview build keeps its route in memory; a direct address to a known
// screen (QA captures, /dev/*) still opens there.
const DIRECT = /^\/(dev\/|start$|app$|learn\/|lesson\/|blitz$|practice|ranking$|profile$|plans$|signin$|signup$)/;
const routerProps = IS_DEMO && typeof location !== 'undefined' && DIRECT.test(location.pathname) ? { initialEntries: [location.pathname] } : {};

export default function App() {
  const prefs = usePrefs();
  useSfxUnlock();
  return (
    <Router {...routerProps}>
      <MotionConfig reducedMotion={prefs.reduceMotion ? 'always' : 'user'}>
        <AppProvider>
          <LiquidGlassFilter />
          <ObsidianField key={prefs.reduceMotion ? 'still' : 'live'} still={prefs.reduceMotion} />
          {IS_DEMO && <div className="preview-band" role="note">Preview: nothing you enter leaves this page</div>}
          <Gate />
          <Paywall />
          <Toast />
          <MetalBurst />
          <PromotionCeremony />
          <BreakNudge />
          <DemoCredit />
        </AppProvider>
      </MotionConfig>
    </Router>
  );
}

// Screens that show the tab bar on phones (the tabs plus the two desk screens).
const TAB_PATHS = new Set([...TABS.map((t) => t.to), '/app', '/practice']);
// Focus screens: no sidebar, no tabs, nothing between the player and the question.
/** An onboarding run is under way in this tab (the machine persists in sessionStorage). */
const inFlight = () => {
  try {
    return Boolean(sessionStorage.getItem('vt.onboarding.v1'));
  } catch {
    return false;
  }
};
const isFocus = (path) => path === '/start' || path.startsWith('/learn/') || path.startsWith('/lesson/');
// Sign in, sign up and forgot password are one screen: switching between them
// is a shared-layout animation, not a page transition.
const AUTH_PATHS = new Set(['/signin', '/signup', '/forgot']);
const routeKey = (path) => (AUTH_PATHS.has(path) ? 'auth' : path === '/welcome' ? '/' : path);
// App screens that need an account: signed-out visitors go to sign in, not to a 404.
const APP_PATHS = ['/app', '/learn/:node', '/lesson/:node', '/blitz', '/practice', '/practice/:id', '/ranking', '/profile', '/plans'];
const legalRoutes = LEGAL_ORDER.map((slug) => <Route key={slug} path={`/${slug}`} element={<Legal />} />);

function Gate() {
  const { session, me, meError, refreshMe } = useApp();
  const location = useLocation();
  const signedIn = Boolean(session && me?.profile?.onboarded);
  const restoreScroll = useScrollMemory();
  useSwipeBack(signedIn && !TAB_PATHS.has(location.pathname));

  // Consent-gated page view (no-op unless analytics was accepted and configured).
  useEffect(() => {
    track('pageview');
  }, [location.pathname]);

  // Warm the main screens once the app is idle, so tab switches are instant.
  useEffect(() => {
    if (!signedIn) return undefined;
    const idle = window.requestIdleCallback ?? ((cb) => setTimeout(cb, 1200));
    const cancel = window.cancelIdleCallback ?? clearTimeout;
    const h = idle(() => ['home', 'learn', 'blitz', 'practice', 'problem', 'ranking', 'profile', 'plans'].forEach((k) => loaders[k]().catch(() => {})));
    return () => cancel(h);
  }, [signedIn]);

  // Signed-out visitors on the home page already see the pre-rendered hero
  // (index.html); keep showing it, not a splash, until the landing chunk is in.
  const prerendered = document.documentElement.hasAttribute('data-prerender') && /^\/(welcome)?$/.test(location.pathname);
  const loader = prerendered ? <HeroShell /> : <LogoLoader />;
  if (session === undefined) return loader;

  if (DEV_PAGES && location.pathname.startsWith('/dev/')) {
    return (
      <Suspense fallback={loader}>
        <Routes>
          <Route path="/dev/type" element={<DevType />} />
          <Route path="/dev/vale" element={<DevVale />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    );
  }

  let routes;
  // /start creates the guest session on the first answer: it must not unmount
  // while the session and the profile load, nor redirect mid-flow.
  const starting = location.pathname === '/start' && !(me?.profile?.onboarded && !inFlight());
  if (starting) {
    routes = (
      <>
        <Route path="/start" element={<Start />} />
        {legalRoutes}
      </>
    );
  } else if (location.pathname === '/reset-password') {
    routes = <Route path="/reset-password" element={<ResetPassword />} />;
  } else if (!session) {
    routes = (
      <>
        <Route path="/" element={<Landing />} />
        <Route path="/welcome" element={<Landing />} />
        <Route path="/signin" element={<AuthScreen />} />
        <Route path="/signup" element={<AuthScreen />} />
        <Route path="/forgot" element={<AuthScreen />} />
        <Route path="/start" element={<Start />} />
        {legalRoutes}
        {APP_PATHS.map((path) => <Route key={path} path={path} element={<Navigate to="/signin" replace />} />)}
        <Route path="*" element={<NotFound />} />
      </>
    );
  } else if (!me) {
    return meError ? <AccountError message={meError.message} retry={() => refreshMe().catch(() => {})} /> : <LogoLoader />;
  } else if (!me.profile.onboarded) {
    routes = (
      <>
        <Route path="/start" element={<Start />} />
        {legalRoutes}
        <Route path="*" element={<Navigate to="/start" replace />} />
      </>
    );
  } else {
    routes = (
      <>
        <Route path="/" element={<Path />} />
        <Route path="/app" element={<Path />} />
        <Route path="/learn/:node" element={<Learn />} />
        <Route path="/lesson/:node" element={<Lesson />} />
        <Route path="/blitz" element={<Blitz />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/practice/:id" element={<Problem />} />
        <Route path="/plans" element={<Plans />} />
        {legalRoutes}
        {['/welcome', '/signin', '/signup', '/forgot', '/onboarding', '/start'].map((path) => <Route key={path} path={path} element={<Navigate to="/" replace />} />)}
        <Route path="*" element={<NotFound />} />
      </>
    );
  }

  const onTab = signedIn && TAB_PATHS.has(location.pathname);
  const focus = isFocus(location.pathname);
  return (
    <div className={`app ${signedIn && !focus ? 'has-sidebar' : ''}`}>
      <a href="#main" className="skip" onClick={(e) => { e.preventDefault(); const m = document.getElementById('main') ?? document.querySelector('main'); m?.setAttribute('tabindex', '-1'); m?.focus(); }}>Skip to content</a>
      {signedIn && !focus && <Sidebar />}
      <div className="app-main">
        <ErrorBoundary resetKey={location.pathname}>
          <Suspense fallback={loader}>
            <AnimatePresence mode="wait" initial={false} onExitComplete={restoreScroll}>
              <Routes location={location} key={routeKey(location.pathname)}>{routes}</Routes>
            </AnimatePresence>
          </Suspense>
        </ErrorBoundary>
      </div>
      {signedIn && /^\/practice\/[^/]+$/.test(location.pathname) && <FeverFrame run={comboOf(me)} />}
      {onTab && <TabBar />}
      <CookieBanner aboveTabs={onTab} />
    </div>
  );
}

function AccountError({ message, retry }) {
  return (
    <main className="screen screen--bare" style={{ minHeight: '100dvh', justifyContent: 'center' }}>
      <div className="card stack-16 center-x center">
        <Mascot state="error" size={120} decorative />
        <h1 className="t-h3">We couldn’t load your account</h1>
        <p className="t-callout">{message}</p>
        <button type="button" className="btn btn--primary btn--md" onClick={retry}>Try again</button>
      </div>
    </main>
  );
}
