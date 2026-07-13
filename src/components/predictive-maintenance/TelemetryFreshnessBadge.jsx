import { FRESHNESS_META } from '../../services/predictiveMaintenanceService'
import { timeAgo } from '../../utils/helpers'

// Badge de fraîcheur de la télémétrie (à jour / retardée / ancienne / obsolète / indisponible).
export default function TelemetryFreshnessBadge({ freshness, lastAt, showTime = false }) {
  const meta = FRESHNESS_META[freshness] ?? FRESHNESS_META.unavailable
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap"
      style={{ color: meta.color }}
      title={`Fraîcheur : ${meta.label} (${meta.hint})`}
      aria-label={`Fraîcheur des données : ${meta.label}`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
      {showTime && lastAt ? timeAgo(lastAt) : meta.label}
    </span>
  )
}
