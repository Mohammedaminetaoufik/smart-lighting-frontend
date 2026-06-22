import { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import {
  inferChartConfig,
  formatChartValue,
  formatAxisLabel,
  truncateLabel,
} from '../../utils/chartInference'

// ── Palette ──────────────────────────────────────────────────────────────────
const PALETTE = ['#22c55e', '#3b82f6', '#f59e0b', '#a78bfa', '#f87171', '#38bdf8', '#fb923c', '#4ade80']

const BADGE_LABELS = { bar: 'Bar chart', line: 'Line chart', pie: 'Pie chart', kpi: 'KPI' }

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1d27] border border-[#2d3748] rounded-lg px-3 py-2 text-xs shadow-lg">
      {label !== undefined && (
        <p className="font-semibold text-[#e2e8f0] mb-1">{String(label)}</p>
      )}
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color ?? '#22c55e' }}>
          {entry.name} : <span className="font-semibold">{formatChartValue(entry.value)}</span>
        </p>
      ))}
    </div>
  )
}

// ── KPI cards ────────────────────────────────────────────────────────────────
function KPICards({ columns, rows }) {
  const row = rows[0]
  const entries = columns.map((col) => ({ col, value: row[col] }))
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 py-2">
      {entries.map(({ col, value }, i) => (
        <div
          key={col}
          className="flex flex-col gap-1 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] truncate">
            {col.replace(/_/g, ' ')}
          </p>
          <p className="text-2xl font-bold" style={{ color: PALETTE[i % PALETTE.length] }}>
            {formatChartValue(value)}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── Bar chart ─────────────────────────────────────────────────────────────────
function AIBarChart({ data, xKey, yKey }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 48 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: '#2d3748' }}
          tickFormatter={formatAxisLabel}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatChartValue}
          width={48}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey={yKey} fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={56} name={yKey.replace(/_/g, ' ')} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Line chart ────────────────────────────────────────────────────────────────
function AILineChart({ data, xKey, yKey }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 48 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: '#2d3748' }}
          tickFormatter={formatAxisLabel}
          angle={-35}
          textAnchor="end"
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatChartValue}
          width={48}
        />
        <Tooltip content={<ChartTooltip />} />
        <Line
          type="monotone"
          dataKey={yKey}
          stroke="#22c55e"
          strokeWidth={2}
          dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          name={yKey.replace(/_/g, ' ')}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Pie chart ─────────────────────────────────────────────────────────────────
function AIPieChart({ data, xKey, yKey }) {
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.55
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return (
      <text x={x} y={y} fill="#e2e8f0" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={data}
          dataKey={yKey}
          nameKey={xKey}
          cx="50%"
          cy="50%"
          outerRadius={110}
          labelLine={false}
          label={renderLabel}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const entry = payload[0]
            return (
              <div className="bg-[#1a1d27] border border-[#2d3748] rounded-lg px-3 py-2 text-xs shadow-lg">
                <p className="font-semibold text-[#e2e8f0] mb-1">{String(entry.name)}</p>
                <p style={{ color: entry.payload.fill }}>
                  {entry.name} : <span className="font-semibold">{formatChartValue(entry.value)}</span>
                </p>
              </div>
            )
          }}
        />
        <Legend
          formatter={(value) => (
            <span style={{ color: '#94a3b8', fontSize: 11 }}>{truncateLabel(value, 22)}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AIResultChart({ columns, rows, chart, question }) {
  const config = useMemo(
    () => inferChartConfig(columns, rows, chart, question),
    [columns, rows, chart, question],
  )

  // Normalize row values: coerce numeric strings to numbers for Recharts
  const data = useMemo(() => {
    if (!rows?.length) return []
    return rows.map((row) => {
      const out = {}
      for (const col of (columns ?? [])) {
        const v = row[col]
        if (v !== null && v !== undefined && typeof v === 'string') {
          const n = Number(v.replace(',', '.'))
          out[col] = isNaN(n) ? v : n
        } else {
          out[col] = v
        }
      }
      return out
    })
  }, [rows, columns])

  if (!config || config.type === 'none') return null

  const badgeLabel = BADGE_LABELS[config.type] ?? config.type

  let chartBody
  try {
    if (config.type === 'kpi') {
      chartBody = <KPICards columns={config.yKeys} rows={rows} />
    } else if (config.type === 'bar') {
      chartBody = <AIBarChart data={data} xKey={config.xKey} yKey={config.yKey} />
    } else if (config.type === 'line') {
      chartBody = <AILineChart data={data} xKey={config.xKey} yKey={config.yKey} />
    } else if (config.type === 'pie') {
      chartBody = <AIPieChart data={data} xKey={config.xKey} yKey={config.yKey} />
    }
  } catch {
    chartBody = (
      <div className="flex items-center justify-center h-40 text-sm text-[var(--text-muted)]">
        Visualisation indisponible pour ces données.
      </div>
    )
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-2)]">
        <div className="flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Visualisation</span>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-500 border border-brand-500/20">
          {badgeLabel}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 pb-4 pt-3">
        <p className="text-[10px] text-[var(--text-muted)] mb-3">
          Graphique généré automatiquement à partir des résultats SQL
        </p>
        {chartBody}
      </div>
    </div>
  )
}
