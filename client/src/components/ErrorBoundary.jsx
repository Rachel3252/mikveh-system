import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 text-center text-white">
          <div className="max-w-lg rounded-3xl border border-slate-700 bg-slate-900/95 p-10 shadow-xl">
            <h1 className="text-3xl font-semibold mb-4">טעות באפליקציה</h1>
            <p className="mb-6 text-slate-300">נראה שיש תקלה לא צפויה. אנא רענן את הדף או פנה לתמיכה.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-2xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              טען מחדש
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
