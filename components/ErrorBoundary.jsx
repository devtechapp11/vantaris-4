import { Component } from 'react';
import Mascot from './Mascot';

/**
 * Catches a crash in one screen so the rest of the app keeps working.
 * `resetKey` (the route) clears the error when you navigate away.
 */
export default class ErrorBoundary extends Component {
  state = { error: null, key: this.props.resetKey };

  static getDerivedStateFromError(error) {
    return { error };
  }

  static getDerivedStateFromProps(props, state) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  componentDidCatch(error, info) {
    // Visible to developers; no personal data is attached.
    console.warn('Screen error', error?.message, info?.componentStack?.split('\n')[1]);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="screen screen--bare status-page" id="main">
        <Mascot state="error" size={140} label="Vale shaking its head" />
        <div className="stack-12 center-x center">
          <p className="t-eyebrow">Something went wrong</p>
          <h1 className="t-h1">This screen hit a snag.</h1>
          <p className="t-callout">Your progress is saved. Reload to try again.</p>
        </div>
        <div className="row-8">
          <button type="button" className="btn btn--primary btn--md btn--auto" onClick={() => window.location.reload()}>Reload</button>
          <a href="/" className="btn btn--secondary btn--md btn--auto">Home</a>
        </div>
      </main>
    );
  }
}
