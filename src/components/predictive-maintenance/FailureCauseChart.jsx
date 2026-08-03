import {
  BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'
import { RISK_META, riskLevelFromScore } from '../../services/predictiveMaintenanceService'

const CAUSE_LABELS = {
  overcurrent: 'Surintensité',
  overvoltage: 'Surtension',
  underpower: 'Sous-consommation',
  leakage: 'Fuite de courant',
  overtemp: 'Surchauffe',
  power_factor: 'Dégradation du facteur de puissance',
  unstable_current: 'Instabilité du courant',
  intermittent_communication: 'Communication intermittente',
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-xl px-3 py-2 text-[12px] shadow-xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
      <p className="font-semibold mb-0.5">{d.name}</p>
      <p className="text-[var(--text-muted)]">{d.count} lampadaire(s) · {d.pct}%</p>
      <p className="text-[var(--text-muted)]">Criticité : <span style={{ color: d.color }}>{RISK_META[d.level].label}</span></p>
      <p className="text-[var(--text-muted)]">Score moyen : {d.averageRiskScore}% · évolution {d.evolution == null ? 'n/d' : `${d.evolution >= 0 ? '+' : ''}${d.evolution}%`}</p>
    </div>
  )
}

export default function FailureCauseChart({ distribution, loading = false, error = false }) {
  const list = distribution?.by_type ?? []
  const total = list.reduce((s, t) => s + t.count, 0) || 1
  const data = list
    .map((t) => {
      const averageRiskScore = t.average_risk_score ?? 50
      const level = riskLevelFromScore(averageRiskScore)
      return {
        name: CAUSE_LABELS[t.fault_type] ?? t.label ?? t.fault_type,
        count: t.count,
        pct: Math.round((t.count / total) * 100),
        averageRiskScore,
        evolution: t.evolution_percent ?? 0,
        level,
        color: RISK_META[level].color,
      }
    })
    .sort((a, b) => b.count - a.count)

  return (
    <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5">
      <p className="text-[13px] font-semibold text-[var(--text)]">Répartition des causes probables</p>
      <p className="text-[11px] text-[var(--text-muted)] mt-0.5 mb-4">Anomalies détectées — cause probable, non confirmée</p>

      {loading ? (
        <div className="h-[220px] rounded-xl bg-[var(--surface-2)] animate-pulse" aria-label="Chargement des causes probables" />
      ) : error ? (
        <div className="h-[220px] flex items-center justify-center text-[12px] text-red-500" role="alert">
          Impossible de charger les causes probables.
        </div>
      ) : data.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-[12px] text-[var(--text-muted)]">
          Aucune anomalie sur la période.
        </div>
      ) : (
        <>
          <div role="img" aria-label="Répartition des causes probables par criticité">
          <ResponsiveContainer width="100%" height={Math.max(160, data.length * 46)}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={132}
                tick={{ fontSize: 11, fill: 'var(--text)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-2)', opacity: 0.4 }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18} label={{ position: 'right', fontSize: 11, fill: 'var(--text-muted)', formatter: (v) => v }}>
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {data.map((d) => (
              <li key={d.name} className="flex items-center gap-2 text-[11px]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-[var(--text-muted)] flex-1 truncate">{d.name}</span>
                <span className="text-[var(--text)] font-semibold tabular-nums">{d.pct}%</span>
                <span className="text-[var(--text-muted)] tabular-nums" title="Évolution par rapport à la période précédente">
                  {d.evolution == null ? 'n/d' : `${d.evolution >= 0 ? '+' : ''}${d.evolution}%`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
