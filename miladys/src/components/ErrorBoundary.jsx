import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Logged to the console so it's still visible in dev tools / can be
    // wired up to a real error-tracking service later — the UI itself
    // just shows a friendly fallback rather than a blank screen.
    console.error('[ErrorBoundary] caught a render error:', error, info?.componentStack);
  }

  handleReload = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-page">
          <div className="container">
            <p className="eyebrow">Something went wrong</p>
            <h1>This page hit a snag</h1>
            <p className="error-boundary-sub">
              Sorry about that — something unexpected happened while loading this page. Try going back to the homepage, or refresh and try again.
            </p>
            <button type="button" className="btn btn-primary" onClick={this.handleReload}>Back to Home</button>
          </div>

          <style>{`
            .error-boundary-page {
              min-height: 60vh;
              display: flex;
              align-items: center;
              padding: 100px 0 80px;
            }
            .error-boundary-page .container { text-align: center; max-width: 480px; margin: 0 auto; }
            .error-boundary-page h1 { font-size: 28px; margin: 10px 0 16px; }
            .error-boundary-sub { font-size: 14px; color: var(--ink-400); line-height: 1.7; margin-bottom: 28px; }
          `}</style>
        </div>
      );
    }
    return this.props.children;
  }
}
