import { ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react'

export function PredictiveEmptyState({ title = 'Aucun lampadaire à risque', message = 'Le parc est sain sur la période et les filtres sélectionnés.' }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center mb-3">
        <ShieldCheck size={24} className="text-green-500" />
      </div>
      <p className="text-[14px] font-semibold text-[var(--text)]">{title}</p>
      <p className="text-[12px] text-[var(--text-muted)] mt-1 max-w-sm">{message}</p>
    </div>
  )
}

export function PredictiveErrorState({ message = 'Impossible de charger les données prédictives.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6" role="alert">
      <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-3">
        <AlertTriangle size={24} className="text-red-500" />
      </div>
      <p className="text-[14px] font-semibold text-[var(--text)]">Une erreur est survenue</p>
      <p className="text-[12px] text-[var(--text-muted)] mt-1 max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-medium border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors"
        >
          <RefreshCw size={13} /> Réessayer
        </button>
      )}
    </div>
  )
}

export function PredictiveSkeleton({ rows = 6, tableOnly = false }) {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Chargement">
      {!tableOnly && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]" />
            ))}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
            <div className="h-64 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]" />
            <div className="h-64 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]" />
          </div>
        </>
      )}
      <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="h-11 bg-[var(--surface-2)] border-b border-[var(--border)]" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 border-b border-[var(--border)] bg-[var(--surface)]" />
        ))}
      </div>
    </div>
  )
}
