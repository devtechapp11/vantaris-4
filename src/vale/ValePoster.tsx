import './vale3d.css';

/**
 * Vale as a still (AVIF, ~8 KB, captured from the real canvas): the LCP image,
 * the fallback without WebGL, and what shows while the 3D chunk loads.
 */
export default function ValePoster({ gone = false, eager = true }: { gone?: boolean; eager?: boolean }) {
  return (
    <picture className={`vale-poster ${gone ? 'is-gone' : ''}`} aria-hidden="true">
      <source media="(max-aspect-ratio: 3/4)" srcSet="/vale-poster-tall.avif" type="image/avif" />
      <img src="/vale-poster.avif" alt="" width={1200} height={1200} decoding="async" fetchPriority={eager ? 'high' : 'auto'} loading={eager ? 'eager' : 'lazy'} />
    </picture>
  );
}
