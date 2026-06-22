import { useState, useMemo } from 'react'
import {
  Zap, TrendingDown, BarChart2, Leaf, Download,
  AlertTriangle, CheckCircle, Lightbulb, Eye,
  Calendar, ArrowUpRight, X, Activity, DollarSign, Loader2,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import {
  getEnergySummary, getDailyEnergy,
  getEnergyTopConsumers, getEnergyAnomalies,
  getEnergyHourly, getEnergyRecommendations,
} from '../../api/dashboard'
import { getLCUs } from '../../api/lcus'
import { cn } from '../../utils/helpers'
import AIPageInsights from '../../components/ai/AIPageInsights'
import EnergyLampDrawer from '../../components/energy/EnergyLampDrawer'

/* ─── Constants ──────────────────────────────────────────── */
const TARIFF   = 1.20
const CO2_COEF = 0.52

const PERIODS = ["Aujourd'hui", '7 jours', '30 jours', 'Ce mois']

const ZONE_COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

/* ─── Helpers ────────────────────────────────────────────── */
function fmtKwh(v) {
  if (v >= 1000) return `${(v / 1000).toFixed(2)} MWh`
  return `${v.toFixed(1)} kWh`
}

const ETAT_META = {
  online:      { color: '#22c55e', label: 'En ligne'    },
  offline:     { color: '#ef4444', label: 'Hors ligne'  },
  maintenance: { color: '#f59e0b', label: 'Maintenance' },
  unknown:     { color: '#6b7280', label: 'Inconnu'     },
}

const SEV_META = {
  critical: { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: 'Critique'  },
  warning:  { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', label: 'Attention' },
  info:     { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6', label: 'Info'      },
}

const PRIORITY_META = {
  high:   { bg: 'rgba(239,68,68,0.1)',    color: '#ef4444', label: 'Priorité haute'   },
  medium: { bg: 'rgba(245,158,11,0.1)',   color: '#f59e0b', label: 'Priorité moyenne' },
  low:    { bg: 'rgba(107,114,128,0.12)', color: '#9ca3af', label: 'Priorité faible'  },
}

const ANOMALY_ICONS = {
  overconsumption: AlertTriangle,
  high_intensity:  Zap,
  spike:           ArrowUpRight,
  no_profile:      Activity,
  offline:         Zap,
}

/* ─── Sub-components ─────────────────────────────────────── */
function KpiCard({ label, value, sub, trend, icon: Icon, iconBg, iconColor, badge, loading }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
          <Icon size={16} className={iconColor} />
        </div>
        {badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: badge.bg, color: badge.color }}>
            {badge.label}
          </span>
        )}
      </div>
      <div>
        <p className="text-[12px] text-[var(--text-muted)] mb-1">{label}</p>
        {loading
          ? <div className="h-7 w-24 rounded-lg bg-[var(--surface-2)] animate-pulse" />
          : <p className="text-[22px] font-bold text-[var(--text)] leading-none">{value}</p>
        }
        {sub && <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-snug">{sub}</p>}
        {trend !== undefined && trend !== null && (
          <p className={cn('text-[11px] font-semibold mt-1.5', trend < 0 ? 'text-green-500' : 'text-red-500')}>
            {trend < 0 ? '↓' : '↑'} {Math.abs(trend).toFixed(1)}% vs période précédente
          </p>
        )}
      </div>
    </div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3.5 py-3 text-[12px] shadow-xl min-w-[170px]"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
      <p className="text-[var(--text-muted)] font-medium mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-[var(--text-muted)]">{p.name}</span>
          </div>
          <span className="font-bold" style={{ color: p.color }}>{Number(p.value).toFixed(2)} kWh</span>
        </div>
      ))}
    </div>
  )
}

function HourTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2.5 text-[12px] shadow-xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
      <p className="text-[var(--text-muted)] mb-1">{`${label}h00`}</p>
      <p className="font-bold text-green-400">{Number(payload[0]?.value ?? 0).toFixed(3)} kWh</p>
    </div>
  )
}

function SectionLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={22} className="text-brand-500 animate-spin" />
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────── */
export default function EnergyPage() {
  const [period,     setPeriod]     = useState('30 jours')
  const [zoneFilter, setZoneFilter] = useState('Toutes')
  const [lcuFilter,  setLcuFilter]  = useState('Toutes')
  const [dismissed,  setDismissed]  = useState(new Set())
  const [selectedLamp, setSelectedLamp] = useState(null)

  const days = period === "Aujourd'hui" ? 1 : period === '7 jours' ? 7 : 30
  const isToday = period === "Aujourd'hui"

  // ── API queries ──────────────────────────────────────────
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['energy-summary'],
    queryFn: getEnergySummary,
    staleTime: 60_000,
  })
  const { data: apiDaily, isLoading: dailyLoading } = useQuery({
    queryKey: ['energy-daily', days],
    queryFn: () => getDailyEnergy(days),
    staleTime: 60_000,
  })
  const { data: topConsumers = [], isLoading: topLoading } = useQuery({
    queryKey: ['energy-top-consumers', days],
    queryFn: () => getEnergyTopConsumers(days),
    staleTime: 60_000,
  })
  const { data: anomalies = [], isLoading: anomaliesLoading } = useQuery({
    queryKey: ['energy-anomalies', days],
    queryFn: () => getEnergyAnomalies(days),
    staleTime: 60_000,
  })
  const { data: hourlyData = [], isLoading: hourlyLoading } = useQuery({
    queryKey: ['energy-hourly'],
    queryFn: getEnergyHourly,
    staleTime: 30_000,
    enabled: isToday,
  })
  const { data: recommendations = [], isLoading: recsLoading } = useQuery({
    queryKey: ['energy-recommendations'],
    queryFn: getEnergyRecommendations,
    staleTime: 300_000,
  })
  const { data: lcusRes } = useQuery({ queryKey: ['lcus'], queryFn: getLCUs })

  const lcus = useMemo(() => {
    const arr = Array.isArray(lcusRes) ? lcusRes : lcusRes?.lcus || []
    return arr
  }, [lcusRes])

  const lcuOptions = useMemo(() => {
    const refs = lcus.map((l) => l.reference || l.name).filter(Boolean)
    return [...new Set(refs)]
  }, [lcus])

  // ── Zone breakdown from real summary.by_zone ─────────────
  const visibleZones = useMemo(() => {
    const raw = summary?.by_zone ?? []
    let list = raw.map((z, i) => ({
      zone:   z.zone,
      kwh:    +(z.estimated_current_power_w / 1000).toFixed(2),
      color:  ZONE_COLORS[i % ZONE_COLORS.length],
    }))
    if (zoneFilter !== 'Toutes') list = list.filter((z) => z.zone === zoneFilter)
    return list.sort((a, b) => b.kwh - a.kwh)
  }, [summary, zoneFilter])

  const zoneNames = useMemo(() => (summary?.by_zone ?? []).map((z) => z.zone), [summary])

  // ── Daily chart data ─────────────────────────────────────
  const dailyDays = useMemo(() => {
    const raw = Array.isArray(apiDaily) ? apiDaily : (apiDaily?.days ?? [])
    return raw
  }, [apiDaily])

  const prevTotalKwh = apiDaily?.previous_total_kwh ?? 0

  const chartData = useMemo(() => {
    if (dailyDays.length > 0) {
      return dailyDays.map((d) => ({
        date:      d.date?.slice(5),
        réelle:    +parseFloat(d.kwh ?? 0).toFixed(2),
        estimée:   +((d.kwh ?? 0) * 1.38).toFixed(2),
        économies: +((d.kwh ?? 0) * 0.38).toFixed(2),
      }))
    }
    return []
  }, [dailyDays])

  const hourlyChart = useMemo(() =>
    hourlyData.map((h) => ({
      hour: `${String(h.hour).padStart(2, '0')}h`,
      kwh:  +parseFloat(h.kwh ?? 0).toFixed(3),
    })),
  [hourlyData])

  const hourlyAvg = useMemo(() => {
    if (!hourlyChart.length) return 0
    return hourlyChart.reduce((s, h) => s + h.kwh, 0) / hourlyChart.length
  }, [hourlyChart])

  // ── Totals & KPIs ────────────────────────────────────────
  const totalReal = chartData.reduce((s, d) => s + (d.réelle ?? 0), 0)
  const totalEst  = chartData.reduce((s, d) => s + (d.estimée ?? 0), 0)
  const totalSav  = totalEst - totalReal
  const savPct    = totalEst > 0 ? (totalSav / totalEst) * 100 : 0
  const todayKwh  = chartData.length > 0 ? chartData[chartData.length - 1].réelle : 0
  const costDH    = totalReal * TARIFF
  const savDH     = totalSav  * TARIFF
  const co2Kg     = totalSav  * CO2_COEF
  const avgDim    = summary?.avg_intensity ?? 0
  const trend     = prevTotalKwh > 0 ? ((totalReal - prevTotalKwh) / prevTotalKwh) * 100 : null

  // ── Filters ───────────────────────────────────────────────
  const filteredConsumers = useMemo(() => {
    let list = Array.isArray(topConsumers) ? topConsumers : []
    if (lcuFilter  !== 'Toutes') list = list.filter((l) => l.lcu_ref  === lcuFilter)
    if (zoneFilter !== 'Toutes') list = list.filter((l) => l.zone     === zoneFilter)
    return list
  }, [topConsumers, lcuFilter, zoneFilter])

  const filteredAnomalies = useMemo(() => {
    let list = Array.isArray(anomalies) ? anomalies : []
    if (lcuFilter  !== 'Toutes') list = list.filter((a) => a.lcu_ref === lcuFilter)
    if (zoneFilter !== 'Toutes') list = list.filter((a) => a.zone    === zoneFilter)
    return list
  }, [anomalies, lcuFilter, zoneFilter])

  const visibleRecs = useMemo(() => {
    const list = Array.isArray(recommendations) ? recommendations : []
    return list.filter((r) => !dismissed.has(r.title))
  }, [recommendations, dismissed])

  const chartInterval = Math.max(0, Math.floor(chartData.length / 8) - 1)
  const isFiltered    = lcuFilter !== 'Toutes' || zoneFilter !== 'Toutes'

  return (
    <div className="space-y-6">

      {/* ── Filter bar ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          {PERIODS.map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all',
                period === p
                  ? 'bg-brand-500 text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
              )}>
              {p}
            </button>
          ))}
        </div>

        <select value={lcuFilter} onChange={(e) => setLcuFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-[12px] border bg-[var(--surface)] text-[var(--text)] border-[var(--border)] focus:outline-none focus:border-brand-500/60 cursor-pointer">
          <option value="Toutes">Toutes les LCUs</option>
          {lcuOptions.map((ref) => <option key={ref} value={ref}>{ref}</option>)}
        </select>

        <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-[12px] border bg-[var(--surface)] text-[var(--text)] border-[var(--border)] focus:outline-none focus:border-brand-500/60 cursor-pointer">
          <option value="Toutes">Toutes les zones</option>
          {zoneNames.map((z) => <option key={z}>{z}</option>)}
        </select>

        {isFiltered && (
          <button onClick={() => { setLcuFilter('Toutes'); setZoneFilter('Toutes') }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-brand-500 bg-brand-500/10 border border-brand-500/25 hover:bg-brand-500/20 transition-colors">
            <X size={11} /> Réinitialiser filtres
          </button>
        )}

        <div className="flex-1" />

        <button
          onClick={() => window.open(`/api/export/energy?days=${days}`)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors">
          <Download size={13} /> CSV
        </button>
      </div>

      {/* ── KPI cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label={`Total ${period}`} value={fmtKwh(totalReal)}
          icon={Zap} iconBg="bg-brand-500/10" iconColor="text-brand-500"
          trend={trend} loading={dailyLoading} />
        <KpiCard label="Aujourd'hui" value={`${todayKwh.toFixed(1)} kWh`}
          icon={Calendar} iconBg="bg-blue-500/10" iconColor="text-blue-500"
          sub="Dernier jour de la période" loading={dailyLoading} />
        <KpiCard label="Coût estimé" value={`${costDH.toFixed(0)} DH`}
          icon={DollarSign} iconBg="bg-amber-500/10" iconColor="text-amber-500"
          sub={`Tarif ${TARIFF} DH/kWh`} loading={dailyLoading} />
        <KpiCard label="Économies réalisées" value={`${totalSav.toFixed(0)} kWh`}
          icon={TrendingDown} iconBg="bg-green-500/10" iconColor="text-green-500"
          sub={`${savDH.toFixed(0)} DH économisés`}
          badge={{ label: `−${Math.round(savPct)}%`, bg: 'rgba(34,197,94,0.15)', color: '#22c55e' }}
          loading={dailyLoading} />
        <KpiCard label="Intensité moy." value={summaryLoading ? '…' : `${avgDim.toFixed(0)}%`}
          icon={BarChart2} iconBg="bg-purple-500/10" iconColor="text-purple-500"
          sub="Dimming moyen actif" loading={summaryLoading} />
        <KpiCard label="CO₂ évité" value={`${co2Kg.toFixed(0)} kg`}
          icon={Leaf} iconBg="bg-emerald-500/10" iconColor="text-emerald-500"
          sub="vs. intensité 100% fixe"
          badge={{ label: '🌿 Vert', bg: 'rgba(16,185,129,0.12)', color: '#10b981' }}
          loading={dailyLoading} />
      </div>

      {/* ── Main chart ───────────────────────────────────── */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[14px] font-semibold text-[var(--text)]">
              {isToday ? 'Consommation heure par heure' : 'Consommation énergétique'}
            </p>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
              {isToday ? "Aujourd'hui — répartition horaire (kWh)" : `${period} — réelle vs. estimée sans dimming`}
            </p>
          </div>
          {!isToday && (
            <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-[2px] rounded-full bg-green-500 inline-block" />Réelle
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0 border-t border-dashed border-[#6b7280] inline-block" />Sans dimming
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2.5 rounded-sm inline-block bg-green-500/20" />Économies
              </span>
            </div>
          )}
        </div>

        {isToday ? (
          hourlyLoading ? <SectionLoader /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={hourlyChart} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'inherit' }}
                  axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'inherit' }}
                  axisLine={false} tickLine={false} />
                <Tooltip content={<HourTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="kwh" radius={[4, 4, 0, 0]}>
                  {hourlyChart.map((h) => (
                    <Cell
                      key={h.hour}
                      fill={h.kwh > hourlyAvg * 1.2 ? '#f59e0b' : '#22c55e'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )
        ) : (
          dailyLoading ? <SectionLoader /> : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-[260px] text-[12px] text-[var(--text-muted)]">
              Aucune donnée de télémétrie pour cette période
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#22c55e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradEst" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#6b7280" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#6b7280" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'inherit' }}
                  axisLine={false} tickLine={false} interval={chartInterval} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'inherit' }}
                  axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />}
                  cursor={{ stroke: '#22c55e44', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="estimée" stroke="#6b7280" strokeWidth={1.5}
                  strokeDasharray="6 3" fill="url(#gradEst)" dot={false} />
                <Area type="monotone" dataKey="réelle" stroke="#22c55e" strokeWidth={2.5}
                  fill="url(#gradReal)" dot={false}
                  activeDot={{ r: 4, fill: '#22c55e', stroke: 'var(--surface)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )
        )}
      </div>

      {/* ── Zone breakdown + Top consumers ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Zone chart */}
        <div className="lg:col-span-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
          <p className="text-[14px] font-semibold text-[var(--text)]">Répartition par zone</p>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5 mb-5">Puissance estimée actuelle (kWh)</p>
          {summaryLoading ? <SectionLoader /> : visibleZones.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-[12px] text-[var(--text-muted)]">
              Aucune donnée de zone disponible
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={Math.max(180, visibleZones.length * 40)}>
                <BarChart data={visibleZones} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="zone" tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                    axisLine={false} tickLine={false} width={112} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--text)' }}
                    formatter={(v) => [`${v} kWh`, 'Consommation']} />
                  <Bar dataKey="kwh" radius={[0, 6, 6, 0]}>
                    {visibleZones.map((z) => <Cell key={z.zone} fill={z.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2.5">
                {visibleZones.map((z) => (
                  <div key={z.zone} className="flex items-center gap-2 text-[11px]">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: z.color }} />
                    <span className="text-[var(--text-muted)] flex-1 truncate">{z.zone}</span>
                    <span className="font-semibold text-[var(--text)]">{z.kwh} kWh</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Top consumers table */}
        <div className="lg:col-span-3 bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-semibold text-[var(--text)]">Top lampadaires consommateurs</p>
                <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                  Classés par consommation ({period})
                  {lcuFilter !== 'Toutes' && <> · <span className="text-brand-500 font-medium">{lcuFilter}</span></>}
                </p>
              </div>
              <span className="text-[11px] font-bold text-[var(--text-muted)] bg-[var(--surface-2)] px-2.5 py-1 rounded-full">
                {filteredConsumers.length} lampe{filteredConsumers.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          {topLoading ? <SectionLoader /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--border)]" style={{ background: 'var(--surface-2)' }}>
                    {['#', 'Lampadaire', 'Zone', 'LCU', 'kWh', 'Dim. moy.', 'Statut', ''].map((h, i) => (
                      <th key={i} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredConsumers.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-[12px] text-[var(--text-muted)]">
                      {topConsumers.length === 0 ? 'Aucune télémétrie sur cette période' : 'Aucun lampadaire pour ce filtre'}
                    </td></tr>
                  ) : filteredConsumers.map((lamp, i) => {
                    const meta = ETAT_META[lamp.etat] || ETAT_META.unknown
                    return (
                      <tr key={lamp.reference + i} className="hover:bg-[var(--surface-2)] transition-colors">
                        <td className="px-4 py-3 text-[var(--text-muted)] text-[11px]">{i + 1}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-[var(--text)] whitespace-nowrap">{lamp.reference}</td>
                        <td className="px-4 py-3 text-[var(--text-muted)] max-w-[100px] truncate">{lamp.zone}</td>
                        <td className="px-4 py-3">
                          {lamp.lcu_ref ? (
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg text-blue-400 bg-blue-500/10 whitespace-nowrap">
                              {lamp.lcu_ref}
                            </span>
                          ) : <span className="text-[var(--text-muted)]">—</span>}
                        </td>
                        <td className="px-4 py-3 font-bold text-[var(--text)]">{lamp.kwh.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                              <div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.min(lamp.avg_dim_pct, 100)}%` }} />
                            </div>
                            <span className="text-purple-400 font-semibold text-[11px]">{lamp.avg_dim_pct.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
                            style={{ background: `${meta.color}18`, color: meta.color }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedLamp(lamp)}
                            className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-brand-500 transition-colors font-medium whitespace-nowrap">
                            <Eye size={11} /> Détail
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Anomalies ─────────────────────────────────────── */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle size={15} className="text-red-500" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-[var(--text)]">Anomalies énergétiques</p>
            <p className="text-[12px] text-[var(--text-muted)]">
              Alertes ouvertes liées à des lampadaires ({period})
            </p>
          </div>
          {!anomaliesLoading && (
            <span className={cn(
              'text-[11px] font-bold px-2.5 py-1 rounded-full',
              filteredAnomalies.length > 0 ? 'text-red-400 bg-red-500/10' : 'text-green-400 bg-green-500/10'
            )}>
              {filteredAnomalies.length} alerte{filteredAnomalies.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {anomaliesLoading ? <SectionLoader /> : filteredAnomalies.length === 0 ? (
          <div className="py-8 flex items-center justify-center gap-3 text-[var(--text-muted)]">
            <CheckCircle size={15} className="text-green-500" />
            <span className="text-[12px] text-green-500 font-medium">
              {anomalies.length === 0 ? 'Aucune alerte ouverte sur cette période' : 'Aucune anomalie pour ce filtre'}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
            {filteredAnomalies.map((a) => {
              const sev  = SEV_META[a.severity] || SEV_META.info
              const Icon = ANOMALY_ICONS[a.type] || AlertTriangle
              const time = a.created_at
                ? new Date(a.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                : ''
              return (
                <div key={a.id} className="flex items-start gap-3 px-5 py-4 hover:bg-[var(--surface-2)] transition-colors">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: sev.bg }}>
                    <Icon size={14} style={{ color: sev.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-[13px] font-semibold text-[var(--text)]">{a.message || a.type}</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: sev.bg, color: sev.color }}>{sev.label}</span>
                    </div>
                    <p className="text-[11px] font-mono text-[var(--text-muted)]">
                      {a.lamp_ref} — {a.zone}
                      {a.lcu_ref && <> · <span className="text-blue-400">{a.lcu_ref}</span></>}
                    </p>
                    {time && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{time}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Smart recommendations ────────────────────────── */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
            <Lightbulb size={15} className="text-brand-500" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-[var(--text)]">Recommandations intelligentes</p>
            <p className="text-[12px] text-[var(--text-muted)]">Générées depuis l'état réel du réseau</p>
          </div>
          {!recsLoading && (
            <span className="text-[11px] font-bold text-green-500 bg-green-500/10 px-2.5 py-1 rounded-full">
              {visibleRecs.length} actives
            </span>
          )}
        </div>

        {recsLoading ? <SectionLoader /> : (
          <div className="divide-y divide-[var(--border)]">
            {visibleRecs.length === 0 ? (
              <div className="py-10 flex items-center justify-center gap-3">
                <CheckCircle size={16} className="text-green-500" />
                <span className="text-[13px] text-green-500 font-medium">
                  {recommendations.length === 0 ? 'Aucune recommandation générée — réseau optimal' : 'Toutes les recommandations ont été traitées'}
                </span>
              </div>
            ) : visibleRecs.map((r) => {
              const pri = PRIORITY_META[r.priority] || PRIORITY_META.low
              return (
                <div key={r.title} className="flex items-start gap-4 px-5 py-4 hover:bg-[var(--surface-2)] transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Lightbulb size={14} className="text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-[13px] font-semibold text-[var(--text)]">{r.title}</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: pri.bg, color: pri.color }}>{pri.label}</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mb-2">{r.detail}</p>
                    {r.saving_kwh > 0 && (
                      <div className="flex items-center gap-4 text-[11px]">
                        <span className="flex items-center gap-1 text-green-500 font-semibold">
                          <TrendingDown size={11} /> −{r.saving_kwh.toFixed(0)} kWh
                        </span>
                        <span className="text-amber-500 font-semibold">≈ {r.saving_dh.toFixed(0)} DH économisés</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 mt-0.5">
                    <button className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-brand-500 text-white hover:opacity-90 transition-opacity">
                      Appliquer
                    </button>
                    <button
                      onClick={() => setDismissed((s) => new Set(s).add(r.title))}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      title="Ignorer">
                      <X size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* AI Page Insights */}
      <AIPageInsights page="energy" title="Analyse IA énergétique" />

      {/* Lamp detail drawer */}
      {selectedLamp && (
        <EnergyLampDrawer
          lamp={selectedLamp}
          days={days}
          onClose={() => setSelectedLamp(null)}
        />
      )}

    </div>
  )
}
