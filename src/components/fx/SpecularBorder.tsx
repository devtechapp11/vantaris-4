import './fx.css';

/**
 * A 1px gradient border whose bright point sits at --mx / --my (set by the
 * parent, see usePointerLight). Place it inside any positioned element with a
 * border radius; it inherits the radius.
 */
export default function SpecularBorder({ strong = false }: { strong?: boolean }) {
  return <span className={`fx-spec-border ${strong ? 'is-strong' : ''}`} aria-hidden="true" />;
}
