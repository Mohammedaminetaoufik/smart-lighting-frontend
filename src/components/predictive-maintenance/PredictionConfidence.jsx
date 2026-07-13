// Confiance du modèle : valeur + barre de progression + mention Élevée/Moyenne/Faible.
export function confidenceTier(pct) {
  if (pct >= 80) return { label: 'Élevée', color: '#22c55e' }
  if (pct >= 60) return { label: 'Moyenne', color: '#eab308' }
  return { label: 'Faible', color: '#ef4444' }
}

export default function PredictionConfidence({ value = 0, compact = false }) {
  const tier = confidenceTier(value)
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5" aria-label={`Confiance ${value}%, ${tier.label}`}>
        <span className="tabular-nums font-semibold text-[var(--text)]">{value}%</span>
        <span className="w-10 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
          <span className="block h-full rounded-full" style={{ width: `${value}%`, background: tier.color }} />
        </span>
      </span>
    )
  }
  return (
    <div aria-label={`Confiance du modèle ${value}%, ${tier.label}`}>
      <div className="flex items-baseline justify-between">
        <span className="text-[24px] font-bold text-[var(--text)] tabular-nums">{value}%</span>
        <span className="text-[11px] font-semibold" style={{ color: tier.color }}>{tier.label}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: tier.color }} />
      </div>
    </div>
  )
}
