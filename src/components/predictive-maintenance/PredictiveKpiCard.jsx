import { Info, TrendingUp, TrendingDown } from 'lucide-react'

// Carte KPI accessible (clavier, tooltip, états chargement/vide/erreur).
export default function PredictiveKpiCard({
  icon: Icon, label, value, accent = '#3b82f6', tooltip,
  delta, deltaLabel, children, loading, error, onClick,
}) {
  const clickable = typeof onClick === 'function'
  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      aria-label={typeof value === 'string' || typeof value === 'number' ? `${label} : ${value}` : label}
      className={`relative overflow-hidden rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 transition-all ${clickable ? 'cursor-pointer hover:border-[var(--brand)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]' : ''}`}
    >
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-3xl opacity-[0.15] pointer-events-none" style={{ background: accent }} />
      <div className="relative flex items-start justify-between gap-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}1a` }}>
          {Icon && <Icon size={16} style={{ color: accent }} />}
        </div>
        {tooltip && (
          <span className="text-[var(--text-muted)] shrink-0" title={tooltip} aria-label={tooltip} role="img">
            <Info size={13} />
          </span>
        )}
      </div>

      <div className="relative mt-3">
        {error ? (
          <p className="text-[13px] text-red-500">Erreur</p>
        ) : loading ? (
          <div className="h-7 w-16 rounded bg-[var(--surface-2)] animate-pulse" />
        ) : (
          <p className="text-[24px] font-bold text-[var(--text)] leading-none tabular-nums">{value ?? '—'}</p>
        )}
        <p className="text-[12px] font-medium text-[var(--text)] mt-1.5">{label}</p>

        {delta != null && !loading && !error && (
          <p className={`text-[11px] font-medium mt-1 inline-flex items-center gap-1 ${delta >= 0 ? 'text-red-500' : 'text-green-500'}`}>
            {delta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {delta >= 0 ? '+' : ''}{delta} {deltaLabel || 'vs période préc.'}
          </p>
        )}
        {children && !loading && !error && <div className="mt-2">{children}</div>}
      </div>
    </div>
  )
}
