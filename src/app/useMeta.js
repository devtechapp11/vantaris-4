// Per-route <title>, description, canonical URL and social tags.
// App screens behind sign-in are marked noindex.
import { useEffect } from 'react';
import { BRAND } from '../lib/config';

const DEFAULT_TITLE = `${BRAND.name}: ${BRAND.tagline}`;
const DEFAULT_DESC = 'Train like a Wall Street analyst: real DCF, LBO and M&A deals in five minutes, full debriefs and an AI coach. Climb from Analyst to Managing Director.';

function tag(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function canonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function useMeta({ title, description = DEFAULT_DESC, path, noindex = false } = {}) {
  useEffect(() => {
    const full = title ? `${title} · ${BRAND.name}` : DEFAULT_TITLE;
    const url = `${BRAND.site}${path ?? window.location.pathname}`;
    document.title = full;
    tag('name', 'description', description);
    tag('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    tag('property', 'og:title', full);
    tag('property', 'og:description', description);
    tag('property', 'og:url', url);
    tag('name', 'twitter:title', full);
    tag('name', 'twitter:description', description);
    canonical(url);
  }, [title, description, path, noindex]);
}
