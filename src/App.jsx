import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { AppProvider, useApp } from './app/AppContext';
import { usePrefs } from './app/prefs';
import { Toast } from './components/chrome';
import { Sidebar, TabBar, TABS } from './components/Shell';
import Paywall from './components/Paywall';
import { LogoLoader } from './components/Logo';
import Mascot from './components/Mascot';
import { IS_DEMO } from './lib/config';

// Every screen is its own chunk, so the landing page never downloads the app
// and the app never downloads the landing page's 3D scene.
const auth = () => import('./screens/Auth');
const Landing = lazy(() => import('./screens/Landing'));
const AuthScreen = lazy(auth);
const ResetPassword = lazy(() => auth().then((m) => ({ default: m.ResetPassword })));
const Onboarding = lazy(() => import('./screens/Onboarding'));
const home = () => import('./screens/Home');
const practice = () => import('./screens/Practice');
const problem = () => import('./screens/Problem');
const ranking = () => import('./screens/Ranking');
const profile = () => import('./screens/Profile');
const plans = () => import('./screens/Plans');
const Home = lazy(home);
const Practice = lazy(practice);
const Problem = lazy(problem);
const Ranking = lazy(ranking);
const Profile = lazy(profile);
const Plans = lazy(plans);

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
const routeKey = (path) => (AUTH_PATHS.has(path) ? 'auth' : path);

function Gate() {
  const { session, me, meError, refreshMe } = useApp();
  const location = useLocation();
  const signedIn = Boolean(session && me?.profile?.onboarded);

  // Warm the main screens once the app is idle, so tab switches are instant.
  useEffect(() => {
    if (!signedIn) return undefined;
    const idle = window.requestIdleCallback ?? ((cb) => setTimeout(cb, 1200));
    const cancel = window.cancelIdleCallback ?? clearTimeout;
    const h = idle(() => [home, practice, problem, ranking, profile, plans].forEach((load) => load().catch(() => {})));
    return () => cancel(h);
  }, [signedIn]);

  if (session === undefined) return <LogoLoader />;

  let routes;
  if (location.pathname === '/reset-password') {
    routes = <Route path="/reset-password" element={<ResetPassword />} />;
  } else if (!session) {
    routes = (
      <>
        <Route path="/welcome" element={<Landing />} />
        <Route path="/signin" element={<AuthScreen />} />
        <Route path="/signup" element={<AuthScreen />} />
        <Route path="/forgot" element={<AuthScreen />} />
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </>
    );
  } else if (!me) {
    return meError ? <AccountError message={meError.message} retry={() => refreshMe().catch(() => {})} /> : <LogoLoader />;
  } else if (!me.profile.onboarded) {
    routes = (
      <>
        <Route path="/onboarding" element={<Onboarding />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </>
    );
  }

  const onTab = signedIn && TAB_PATHS.has(location.pathname);
  return (
    <div className={`app ${signedIn ? 'has-sidebar' : ''}`}>
      {signedIn && <Sidebar />}
      <div className="app-main">
        <Suspense fallback={<LogoLoader />}>
          <AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo(0, 0)}>
            <Routes location={location} key={routeKey(location.pathname)}>{routes}</Routes>
          </AnimatePresence>
        </Suspense>
      </div>
      {onTab && <TabBar />}
    </div>
  );
}

function AccountError({ message, retry }) {
  return (
    <main className="screen screen--bare" style={{ minHeight: '100dvh', justifyContent: 'center' }}>
      <div className="card stack-16 center-x center">
        <Mascot mood="wrong" size={120} />
        <h1 className="t-h3">We couldn’t load your account</h1>
        <p className="t-callout">{message}</p>
        <button type="button" className="btn btn--gold btn--md" onClick={retry}>Try again</button>
      </div>
    </main>
  );
}
