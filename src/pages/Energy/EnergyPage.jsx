import { useState, useMemo } from 'react'
import {
  Zap, TrendingDown, BarChart2, Leaf, Download,
  AlertTriangle, CheckCircle, Lightbulb, Eye,
  Calendar, ArrowUpRight, X, Activity, DollarSign,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { getEnergySummary, getDailyEnergy } from '../../api/dashboard'
import { getLCUs } from '../../api/lcus'
import { cn } from '../../utils/helpers'

/* ─── Constants ──────────────────────────────────────────── */
const TARIFF   = 1.20   // DH per kWh (Moroccan tariff)
const CO2_COEF = 0.52   // kg CO2 per kWh

const PERIODS = ["Aujourd'hui", '7 jours', '30 jours', 'Ce mois']

const ZONES = [
  { zone: 'Route principale',   kwh: 1205, lamps: 24, avgDim: 71, color: '#3b82f6' },
  { zone: 'Zone industrielle',  kwh: 978,  lamps: 20, avgDim: 68, color: '#8b5cf6' },
  { zone: 'Centre-ville',       kwh: 842,  lamps: 18, avgDim: 62, color: '#22c55e' },
  { zone: 'Zone résidentielle', kwh: 534,  lamps: 14, avgDim: 48, color: '#f59e0b' },
  { zone: 'Périphérie',         kwh: 312,  lamps: 8,  avgDim: 44, color: '#ef4444' },
]

// lcuIdx cycles across available LCUs (resolved at runtime)
const TOP_CONSUMERS = [
  { id: 'LP-042', zone: 'Route principale',   kwh: 87.4, avgDim: 94, etat: 'online',      lcuIdx: 0 },
  { id: 'LP-017', zone: 'Zone industrielle',  kwh: 82.1, avgDim: 88, etat: 'online',      lcuIdx: 1 },
  { id: 'LP-033', zone: 'Centre-ville',       kwh: 76.8, avgDim: 85, etat: 'maintenance', lcuIdx: 0 },
  { id: 'LP-055', zone: 'Route principale',   kwh: 71.3, avgDim: 80, etat: 'online',      lcuIdx: 2 },
  { id: 'LP-008', zone: 'Zone résidentielle', kwh: 68.9, avgDim: 76, etat: 'online',      lcuIdx: 1 },
  { id: 'LP-061', zone: 'Zone industrielle',  kwh: 65.2, avgDim: 72, etat: 'online',      lcuIdx: 2 },
  { id: 'LP-024', zone: 'Centre-ville',       kwh: 63.7, avgDim: 71, etat: 'offline',     lcuIdx: 3 },
  { id: 'LP-049', zone: 'Périphérie',         kwh: 58.4, avgDim: 65, etat: 'online',      lcuIdx: 3 },
]

const ANOMALIES = [
  {
    id: 'LP-033', zone: 'Centre-ville',      lcuIdx: 0,
    type: 'overconsumption', label: 'Consommation anormale',
    detail: '+47% par rapport à la semaine dernière',
    severity: 'critical',
  },
  {
    id: 'LP-017', zone: 'Zone industrielle', lcuIdx: 1,
    type: 'high_intensity', label: 'Intensité trop élevée',
    detail: 'Fonctionne à 88% entre 02h et 05h du matin',
    severity: 'warning',
  },
  {
    id: 'LP-055', zone: 'Route principale',  lcuIdx: 2,
    type: 'spike', label: 'Pic inhabituel détecté',
    detail: 'Consommation ×2.3 le 30/05 à 03:12',
    severity: 'warning',
  },
  {
    id: 'LP-024', zone: 'Centre-ville',      lcuIdx: 3,
    type: 'no_profile', label: 'Profil non optimisé',
    detail: 'Aucun profil de dimming — intensité fixe 100%',
    severity: 'info',
  },
]

const RECOMMENDATIONS = [
  {
    id: 1,
    title: 'Profil nocturne — Route principale',
    detail: 'Réduire de 80% → 45% entre 00h–05h pour 24 lampadaires',
    savingKwh: 312, savingDH: 374, priority: 'high',
  },
  {
    id: 2,
    title: 'Remplacement LED — Zone industrielle',
    detail: '8 lampes sodium → LED (60W → 35W). Amortissement estimé ~18 mois.',
    savingKwh: 175, savingDH: 210, priority: 'medium',
  },
  {
    id: 3,
    title: 'Extinction planifiée LP-024',
    detail: 'Zone piétonne fermée la nuit — coupure 23h–06h.',
    savingKwh: 64, savingDH: 77, priority: 'medium',
  },
  {
    id: 4,
    title: 'Détecteurs de présence — Zone résidentielle',
    detail: '14 lampadaires équipés de capteurs PIR non encore configurés.',
    savingKwh: 48, savingDH: 58, priority: 'low',
  },
]

/* ─── Helpers ────────────────────────────────────────────── */
function genDaily(days) {
  const out = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const weekend = d.getDay() === 0 || d.getDay() === 6
    const base = 55 + 12 * Math.sin(i / 8) + (weekend ? -12 : 0)
    const real = +(base + Math.sin(i * 1.9) * 6).toFixed(1)
    const estimated = +(real * 1.38 + 3).toFixed(1)
    out.push({
      date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      réelle: real,
      estimée: estimated,
      économies: +(estimated - real).toFixed(1),
    })
  }
  return out
}

function fmtKwh(v) {
  if (v >= 1000) return `${(v / 1000).toFixed(2)} MWh`
  return `${v.toFixed(1)} kWh`
}

const ETAT_META = {
  online:      { color: '#22c55e', label: 'En ligne'    },
  offline:     { color: '#ef4444', label: 'Hors ligne'  },
  maintenance: { color: '#f59e0b', label: 'Maintenance' },
}

const SEV_META = {
  critical: { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: 'Critique' },
  warning:  { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', label: 'Attention' },
  info:     { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6', label: 'Info'     },
}

const PRIORITY_META = {
  high:   { bg: 'rgba(239,68,68,0.1)',    color: '#ef4444', label: 'Priorité haute'   },
  medium: { bg: 'rgba(245,158,11,0.1)',   color: '#f59e0b', label: 'Priorité moyenne' },
  low:    { bg: 'rgba(107,114,128,0.12)', color: '#9ca3af', label: 'Priorité faible'  },
}

/* ─── Sub-components ─────────────────────────────────────── */
function KpiCard({ label, value, sub, trend, icon: Icon, iconBg, iconColor, badge }) {
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
        <p className="text-[22px] font-bold text-[var(--text)] leading-none">{value}</p>
        {sub && <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-snug">{sub}</p>}
        {trend !== undefined && (
          <p className={cn('text-[11px] font-semibold mt-1.5', trend < 0 ? 'text-green-500' : 'text-red-500')}>
            {trend < 0 ? '↓' : '↑'} {Math.abs(trend)}% vs période précédente
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
          <span className="font-bold" style={{ color: p.color }}>{Number(p.value).toFixed(1)} kWh</span>
        </div>
      ))}
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────── */
export default function EnergyPage() {
  const [period,     setPeriod]     = useState('30 jours')
  const [zoneFilter, setZoneFilter] = useState('Toutes')
  const [lcuFilter,  setLcuFilter]  = useState('Toutes')
  const [dismissed,  setDismissed]  = useState(new Set())

  const days = period === "Aujourd'hui" ? 1 : period === '7 jours' ? 7 : 30

  const { data: summary } = useQuery({ queryKey: ['energy-summary'],      queryFn: getEnergySummary })
  const { data: apiDaily } = useQuery({ queryKey: ['energy-daily', days], queryFn: () => getDailyEnergy(days) })
  const { data: lcusRes }  = useQuery({ queryKey: ['lcus'],                queryFn: getLCUs })

  const lcus = useMemo(() => {
    const arr = Array.isArray(lcusRes) ? lcusRes : lcusRes?.lcus || []
    return arr
  }, [lcusRes])

  // Resolve lcuRef for each mock lamp from the fetched LCU list
  const consumersWithLCU = useMemo(() =>
    TOP_CONSUMERS.map((l) => ({
      ...l,
      lcuRef: lcus.length > 0
        ? (lcus[l.lcuIdx % lcus.length]?.reference || lcus[l.lcuIdx % lcus.length]?.name || `LCU-${l.lcuIdx + 1}`)
        : `LCU-${l.lcuIdx + 1}`,
    })),
  [lcus])

  const anomaliesWithLCU = useMemo(() =>
    ANOMALIES.map((a) => ({
      ...a,
      lcuRef: lcus.length > 0
        ? (lcus[a.lcuIdx % lcus.length]?.reference || lcus[a.lcuIdx % lcus.length]?.name || `LCU-${a.lcuIdx + 1}`)
        : `LCU-${a.lcuIdx + 1}`,
    })),
  [lcus])

  // Unique LCU refs for the dropdown
  const lcuOptions = useMemo(() => {
    const refs = lcus.map((l) => l.reference || l.name).filter(Boolean)
    return [...new Set(refs)]
  }, [lcus])

  const chartData = useMemo(() => {
    if (Array.isArray(apiDaily) && apiDaily.length > 0) {
      return apiDaily.map((d) => ({
        date:     d.date?.slice(5),
        réelle:   +parseFloat(d.kwh ?? 0).toFixed(1),
        estimée:  +((d.kwh ?? 0) * 1.38).toFixed(1),
        économies: +((d.kwh ?? 0) * 0.38).toFixed(1),
      }))
    }
    return genDaily(days)
  }, [apiDaily, days])

  const totalReal  = chartData.reduce((s, d) => s + (d.réelle  ?? 0), 0)
  const totalEst   = chartData.reduce((s, d) => s + (d.estimée ?? 0), 0)
  const totalSav   = totalEst - totalReal
  const savPct     = totalEst > 0 ? (totalSav / totalEst) * 100 : 0
  const todayKwh   = chartData.length > 0 ? chartData[chartData.length - 1].réelle : 0
  const costDH     = totalReal * TARIFF
  const savDH      = totalSav  * TARIFF
  const co2Kg      = totalSav  * CO2_COEF
  const avgDim     = summary?.avg_intensity ?? 64

  // Apply LCU + zone filters to consumers
  const filteredConsumers = useMemo(() => {
    let list = consumersWithLCU
    if (lcuFilter  !== 'Toutes') list = list.filter((l) => l.lcuRef  === lcuFilter)
    if (zoneFilter !== 'Toutes') list = list.filter((l) => l.zone    === zoneFilter)
    return list
  }, [consumersWithLCU, lcuFilter, zoneFilter])

  // Apply LCU + zone filters to anomalies
  const filteredAnomalies = useMemo(() => {
    let list = anomaliesWithLCU
    if (lcuFilter  !== 'Toutes') list = list.filter((a) => a.lcuRef === lcuFilter)
    if (zoneFilter !== 'Toutes') list = list.filter((a) => a.zone   === zoneFilter)
    return list
  }, [anomaliesWithLCU, lcuFilter, zoneFilter])

  // Zone chart: when LCU is selected, derive from filtered consumers; otherwise use static data
  const visibleZones = useMemo(() => {
    if (lcuFilter === 'Toutes' && zoneFilter === 'Toutes') return ZONES
    const source = lcuFilter !== 'Toutes'
      ? consumersWithLCU.filter((l) => l.lcuRef === lcuFilter)
      : consumersWithLCU
    const grouped = {}
    source.forEach((l) => {
      if (zoneFilter !== 'Toutes' && l.zone !== zoneFilter) return
      grouped[l.zone] = grouped[l.zone] || { kwh: 0, lamps: 0 }
      grouped[l.zone].kwh   += l.kwh
      grouped[l.zone].lamps += 1
    })
    return Object.entries(grouped).map(([zone, v], i) => ({
      zone,
      kwh:    +v.kwh.toFixed(1),
      lamps:  v.lamps,
      avgDim: ZONES.find((z) => z.zone === zone)?.avgDim ?? 60,
      color:  ZONES.find((z) => z.zone === zone)?.color ?? '#6b7280',
    }))
  }, [consumersWithLCU, lcuFilter, zoneFilter])

  const visibleRecs   = RECOMMENDATIONS.filter((r) => !dismissed.has(r.id))
  const chartInterval = Math.max(0, Math.floor(chartData.length / 8) - 1)

  const isFiltered = lcuFilter !== 'Toutes' || zoneFilter !== 'Toutes'

  return (
    <div className="space-y-6">

      {/* ── Filter bar ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Period pills */}
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

        {/* LCU */}
        <select value={lcuFilter} onChange={(e) => setLcuFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-[12px] border bg-[var(--surface)] text-[var(--text)] border-[var(--border)] focus:outline-none focus:border-brand-500/60 cursor-pointer">
          <option value="Toutes">Toutes les LCUs</option>
          {lcuOptions.map((ref) => <option key={ref} value={ref}>{ref}</option>)}
        </select>

        {/* Zone */}
        <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-[12px] border bg-[var(--surface)] text-[var(--text)] border-[var(--border)] focus:outline-none focus:border-brand-500/60 cursor-pointer">
          <option value="Toutes">Toutes les zones</option>
          {ZONES.map((z) => <option key={z.zone}>{z.zone}</option>)}
        </select>

        {/* Mode */}
        <select className="px-3 py-2 rounded-xl text-[12px] border bg-[var(--surface)] text-[var(--text)] border-[var(--border)] focus:outline-none cursor-pointer">
          <option>Tous les modes</option>
          <option>Automatique</option>
          <option>Manuel</option>
          <option>Planifié</option>
        </select>

        {/* Active filter badge */}
        {isFiltered && (
          <button onClick={() => { setLcuFilter('Toutes'); setZoneFilter('Toutes') }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-brand-500 bg-brand-500/10 border border-brand-500/25 hover:bg-brand-500/20 transition-colors">
            <X size={11} /> Réinitialiser filtres
          </button>
        )}

        <div className="flex-1" />

        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors">
          <Download size={13} /> Excel
        </button>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors">
          <Download size={13} /> PDF
        </button>
      </div>

      {/* ── KPI cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label={`Total ${period}`} value={fmtKwh(totalReal)}
          icon={Zap} iconBg="bg-brand-500/10" iconColor="text-brand-500" trend={-4.2} />
        <KpiCard label="Aujourd'hui" value={`${todayKwh.toFixed(1)} kWh`}
          icon={Calendar} iconBg="bg-blue-500/10" iconColor="text-blue-500"
          sub="Mis à jour en temps réel" />
        <KpiCard label="Coût estimé" value={`${costDH.toFixed(0)} DH`}
          icon={DollarSign} iconBg="bg-amber-500/10" iconColor="text-amber-500"
          sub={`Tarif ${TARIFF} DH/kWh`} />
        <KpiCard label="Économies réalisées" value={`${totalSav.toFixed(0)} kWh`}
          icon={TrendingDown} iconBg="bg-green-500/10" iconColor="text-green-500"
          sub={`${savDH.toFixed(0)} DH économisés`}
          badge={{ label: `−${Math.round(savPct)}%`, bg: 'rgba(34,197,94,0.15)', color: '#22c55e' }} />
        <KpiCard label="Intensité moy." value={`${avgDim}%`}
          icon={BarChart2} iconBg="bg-purple-500/10" iconColor="text-purple-500"
          sub="Dimming moyen actif" />
        <KpiCard label="CO₂ évité" value={`${co2Kg.toFixed(0)} kg`}
          icon={Leaf} iconBg="bg-emerald-500/10" iconColor="text-emerald-500"
          sub="vs. intensité 100% fixe"
          badge={{ label: '🌿 Vert', bg: 'rgba(16,185,129,0.12)', color: '#10b981' }} />
      </div>

      {/* ── Main chart ───────────────────────────────────── */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[14px] font-semibold text-[var(--text)]">Consommation énergétique</p>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">{period} — réelle vs. estimée sans dimming</p>
          </div>
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
        </div>
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
      </div>

      {/* ── Zone breakdown + Top consumers ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Zone chart */}
        <div className="lg:col-span-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
          <p className="text-[14px] font-semibold text-[var(--text)]">Répartition par zone</p>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5 mb-5">Consommation totale (kWh)</p>
          <ResponsiveContainer width="100%" height={200}>
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
                <span className="text-[var(--text-muted)]">· {z.lamps} lampes</span>
              </div>
            ))}
          </div>
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
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[var(--border)]" style={{ background: 'var(--surface-2)' }}>
                  {['#', 'ID', 'Zone', 'LCU', 'kWh', 'Dim. moy.', 'Statut', ''].map((h, i) => (
                    <th key={i} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredConsumers.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-[12px] text-[var(--text-muted)]">
                    Aucun lampadaire pour ce filtre
                  </td></tr>
                ) : filteredConsumers.map((lamp, i) => {
                  const meta = ETAT_META[lamp.etat] || { color: '#6b7280', label: lamp.etat }
                  return (
                    <tr key={lamp.id} className="hover:bg-[var(--surface-2)] transition-colors">
                      <td className="px-4 py-3 text-[var(--text-muted)] text-[11px]">{i + 1}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-[var(--text)] whitespace-nowrap">{lamp.id}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)] max-w-[100px] truncate">{lamp.zone}</td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg text-blue-400 bg-blue-500/10 whitespace-nowrap">
                          {lamp.lcuRef}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-[var(--text)]">{lamp.kwh.toFixed(1)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                            <div className="h-full rounded-full bg-purple-500" style={{ width: `${lamp.avgDim}%` }} />
                          </div>
                          <span className="text-purple-400 font-semibold text-[11px]">{lamp.avgDim}%</span>
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
                        <button className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-brand-500 transition-colors font-medium whitespace-nowrap">
                          <Eye size={11} /> Détail
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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
              {filteredAnomalies.length} anomalie{filteredAnomalies.length !== 1 ? 's' : ''} détectée{filteredAnomalies.length !== 1 ? 's' : ''}
              {lcuFilter !== 'Toutes' && <> · <span className="text-brand-500 font-medium">{lcuFilter}</span></>}
            </p>
          </div>
        </div>
        {filteredAnomalies.length === 0 ? (
          <div className="py-8 flex items-center justify-center gap-3 text-[var(--text-muted)]">
            <CheckCircle size={15} className="text-green-500" />
            <span className="text-[12px] text-green-500 font-medium">Aucune anomalie pour ce filtre</span>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
          {filteredAnomalies.map((a) => {
            const sev  = SEV_META[a.severity] || SEV_META.info
            const Icon = { overconsumption: AlertTriangle, high_intensity: Zap, spike: ArrowUpRight, no_profile: Activity }[a.type] || AlertTriangle
            return (
              <div key={a.id} className="flex items-start gap-3 px-5 py-4 hover:bg-[var(--surface-2)] transition-colors">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: sev.bg }}>
                  <Icon size={14} style={{ color: sev.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-[13px] font-semibold text-[var(--text)]">{a.label}</p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: sev.bg, color: sev.color }}>{sev.label}</span>
                  </div>
                  <p className="text-[11px] font-mono text-[var(--text-muted)]">
                    {a.id} — {a.zone}
                    {a.lcuRef && <> · <span className="text-blue-400">{a.lcuRef}</span></>}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">{a.detail}</p>
                </div>
                <button className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1 shrink-0 transition-colors">
                  <Eye size={11} /> Voir
                </button>
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
            <p className="text-[12px] text-[var(--text-muted)]">Optimisations suggérées par le système</p>
          </div>
          <span className="text-[11px] font-bold text-green-500 bg-green-500/10 px-2.5 py-1 rounded-full">
            {visibleRecs.length} actives
          </span>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {visibleRecs.length === 0 ? (
            <div className="py-10 flex items-center justify-center gap-3">
              <CheckCircle size={16} className="text-green-500" />
              <span className="text-[13px] text-green-500 font-medium">Toutes les recommandations ont été traitées</span>
            </div>
          ) : visibleRecs.map((r) => {
            const pri = PRIORITY_META[r.priority] || PRIORITY_META.low
            return (
              <div key={r.id} className="flex items-start gap-4 px-5 py-4 hover:bg-[var(--surface-2)] transition-colors">
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
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="flex items-center gap-1 text-green-500 font-semibold">
                      <TrendingDown size={11} /> −{r.savingKwh} kWh
                    </span>
                    <span className="text-amber-500 font-semibold">≈ {r.savingDH} DH économisés</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                  <button className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-brand-500 text-white hover:opacity-90 transition-opacity">
                    Appliquer
                  </button>
                  <button className="px-3 py-1.5 rounded-lg text-[11px] font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors">
                    Détails
                  </button>
                  <button onClick={() => setDismissed((s) => new Set(s).add(r.id))}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    title="Ignorer">
                    <X size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
