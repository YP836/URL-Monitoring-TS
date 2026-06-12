import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div
        style={{
          minHeight: 280,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 12,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 500, color: '#E24B4A' }}>
          Warning: Something went wrong
        </div>
        <div style={{ fontSize: 13, color: '#888780' }}>{this.state.error?.message}</div>
        <button className="primary" type="button" onClick={() => window.location.reload()}>
          Reload page
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
