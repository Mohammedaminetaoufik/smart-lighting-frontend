import { ShieldAlert, CalendarClock, Gauge, Wrench } from 'lucide-react'
import PredictiveKpiCard from './PredictiveKpiCard'
import PredictionConfidence from './PredictionConfidence'
import { RISK_META } from '../../services/predictiveMaintenanceService'

// Les 4 KPI de la maintenance prédictive.
export default function PredictiveKpiGrid({ summary, distribution, trend = [], loading, error }) {
  const s = summary || {}
  const pct = s.total_lamp_posts > 0 ? Math.round((s.at_risk_count / s.total_lamp_posts) * 100) : 0
  const midpoint = Math.floor(trend.length / 2)
  const anomalyCount = (rows) => rows.reduce((sum, point) => sum + (point.critical || 0) + (point.high || 0) + (point.moderate || 0), 0)
  const previousAnomalies = anomalyCount(trend.slice(0, midpoint))
  const currentAnomalies = anomalyCount(trend.slice(midpoint))
  const periodDelta = previousAnomalies > 0
    ? Math.round(((currentAnomalies - previousAnomalies) / previousAnomalies) * 100)
    : currentAnomalies > 0 ? 100 : 0

  // Type de panne dominant (depuis la distribution)
  const dominant = (() => {
    const list = distribution?.by_type ?? []
    if (!list.length) return '—'
    return list.reduce((a, b) => (b.count > a.count ? b : a)).label
  })()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {/* 1. Lampadaires à risque */}
      <PredictiveKpiCard
        icon={ShieldAlert} accent="#ef4444" loading={loading} error={error}
        label="Lampadaires à risque"
        value={s.at_risk_count ?? 0}
        delta={trend.length > 1 ? periodDelta : undefined}
        deltaLabel="% vs période préc."
        tooltip="Lampadaires présentant un risque de défaillance (score ≥ 50 %)."
      >
        <div className="flex flex-wrap items-center gap-2 text-[10.5px]">
          <span className="text-[var(--text-muted)]">{pct}% du parc</span>
          <span className="inline-flex items-center gap-1" style={{ color: RISK_META.critical.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: RISK_META.critical.color }} />{s.critical_count ?? 0} crit.
          </span>
          <span className="inline-flex items-center gap-1" style={{ color: RISK_META.high.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: RISK_META.high.color }} />{s.high_risk_count ?? 0} élevé
          </span>
          <span className="inline-flex items-center gap-1" style={{ color: RISK_META.moderate.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: RISK_META.moderate.color }} />{s.moderate_risk_count ?? 0} modéré
          </span>
        </div>
      </PredictiveKpiCard>

      {/* 2. Pannes prévues à 30 jours */}
      <PredictiveKpiCard
        icon={CalendarClock} accent="#f97316" loading={loading} error={error}
        label="Pannes prévues à 30 jours"
        value={s.predicted_failures_30d ?? 0}
        delta={trend.length > 1 ? periodDelta : undefined}
        deltaLabel="% vs période préc."
        tooltip="Nombre de défaillances estimées dans les 30 prochains jours (échéance ≤ 30 j)."
      >
        <p className="text-[10.5px] text-[var(--text-muted)]">
          Type dominant : <span className="text-[var(--text)] font-medium">{dominant}</span>
        </p>
      </PredictiveKpiCard>

      {/* 3. Fiabilité moyenne du moteur de règles */}
      <PredictiveKpiCard
        icon={Gauge} accent="#3b82f6" loading={loading} error={error}
        label="Fiabilité moyenne du score"
        value={<PredictionConfidence value={s.average_rule_reliability ?? s.average_model_confidence ?? 0} />}
        tooltip="Indice déterministe des règles, réduit quand la télémétrie est ancienne. Ce n'est pas une probabilité ML."
      />

      {/* 4. Interventions prioritaires */}
      <PredictiveKpiCard
        icon={Wrench} accent="#22c55e" loading={loading} error={error}
        label="Interventions prioritaires"
        value={s.priority_interventions ?? 0}
        tooltip="Lampadaires critiques ou à risque élevé nécessitant une action."
      >
        <p className="text-[10.5px] text-[var(--text-muted)]">
          {s.created_work_orders ?? 0} BT créés ·{' '}
          <span className="text-[var(--text)] font-medium">
            {Math.max(0, (s.priority_interventions ?? 0) - (s.created_work_orders ?? 0))} restant(s)
          </span>
        </p>
      </PredictiveKpiCard>
    </div>
  )
}
