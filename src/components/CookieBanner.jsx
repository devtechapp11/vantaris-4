import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { setConsent, useConsent } from '../app/consent';
import { spring } from '../design/tokens';
import { Toggle } from './ui';

/**
 * Cookie choices. Shown until the visitor decides; "Reject" is as easy as
 * "Accept". Nothing optional (analytics) runs before a choice is made.
 */
export default function CookieBanner({ aboveTabs = false }) {
  const consent = useConsent();
  const [manage, setManage] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  return (
    <AnimatePresence>
      {consent === null && (
        <motion.section
          className={`cookie glass ${aboveTabs ? 'cookie--tabs' : ''}`}
          role="dialog"
          aria-label="Cookie choices"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={spring.snappy}
        >
          <p className="t-callout">
            We use essential storage to keep you signed in. With your OK we also count anonymous product events to improve Vantaris. No ads, no tracking across sites. <Link to="/cookies" className="link">Cookie policy</Link>
          </p>
          {manage && (
            <div className="group cookie-manage">
              <div className="cell">
                <span className="grow"><span className="cell-title" style={{ display: 'block' }}>Essential</span><span className="cell-sub">Sign-in, preferences, payments. Always on.</span></span>
                <span className="t-cap">On</span>
              </div>
              <div className="cell">
                <label className="grow" htmlFor="ck-analytics"><span className="cell-title" style={{ display: 'block' }}>Analytics</span><span className="cell-sub">Anonymous events like “started a deal”.</span></label>
                <Toggle id="ck-analytics" checked={analytics} onChange={setAnalytics} label="Analytics" />
              </div>
            </div>
          )}
          <div className="cookie-actions">
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setConsent({ analytics: false })}>Reject optional</button>
            {manage ? (
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setConsent({ analytics })}>Save choices</button>
            ) : (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setManage(true)}>Manage</button>
            )}
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setConsent({ analytics: true })}>Accept all</button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
