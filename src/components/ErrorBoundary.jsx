import React from 'react';
import { AlertTriangle } from 'lucide-react';

// Catches render errors so the app never ends in a blank screen.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Render error:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen bg-ink text-fg flex items-center justify-center p-6 safe-top safe-bottom">
        <div className="card p-6 max-w-sm w-full text-center" role="alert">
          <div className="w-14 h-14 rounded-2xl bg-danger/15 text-danger flex items-center justify-center mx-auto mb-4" aria-hidden="true">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="font-display text-3xl uppercase leading-none mb-2">Da ist was schiefgelaufen</div>
          <div className="text-sm text-fg-muted mb-5 break-words">
            {String(this.state.error?.message || this.state.error)}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary pressable w-full font-display text-2xl uppercase py-3"
          >
            Neu laden
          </button>
        </div>
      </div>
    );
  }
}
