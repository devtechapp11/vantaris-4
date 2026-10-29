import { BrowserRouter, MemoryRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { AppProvider, useApp } from './app/AppContext';
import { TabBar, Toast } from './components/chrome';
import Paywall from './components/Paywall';
import { Spinner } from './components/bits';
import { BRAND, IS_DEMO } from './lib/config';
import Welcome from './screens/Welcome';
import { Forgot, ResetPassword, SignIn, SignUp } from './screens/Auth';
import Onboarding from './screens/Onboarding';
import Home from './screens/Home';
import Practice from './screens/Practice';
import Problem from './screens/Problem';
import Ranking from './screens/Ranking';
import Profile from './screens/Profile';
import Plans from './screens/Plans';

// The preview build runs inside a sandboxed frame, so it keeps its route in memory.
const Router = IS_DEMO ? MemoryRouter : BrowserRouter;

export default function App() {
  return (
    <Router>
      <MotionConfig reducedMotion="user">
        <AppProvider>
          <div className="app">
            {IS_DEMO && <div className="preview-band" role="note">Preview: nothing you enter leaves this page</div>}
            <Gate />
            <Paywall />
            <Toast />
          </div>
        </AppProvider>
      </MotionConfig>
    </Router>
  );
}

function Tabs() {
  return (
    <>
      <Outlet />
      <TabBar />
    </>
  );
}

function Splash() {
  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }} aria-busy="true">
      <div className="stack-12" style={{ alignItems: 'center' }}>
        <span style={{ font: '600 22px/1 var(--font-display)', letterSpacing: '0.16em' }}>{BRAND.name.toUpperCase()}</span>
        <Spinner />
      </div>
    </div>
  );
}

function Gate() {
  const { session, me, meError, refreshMe } = useApp();
  const { pathname } = useLocation();

  if (session === undefined) return <Splash />;

  // A password-reset link signs the player in with a short recovery session.
  if (pathname === '/reset-password') {
    return <Routes><Route path="/reset-password" element={<ResetPassword />} /></Routes>;
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    );
  }

  if (!me) {
    if (!meError) return <Splash />;
    return (
      <main className="screen screen--bare" style={{ minHeight: '100dvh', justifyContent: 'center' }}>
        <div className="card stack-12">
          <h1 className="t-title-2">We couldn’t load your account</h1>
          <p className="t-callout">{meError.message}</p>
          <button type="button" className="btn btn--accent btn--md" onClick={() => refreshMe().catch(() => {})}>Try again</button>
        </div>
      </main>
    );
  }

  if (!me.profile.onboarded) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Tabs />}>
        <Route path="/" element={<Home />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="/practice/:id" element={<Problem />} />
      <Route path="/plans" element={<Plans />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
