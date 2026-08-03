import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { RISK_META } from '../../services/predictiveMaintenanceService'

// Courbe d'évolution des anomalies par niveau de criticité (couleurs peu saturées).
const SERIES = [
  { key: 'critical', name: 'Critiques', color: RISK_META.critical.color, kind: 'area' },
  { key: 'high',     name: 'Risque élevé', color: RISK_META.high.color, kind: 'area' },
  { key: 'moderate', name: 'Risque modéré', color: RISK_META.moderate.color, kind: 'area' },
  { key: 'healthy',  name: 'Sains', color: RISK_META.healthy.color, kind: 'line' },
]

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2 text-[12px] shadow-xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
      <p className="text-[var(--text-muted)] mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[var(--text-muted)]">{p.name}</span>
          <span className="ml-auto font-bold tabular-nums" style={{ color: p.color }}>{p.value}</span>
          <span className="w-8 text-right text-[10px] text-[var(--text-muted)]">
            {p.payload.changes?.[p.dataKey] > 0 ? '+' : ''}{p.payload.changes?.[p.dataKey] ?? 0}
          </span>
        </p>
      ))}
      <p className="text-[10px] text-[var(--text-muted)] mt-1">Variation depuis le point précédent</p>
    </div>
  )
}

export default function RiskTrendChart({ data = [], loading = false, error = false }) {
  const chartData = (data || []).map((d, index, rows) => ({
    ...d,
    date: d.day?.slice(5),
    changes: Object.fromEntries(SERIES.map(({ key }) => [key, index === 0 ? 0 : (d[key] || 0) - (rows[index - 1][key] || 0)])),
  }))

  return (
    <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5">
      <p className="text-[13px] font-semibold text-[var(--text)]">Évolution des lampadaires à risque</p>
      <p className="text-[11px] text-[var(--text-muted)] mt-0.5 mb-4">Anomalies détectées par jour et par niveau</p>

      {loading ? (
        <div className="h-[240px] rounded-xl bg-[var(--surface-2)] animate-pulse" aria-label="Chargement de l’évolution du risque" />
      ) : error ? (
        <div className="h-[240px] flex items-center justify-center text-[12px] text-red-500" role="alert">
          Impossible de charger l’évolution du risque.
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-[240px] flex items-center justify-center text-[12px] text-[var(--text-muted)]">
          Aucune donnée sur la période.
        </div>
      ) : (
        <div role="img" aria-label="Évolution des lampadaires critiques, à risque élevé, modéré et sains">
          <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
            <defs>
              {SERIES.map((s) => (
                <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" opacity={0.5} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
              interval={Math.max(0, Math.floor(chartData.length / 8) - 1)} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
            {SERIES.filter((s) => s.kind === 'area').map((s) => (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.name}
                stroke={s.color} strokeWidth={2} fill={`url(#grad-${s.key})`} stackId="risk" dot={false} />
            ))}
            <Line type="monotone" dataKey="healthy" name="Sains" stroke={RISK_META.healthy.color}
              strokeWidth={2} strokeDasharray="5 4" dot={false} />
          </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
