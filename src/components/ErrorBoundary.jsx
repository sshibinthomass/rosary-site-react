import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
          <div className="text-center max-w-md">
            <span className="text-6xl block mb-4">🌱</span>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              Oops! Something went wrong
            </h1>
            <p className="text-[var(--text-secondary)] mb-6">
              We're sorry for the inconvenience. The page encountered an unexpected error.
            </p>
            <button
              onClick={this.handleReset}
              className="btn btn-primary"
            >
              Go to Home Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
