import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

/**
 * ErrorBoundary — isole les crashs React : une page qui plante
 * affiche un fallback au lieu de faire tomber toute l'application.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle size={26} className="text-red-500" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-[var(--text)]">
            Une erreur est survenue sur cette page
          </p>
          <p className="text-[13px] text-[var(--text-muted)] mt-1 max-w-md">
            {this.state.error?.message ?? 'Erreur inattendue.'}
          </p>
        </div>
        <button
          onClick={this.handleReset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium
                     bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)]
                     hover:bg-[var(--surface)] transition-colors"
        >
          <RefreshCw size={14} />
          Réessayer
        </button>
      </div>
    )
  }
}
