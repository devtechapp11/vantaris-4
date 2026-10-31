// Privacy-friendly product analytics.
// - Sends nothing unless the visitor accepted analytics in the cookie banner.
// - Sends nothing unless VITE_ANALYTICS_ENDPOINT is set (a first-party or
//   cookieless collector such as a self-hosted Plausible/Umami endpoint).
// - No cookies, no user ids, no emails, no query strings: event name, a few
//   allow-listed properties and the path.
// Remember to add the collector's origin to connect-src in vercel.json.
import { getConsent } from '../app/consent';

const ENDPOINT = import.meta.env.VITE_ANALYTICS_ENDPOINT || '';
const EVENTS = new Set(['pageview', 'signup', 'start_deal', 'complete_deal', 'upgrade_click']);
const PROPS = new Set(['tier', 'plan', 'interval', 'correct', 'module', 'source']);

export function track(name, props = {}) {
  if (!EVENTS.has(name) || !ENDPOINT || getConsent()?.analytics !== true) return;
  const clean = {};
  for (const [k, v] of Object.entries(props)) {
    if (PROPS.has(k) && ['string', 'number', 'boolean'].includes(typeof v)) clean[k] = typeof v === 'string' ? v.slice(0, 40) : v;
  }
  const body = JSON.stringify({ name, props: clean, path: window.location.pathname, ts: Date.now() });
  try {
    if (!navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'application/json' }))) {
      fetch(ENDPOINT, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
    }
  } catch {
    /* analytics must never break the app */
  }
}
