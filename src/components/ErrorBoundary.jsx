import { Component } from 'react'

/**
 * ErrorBoundary — evita la pantalla blanca cuando un componente hijo lanza.
 * Muestra un fallback con opción de recargar. Loguea el error para diagnóstico.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary capturó un error:', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false })
    window.location.assign('/')
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Algo salió mal</h1>
          <p style={{ margin: 0, color: '#64748b', maxWidth: '420px' }}>
            Ocurrió un error inesperado. Puedes volver al inicio e intentarlo de nuevo.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#16a34a',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Volver al inicio
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
