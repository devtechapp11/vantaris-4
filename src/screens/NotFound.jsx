import { Link } from 'react-router-dom';
import { useApp } from '../app/AppContext';
import { useMeta } from '../app/useMeta';
import { Item, Page } from '../components/chrome';
import Mascot from '../components/Mascot';

/** 404: Vale tilts its head; one way back. */
export default function NotFound() {
  const { session } = useApp();
  useMeta({ title: 'Page not found', noindex: true });
  return (
    <Page className="screen screen--bare status-page" id="main">
      <Item><Mascot state="curious" size={140} label="Vale, tilting its head" /></Item>
      <Item className="stack-12 center-x center">
        <p className="t-eyebrow">404</p>
        <h1 className="t-h1">This page isn’t on the desk.</h1>
        <p className="t-callout">The link may be old or mistyped.</p>
      </Item>
      <Item><Link to="/" className="btn btn--primary btn--md btn--auto">{session ? 'Back to Home' : 'Go to the home page'}</Link></Item>
    </Page>
  );
}
