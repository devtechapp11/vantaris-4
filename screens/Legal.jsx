import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../app/AppContext';
import { useMeta } from '../app/useMeta';
import { Item, NavBar, Page } from '../components/chrome';
import Logo from '../components/Logo';
import LegalLinks from '../components/LegalLinks';
import { EFFECTIVE, LEGAL } from '../content/legal';
import './Legal.css';

const PLACEHOLDER = /\[[A-Z][^\]]*\]/;

/** One legal document, readable by everyone (signed in or not). */
export default function Legal() {
  const { pathname } = useLocation();
  const { session } = useApp();
  const slug = pathname.replace(/^\//, '');
  const doc = LEGAL[slug];
  useMeta({ title: doc?.title, description: doc?.description, path: pathname });
  if (!doc) return null;
  const draft = PLACEHOLDER.test(JSON.stringify(doc)) || PLACEHOLDER.test(EFFECTIVE);
  const id = (h) => h.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <>
      {session ? (
        <NavBar back="Back" to="/profile?tab=settings" title={doc.title} />
      ) : (
        <header className="legal-top">
          <Link to="/" aria-label="Vantaris, home"><Logo size={24} /></Link>
          <Link to="/signin" className="link t-foot">Sign in</Link>
        </header>
      )}
      <Page className="screen legal" id="main">
        <Item as="header" className="legal-head">
          <p className="t-eyebrow">Effective {EFFECTIVE}</p>
          <h1 className="t-h1">{doc.title}</h1>
          <p className="t-lead">{doc.description}</p>
          {draft && (
            <p className="alert alert--info" role="note">
              Draft for legal review. Items in [brackets] are placeholders the owner must complete before launch.
            </p>
          )}
        </Item>
        <Item as="nav" className="legal-toc" aria-label="On this page">
          <ol>{doc.sections.map((s) => <li key={s.h}><a href={`#${id(s.h)}`}>{s.h}</a></li>)}</ol>
        </Item>
        <Item className="legal-body">
          {doc.sections.map((s) => (
            <section key={s.h} id={id(s.h)} aria-labelledby={`${id(s.h)}-h`}>
              <h2 id={`${id(s.h)}-h`}>{s.h}</h2>
              {s.p?.map((t) => <p key={t}>{t}</p>)}
              {s.list && <ul>{s.list.map((t) => <li key={t}>{t}</li>)}</ul>}
            </section>
          ))}
        </Item>
        <Item as="footer" className="legal-foot"><LegalLinks /></Item>
      </Page>
    </>
  );
}
