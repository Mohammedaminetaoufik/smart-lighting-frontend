import { RISK_META } from '../../services/predictiveMaintenanceService'

// Badge de niveau de risque — la couleur ET le texte portent l'information
// (accessibilité : jamais la couleur seule).
export default function RiskLevelBadge({ level, score, size = 'md' }) {
  const meta = RISK_META[level] ?? RISK_META.unknown
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-1 text-[11px]'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${pad}`}
      style={{ color: meta.color, background: `${meta.color}1a` }}
      aria-label={`Niveau de risque : ${meta.label}${score != null ? `, score ${score}%` : ''}`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
      {score != null && <span className="opacity-70 font-bold tabular-nums">{score}%</span>}
    </span>
  )
}
