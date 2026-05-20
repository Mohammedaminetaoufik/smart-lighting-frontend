import { Lightbulb, Wifi, WifiOff, Wrench, Bell, Zap, Play, RefreshCw, AlertTriangle, TrendingUp, ArrowRight, FlaskConical } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { PageLoader } from '../../components/ui/Spinner'
import { getStats, getNetworkHealth, getEnergySummary, getDailyEnergy } from '../../api/dashboard'
import { getAlerts, getAlertCounts } from '../../api/alerts'
import { runAllCalculator } from '../../api/calculator'
import { QK } from '../../lib/queryClient'
import { severityColor, labelSeverity, timeAgo } from '../../utils/helpers'

/* ── Reusable donut chart ─────────────────────────────────── */
function DonutChart({ title, subtitle, data, total }) {
  const hasData = data.some((d) => d.value > 0)
  const displayData = hasData ? data.filter((d) => d.value > 0) : [{ name: '—', value: 1, color: 'var(--border)' }]

  return (
    <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 flex flex-col">
      <p className="text-[13px] font-semibold text-[var(--text)]">{title}</p>
      {subtitle && <p className="text-[11px] text-[var(--text-muted)] mt-0.5 mb-4">{subtitle}</p>}

      {/* Donut */}
      <div className="relative mx-auto" style={{ width: 168, height: 168 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              innerRadius={54}
              outerRadius={72}
              paddingAngle={hasData ? 3 : 0}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
            >
              {displayData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            {hasData && (
              <Tooltip
                contentStyle={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '8px 12px',
                  fontSize: 12,
                  color: 'var(--text)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                }}
                formatter={(val, name) => [val, name]}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[30px] font-bold leading-none text-[var(--text)]">{total}</span>
          <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mt-1">total</span>
        </div>
      </div>

      {/* Legend */}
      {hasData && (
        <div className="mt-5 space-y-2.5">
          {data.map((item) => {
            const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
            return (
              <div key={item.name}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                  <span className="text-[12px] text-[var(--text-muted)] flex-1">{item.name}</span>
                  <span className="text-[13px] font-bold text-[var(--text)]">{item.value}</span>
                  <span className="text-[11px] text-[var(--text-muted)] w-7 text-right">{pct}%</span>
                </div>
                <div className="h-1 rounded-full bg-[var(--surface-2)] overflow-hidden ml-4">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: item.color, opacity: 0.7 }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Alert severity horizontal bar chart ──────────────────── */
function AlertSeverityChart({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 flex flex-col">
      <p className="text-[13px] font-semibold text-[var(--text)]">Alertes par sévérité</p>
      <p className="text-[11px] text-[var(--text-muted)] mt-0.5 mb-5">Alertes ouvertes en ce moment</p>

      <div className="space-y-4 flex-1">
        {data.map((item) => {
          const pct = Math.round((item.value / max) * 100)
          return (
            <div key={item.name}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                  <span className="text-[12px] text-[var(--text-muted)]">{item.name}</span>
                </div>
                <span className="text-[14px] font-bold" style={{ color: item.value > 0 ? item.color : 'var(--text-muted)' }}>
                  {item.value}
                </span>
              </div>
              <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${item.value === 0 ? 0 : Math.max(pct, 4)}%`, background: item.color }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Totals footer */}
      <div className="mt-5 pt-4 border-t border-[var(--border)] grid grid-cols-3 gap-3">
        {data.map((item) => (
          <div key={item.name}
            className="rounded-xl px-3 py-2.5 text-center"
            style={{ background: `${item.color}12` }}>
            <p className="text-[20px] font-bold leading-none" style={{ color: item.color }}>{item.value}</p>
            <p className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] mt-1">{item.name}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Network health with visual bars ──────────────────────── */
function NetworkHealthCard({ health, online, total, alertCounts }) {
  const onlinePct  = total > 0 ? Math.round((online / total) * 100) : 0
  const lcusPct    = (health?.lcus_total ?? 0) > 0
    ? Math.round(((health?.lcus_online ?? 0) / health.lcus_total) * 100)
    : 0

  const bars = [
    {
      label: 'Lampadaires en ligne',
      value: online,
      max: total,
      pct: onlinePct,
      color: onlinePct >= 80 ? '#22c55e' : onlinePct >= 50 ? '#f59e0b' : '#ef4444',
      display: `${online} / ${total}`,
    },
    {
      label: 'LCUs connectées',
      value: health?.lcus_online ?? 0,
      max: health?.lcus_total ?? 0,
      pct: lcusPct,
      color: lcusPct === 100 ? '#22c55e' : lcusPct >= 50 ? '#f59e0b' : '#ef4444',
      display: `${health?.lcus_online ?? 0} / ${health?.lcus_total ?? 0}`,
    },
    {
      label: 'Disponibilité réseau',
      value: onlinePct,
      max: 100,
      pct: onlinePct,
      color: onlinePct >= 80 ? '#22c55e' : onlinePct >= 50 ? '#f59e0b' : '#ef4444',
      display: `${onlinePct}%`,
    },
  ]

  return (
    <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 flex flex-col gap-5">
      <div>
        <p className="text-[13px] font-semibold text-[var(--text)]">Santé réseau</p>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Infrastructure en temps réel</p>
      </div>

      {/* Big availability ring */}
      <div className="flex items-center gap-4">
        <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { value: onlinePct, color: onlinePct >= 80 ? '#22c55e' : onlinePct >= 50 ? '#f59e0b' : '#ef4444' },
                  { value: 100 - onlinePct, color: 'transparent' },
                ]}
                cx="50%" cy="50%"
                innerRadius={28} outerRadius={38}
                startAngle={90} endAngle={-270}
                dataKey="value" strokeWidth={0} paddingAngle={0}
              >
                <Cell fill={onlinePct >= 80 ? '#22c55e' : onlinePct >= 50 ? '#f59e0b' : '#ef4444'} />
                <Cell fill="var(--surface-2)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[14px] font-bold text-[var(--text)]">{onlinePct}%</span>
          </div>
        </div>
        <div>
          <p className="text-[22px] font-bold text-[var(--text)] leading-none">{online}</p>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">lampadaires en ligne</p>
          <p className="text-[11px] text-[var(--text-muted)]">sur {total} au total</p>
        </div>
      </div>

      {/* Progress bars */}
      <div className="space-y-3">
        {bars.map((bar) => (
          <div key={bar.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[var(--text-muted)]">{bar.label}</span>
              <span className="text-[12px] font-semibold" style={{ color: bar.color }}>{bar.display}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${bar.pct}%`, background: bar.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Status badges */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[var(--border)]">
        <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: '#ef444412' }}>
          <p className="text-[20px] font-bold leading-none text-red-500">{alertCounts?.critical ?? 0}</p>
          <p className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] mt-1">Critiques</p>
        </div>
        <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: '#f59e0b12' }}>
          <p className="text-[20px] font-bold leading-none text-amber-500">{alertCounts?.warning ?? 0}</p>
          <p className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] mt-1">Avertissements</p>
        </div>
      </div>
    </div>
  )
}

/* ── Energy chart ─────────────────────────────────────────── */
function fmtW(w) {
  if (!w) return '0 W'
  return w >= 1000 ? `${(w / 1000).toFixed(1)} kW` : `${Math.round(w)} W`
}

function EnergyChart({ daily, energy }) {
  const current   = energy?.estimated_current_power_w ?? 0
  const saving    = energy?.estimated_saving_w        ?? 0
  const savingPct = energy?.estimated_saving_percent  ?? 0

  const chartData = (Array.isArray(daily) ? daily : []).map((d) => ({
    date: d.date?.slice(5),
    kwh:  parseFloat((d.kwh ?? 0).toFixed(2)),
  }))
  const totalKwh = chartData.reduce((s, d) => s + d.kwh, 0)
  const todayKwh = chartData.length > 0 ? chartData[chartData.length - 1].kwh : 0

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-xl px-3 py-2 text-[12px] shadow-xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
        <p className="text-[var(--text-muted)] mb-0.5">{label}</p>
        <p className="text-green-400 font-bold">{payload[0].value.toFixed(2)} kWh</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
            <Zap size={15} className="text-green-500" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[var(--text)]">Consommation quotidienne</p>
            <p className="text-[11px] text-[var(--text-muted)]">Derniers 30 jours (kWh)</p>
          </div>
        </div>

        {/* KPI chips */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="rounded-xl px-4 py-2 border border-[var(--border)] bg-[var(--surface-2)] text-center min-w-[72px]">
            <p className="text-[18px] font-bold text-[var(--text)] leading-none">{todayKwh.toFixed(1)}</p>
            <p className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] mt-0.5">Aujourd'hui</p>
          </div>
          <div className="rounded-xl px-4 py-2 border border-[var(--border)] bg-[var(--surface-2)] text-center min-w-[72px]">
            <p className="text-[18px] font-bold text-[var(--text)] leading-none">{totalKwh.toFixed(1)}</p>
            <p className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] mt-0.5">kWh / 30 j</p>
          </div>
          <div className="rounded-xl px-4 py-2 border border-blue-500/20 bg-blue-500/8 text-center min-w-[72px]">
            <p className="text-[18px] font-bold text-blue-400 leading-none">{fmtW(current)}</p>
            <p className="text-[9px] uppercase tracking-wider text-blue-400/60 mt-0.5">Actuelle</p>
          </div>
          <div className="rounded-xl px-4 py-2 border border-green-500/20 bg-green-500/8 text-center min-w-[72px]">
            <p className="text-[18px] font-bold text-green-400 leading-none">{Math.round(savingPct)}%</p>
            <p className="text-[9px] uppercase tracking-wider text-green-400/60 mt-0.5">Économies</p>
          </div>
        </div>
      </div>

      {/* Area chart */}
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#22c55e" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" opacity={0.5} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'inherit' }}
              axisLine={false} tickLine={false}
              interval={Math.max(0, Math.floor(chartData.length / 9) - 1)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'inherit' }}
              axisLine={false} tickLine={false}
            />
            <Tooltip content={<CustomTooltip />}
              cursor={{ stroke: '#22c55e55', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area
              type="monotone"
              dataKey="kwh"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#energyGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#22c55e', stroke: 'var(--surface)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ── Main dashboard ───────────────────────────────────────── */
export default function DashboardPage() {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: QK.dashboard,
    queryFn: getStats,
  })
  const { data: health } = useQuery({
    queryKey: ['network-health'],
    queryFn: getNetworkHealth,
  })
  const { data: alertsRes } = useQuery({
    queryKey: QK.alerts({ status: 'open', limit: 5 }),
    queryFn: () => getAlerts({ status: 'open', limit: 5 }),
  })
  const { data: alertCounts } = useQuery({
    queryKey: QK.alertCounts,
    queryFn: getAlertCounts,
  })
  const { data: energy } = useQuery({
    queryKey: ['energy-summary'],
    queryFn: getEnergySummary,
  })
  const { data: daily } = useQuery({
    queryKey: ['energy-daily'],
    queryFn: () => getDailyEnergy(30),
  })

  const alerts = Array.isArray(alertsRes) ? alertsRes : alertsRes?.alerts || []

  const runAllMut = useMutation({
    mutationFn: runAllCalculator,
    onSuccess: (res) => toast.success(`Calculateur exécuté — ${res?.processed || 0} lampadaires traités`),
    onError: (e) => toast.error(e.message),
  })

  if (statsLoading) return <PageLoader />

  const online      = stats?.lampadaires_online      ?? 0
  const offline     = stats?.lampadaires_offline     ?? 0
  const maintenance = stats?.lampadaires_maintenance ?? 0
  const total       = stats?.total_lampadaires       ?? 0

  const todayKwh = Array.isArray(daily) && daily.length > 0 ? daily[daily.length - 1].kwh : 0

  const lampStatusData = [
    { name: 'En ligne',    value: online,      color: '#22c55e' },
    { name: 'Hors ligne',  value: offline,     color: '#ef4444' },
    { name: 'Maintenance', value: maintenance, color: '#f59e0b' },
  ]

  const alertSeverityData = [
    { name: 'Critiques',      value: alertCounts?.critical ?? 0, color: '#ef4444' },
    { name: 'Avertissements', value: alertCounts?.warning  ?? 0, color: '#f59e0b' },
    { name: 'Informations',   value: alertCounts?.info     ?? 0, color: '#3b82f6' },
  ]

  return (
    <div className="space-y-6">

      {/* ── KPI stat cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Lightbulb} label="Total lampadaires" value={total}
          iconBg="bg-brand-500/10" iconColor="text-brand-500" />
        <StatCard icon={Wifi}      label="En ligne"          value={online}
          iconBg="bg-green-500/10" iconColor="text-green-500" />
        <StatCard icon={WifiOff}   label="Hors ligne"        value={offline}
          iconBg="bg-red-500/10"   iconColor="text-red-500" />
        <StatCard icon={Wrench}    label="Maintenance"       value={maintenance}
          iconBg="bg-amber-500/10" iconColor="text-amber-500" />
        <StatCard icon={Bell}      label="Alertes ouvertes"  value={alertCounts?.total ?? 0}
          iconBg="bg-blue-500/10"  iconColor="text-blue-500" />
        <StatCard icon={Zap}       label="Énergie aujourd'hui" value={`${todayKwh.toFixed(1)} kWh`}
          iconBg="bg-slate-500/10 dark:bg-slate-400/10" iconColor="text-slate-600 dark:text-slate-400" />
      </div>

      {/* ── Energy chart ──────────────────────────────────── */}
      <EnergyChart daily={daily} energy={energy} />

      {/* ── Charts row ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DonutChart
          title="Répartition des lampadaires"
          subtitle="Par état de connectivité"
          data={lampStatusData}
          total={total}
        />
        <AlertSeverityChart data={alertSeverityData} />
        <NetworkHealthCard
          health={health}
          online={online}
          total={total}
          alertCounts={alertCounts}
        />
      </div>

      {/* ── Bottom row: Calculator + Alerts ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Calculator */}
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
              <TrendingUp size={16} className="text-brand-500" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[var(--text)]">Calculateur intelligent</p>
              <p className="text-[11px] text-[var(--text-muted)]">Optimisation automatique</p>
            </div>
          </div>
          <p className="text-[12px] text-[var(--text-muted)] mb-5 leading-relaxed">
            Lance le moteur de décision sur tous les lampadaires et ajuste les intensités selon les capteurs.
          </p>
          <Button className="w-full" loading={runAllMut.isPending} onClick={() => runAllMut.mutate()}>
            <Play size={14} /> Exécuter pour tous
          </Button>
        </div>

        {/* Recent alerts — compact 2-column list */}
        <div className="lg:col-span-2 rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={13} className="text-[var(--text-muted)]" />
              <p className="text-[13px] font-semibold text-[var(--text)]">Alertes récentes</p>
              {alerts.length > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">
                  {alerts.length}
                </span>
              )}
            </div>
            <button onClick={refresh}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] transition-colors">
              <RefreshCw size={13} />
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="py-10 flex items-center justify-center gap-3 text-[var(--text-muted)]">
              <div className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center">
                <Bell size={13} className="text-green-500" />
              </div>
              <span className="text-[12px] text-green-600 dark:text-green-400 font-medium">Aucune alerte ouverte</span>
            </div>
          ) : (
            <>
              <div className="divide-y divide-[var(--border)]">
                {alerts.slice(0, 5).map((a) => {
                  const col = severityColor(a.severity)
                  return (
                    <div key={a.id}
                      className="flex items-center gap-3 px-5 py-2.5 hover:bg-[var(--surface-2)] transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: col.text }} />
                      <Badge label={labelSeverity(a.severity)} bg={col.bg} text={col.text} />
                      {a.lampadaire_reference && (
                        <span className="text-[11px] font-mono text-[var(--text-muted)] shrink-0">
                          {a.lampadaire_reference}
                        </span>
                      )}
                      <p className="text-[12px] text-[var(--text)] flex-1 truncate">{a.message}</p>
                      <span className="text-[11px] text-[var(--text-muted)] shrink-0 whitespace-nowrap">
                        {timeAgo(a.created_at)}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="px-5 py-3 border-t border-[var(--border)]">
                <Link to="/alerts"
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors">
                  Voir toutes les alertes
                  <ArrowRight size={13} />
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
