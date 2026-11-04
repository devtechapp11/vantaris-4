import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { AppProvider, useApp } from './app/AppContext';
import { usePrefs } from './app/prefs';
import { Toast } from './components/chrome';
import { Sidebar, TabBar, TABS } from './components/Shell';
import Paywall from './components/Paywall';
import { LogoLoader } from './components/Logo';
import HeroShell from './components/HeroShell';
import Mascot from './components/Mascot';
import { IS_DEMO } from './lib/config';
import { loaders } from './app/routes';
import { useScrollMemory, useSwipeBack } from './app/fluid';
import ErrorBoundary from './components/ErrorBoundary';
import CookieBanner from './components/CookieBanner';
import { LEGAL_ORDER } from './content/legal';
import { track } from './lib/analytics';

// Every screen is its own chunk, so the landing page never downloads the app
// and the app never downloads the landing page's 3D scene.
const Landing = lazy(loaders.landing);
const AuthScreen = lazy(loaders.auth);
const ResetPassword = lazy(() => loaders.auth().then((m) => ({ default: m.ResetPassword })));
const Onboarding = lazy(loaders.onboarding);
const Home = lazy(loaders.home);
const Practice = lazy(loaders.practice);
const Problem = lazy(loaders.problem);
const Ranking = lazy(loaders.ranking);
const Profile = lazy(loaders.profile);
const Plans = lazy(loaders.plans);
const Legal = lazy(loaders.legal);
const NotFound = lazy(loaders.notFound);

// The preview build runs inside a sandboxed frame, so it keeps its route in memory.
const Router = IS_DEMO ? MemoryRouter : BrowserRouter;

export default function App() {
  const prefs = usePrefs();
  return (
    <Router>
      <MotionConfig reducedMotion={prefs.reduceMotion ? 'always' : 'user'}>
        <AppProvider>
          {IS_DEMO && <div className="preview-band" role="note">Preview: nothing you enter leaves this page</div>}
          <Gate />
          <Paywall />
          <Toast />
        </AppProvider>
      </MotionConfig>
    </Router>
  );
}

const TAB_PATHS = new Set(TABS.map((t) => t.to));
// Sign in, sign up and forgot password are one screen: switching between them
// is a shared-layout animation, not a page transition.
const AUTH_PATHS = new Set(['/signin', '/signup', '/forgot']);
const routeKey = (path) => (AUTH_PATHS.has(path) ? 'auth' : path === '/welcome' ? '/' : path);
// App screens that need an account: signed-out visitors go to sign in, not to a 404.
const APP_PATHS = ['/practice', '/practice/:id', '/ranking', '/profile', '/plans', '/onboarding'];
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
    const h = idle(() => ['home', 'practice', 'problem', 'ranking', 'profile', 'plans'].forEach((k) => loaders[k]().catch(() => {})));
    return () => cancel(h);
  }, [signedIn]);

  // Signed-out visitors on the home page already see the pre-rendered hero
  // (index.html); keep showing it, not a splash, until the landing chunk is in.
  const prerendered = document.documentElement.hasAttribute('data-prerender') && /^\/(welcome)?$/.test(location.pathname);
  const loader = prerendered ? <HeroShell /> : <LogoLoader />;
  if (session === undefined) return loader;

  let routes;
  if (location.pathname === '/reset-password') {
    routes = <Route path="/reset-password" element={<ResetPassword />} />;
  } else if (!session) {
    routes = (
      <>
        <Route path="/" element={<Landing />} />
        <Route path="/welcome" element={<Landing />} />
        <Route path="/signin" element={<AuthScreen />} />
        <Route path="/signup" element={<AuthScreen />} />
        <Route path="/forgot" element={<AuthScreen />} />
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
        <Route path="/onboarding" element={<Onboarding />} />
        {legalRoutes}
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </>
    );
  } else {
    routes = (
      <>
        <Route path="/" element={<Home />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/practice/:id" element={<Problem />} />
        <Route path="/plans" element={<Plans />} />
        {legalRoutes}
        {['/welcome', '/signin', '/signup', '/forgot', '/onboarding'].map((path) => <Route key={path} path={path} element={<Navigate to="/" replace />} />)}
        <Route path="*" element={<NotFound />} />
      </>
    );
  }

  const onTab = signedIn && TAB_PATHS.has(location.pathname);
  return (
    <div className={`app ${signedIn ? 'has-sidebar' : ''}`}>
      <a href="#main" className="skip" onClick={(e) => { e.preventDefault(); const m = document.getElementById('main') ?? document.querySelector('main'); m?.setAttribute('tabindex', '-1'); m?.focus(); }}>Skip to content</a>
      {signedIn && <Sidebar />}
      <div className="app-main">
        <ErrorBoundary resetKey={location.pathname}>
          <Suspense fallback={loader}>
            <AnimatePresence mode="wait" initial={false} onExitComplete={restoreScroll}>
              <Routes location={location} key={routeKey(location.pathname)}>{routes}</Routes>
            </AnimatePresence>
          </Suspense>
        </ErrorBoundary>
      </div>
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
