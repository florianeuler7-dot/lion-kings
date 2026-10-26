import React from 'react';

// Catches render errors so the app never ends in a blank white screen.
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
      <div className="min-h-screen bg-ink text-zinc-100 flex items-center justify-center p-6 safe-top safe-bottom">
        <div className="card p-6 max-w-sm w-full text-center">
          <div className="text-4xl mb-3">💥</div>
          <div className="font-display text-2xl mb-2">DA IST WAS SCHIEFGELAUFEN</div>
          <div className="text-sm text-zinc-400 mb-5 break-words">
            {String(this.state.error?.message || this.state.error)}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary pressable w-full font-display text-lg py-3"
          >
            NEU LADEN
          </button>
        </div>
      </div>
    );
  }
}
