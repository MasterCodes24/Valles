import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          padding: '2rem',
          color: 'var(--clr-text-primary)',
          textAlign: 'center',
          gap: '1rem',
        }}>
          <div style={{
            fontSize: '2rem',
            padding: '1rem',
            borderRadius: '50%',
            background: 'var(--clr-hazard-dim)',
            color: 'var(--clr-hazard)'
          }}>
            ⚠️
          </div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Telemetry System Error</h2>
          <p style={{ color: 'var(--clr-text-secondary)', maxWidth: '480px' }}>
            A subsystem failed to render: {this.state.error?.message || 'Unknown error'}
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
            >
              Restart Subsystems
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.href = '/'
              }}
            >
              Return to Base
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
