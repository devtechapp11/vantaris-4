import { Link } from 'react-router-dom';
import { resetConsent } from '../app/consent';

export const LEGAL_PAGES = [
  ['/terms', 'Terms'],
  ['/privacy', 'Privacy'],
  ['/cookies', 'Cookies'],
  ['/refund', 'Refunds'],
  ['/subscription-terms', 'Subscriptions'],
  ['/acceptable-use', 'Acceptable use'],
  ['/disclaimer', 'Disclaimer'],
  ['/contact', 'Contact'],
];

/** Footer links to every legal page, plus a way to reopen the cookie choices. */
export default function LegalLinks() {
  return (
    <nav className="legal-links" aria-label="Legal">
      {LEGAL_PAGES.map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}
      <button type="button" onClick={resetConsent}>Cookie settings</button>
    </nav>
  );
}
