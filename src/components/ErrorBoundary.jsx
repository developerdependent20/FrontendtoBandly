import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#450a0a', color: '#fecaca', height: '100vh', width: '100vw', overflow: 'auto', fontFamily: 'monospace', zIndex: 9999, position: 'fixed', top: 0, left: 0 }}>
          <h1 style={{ color: '#f87171', borderBottom: '1px solid #dc2626', paddingBottom: '10px' }}>🚨 Bandly Crash Report</h1>
          <h3 style={{ marginTop: '20px' }}>Error:</h3>
          <pre style={{ background: '#220000', padding: '15px', borderRadius: '5px', whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
          </pre>
          <h3 style={{ marginTop: '20px' }}>Component Stack:</h3>
          <pre style={{ background: '#220000', padding: '15px', borderRadius: '5px', whiteSpace: 'pre-wrap', fontSize: '11px' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
