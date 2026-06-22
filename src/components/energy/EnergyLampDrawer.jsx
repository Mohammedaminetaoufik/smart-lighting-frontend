import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  X, Zap, MapPin, Wifi, WifiOff, Wrench, Clock,
  AlertTriangle, ArrowRight, TrendingDown, Activity,
  ExternalLink, Loader2, CheckCircle, BarChart2,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { getLampadaire, getTelemetry, getDimmingHistory } from '../../api/lampadaires'
import { getAlerts } from '../../api/alerts'
import { cn } from '../../utils/helpers'

/* ── Constants ───────────────────────────────────────────── */
const TARIFF = 1.20

const ETAT_CFG = {
  online:      { color: 'text-green-400',  dot: 'bg-green-400',  label: 'En ligne',    Icon: Wifi    },
  offline:     { color: 'text-red-400',    dot: 'bg-red-400',    label: 'Hors ligne',  Icon: WifiOff },
  maintenance: { color: 'text-amber-400',  dot: 'bg-amber-400',  label: 'Maintenance', Icon: Wrench  },
  unknown:     { color: 'text-slate-400',  dot: 'bg-slate-400',  label: 'Inconnu',     Icon: Activity},
}

const SEV_CFG = {
  critical: { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20',    label: 'Critique'  },
  warning:  { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20',  label: 'Attention' },
  info:     { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20',   label: 'Info'      },
}

/* ── Helpers ─────────────────────────────────────────────── */
function fmtKwh(v) {
  if (!v) return '—'
  if (v >= 1000) return `${(v / 1000).toFixed(2)} MWh`
  return `${v.toFixed(2)} kWh`
}

function fmtW(v) {
  if (!v) return '—'
  return `${Number(v).toFixed(0)} W`
}

function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function KpiPill({ label, value, sub, color = 'text-[var(--text)]' }) {
  return (
    <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-3.5 flex flex-col gap-1">
      <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
      <p className={cn('text-[18px] font-bold leading-none', color)}>{value}</p>
      {sub && <p className="text-[11px] text-[var(--text-muted)]">{sub}</p>}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider px-5 pt-5 pb-2">
      {children}
    </p>
  )
}

function PowerTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2 text-[12px] shadow-xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
      <p className="text-[var(--text-muted)] mb-1">{label}</p>
      <p className="font-bold text-brand-400">{Number(payload[0]?.value ?? 0).toFixed(1)} W</p>
    </div>
  )
}

/* ── Main drawer ─────────────────────────────────────────── */
export default function EnergyLampDrawer({ lamp, days, onClose }) {
  const drawerRef = useRef(null)

  // Close on Escape or outside click
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Queries — all keyed by lamp.id
  const { data: lampDetail, isLoading: lampLoading } = useQuery({
    queryKey: ['lamp-detail', lamp.id],
    queryFn: () => getLampadaire(lamp.id),
    staleTime: 60_000,
    enabled: !!lamp.id,
  })

  const { data: telemetry = [], isLoading: telLoading } = useQuery({
    queryKey: ['lamp-telemetry', lamp.id],
    queryFn: () => getTelemetry(lamp.id, { limit: 48 }),
    staleTime: 30_000,
    enabled: !!lamp.id,
  })

  const { data: dimmingRaw, isLoading: dimmingLoading } = useQuery({
    queryKey: ['lamp-dimming', lamp.id],
    queryFn: () => getDimmingHistory(lamp.id),
    staleTime: 60_000,
    enabled: !!lamp.id,
  })

  const { data: alertsRaw, isLoading: alertsLoading } = useQuery({
    queryKey: ['lamp-alerts', lamp.id],
    queryFn: () => getAlerts({ lampadaire_id: lamp.id, status: 'open' }),
    staleTime: 30_000,
    enabled: !!lamp.id,
  })

  const etatCfg  = ETAT_CFG[lamp.etat] || ETAT_CFG.unknown
  const { Icon: StatusIcon } = etatCfg

  // Telemetry chart data — last 48 points, show power W over time
  const chartData = (Array.isArray(telemetry) ? telemetry : telemetry?.measurements ?? [])
    .slice()
    .reverse()
    .map((m, i) => ({
      t:       m.created_at
        ? new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : `t-${i}`,
      puissance: m.puissance ?? 0,
    }))

  const latestTel = chartData[chartData.length - 1]

  // Dimming commands
  const dimmingList = (() => {
    if (!dimmingRaw) return []
    if (Array.isArray(dimmingRaw)) return dimmingRaw.slice(0, 5)
    if (Array.isArray(dimmingRaw?.commands)) return dimmingRaw.commands.slice(0, 5)
    return []
  })()

  // Open alerts
  const alertList = (() => {
    if (!alertsRaw) return []
    if (Array.isArray(alertsRaw)) return alertsRaw.slice(0, 5)
    if (Array.isArray(alertsRaw?.alerts)) return alertsRaw.alerts.slice(0, 5)
    return []
  })()

  // KPIs derived from lamp summary data
  const costDH   = lamp.kwh * TARIFF
  const savKWh   = lamp.kwh * 0.38
  const savDH    = savKWh * TARIFF

  const lat = lampDetail?.latitude  || lampDetail?.lat
  const lng = lampDetail?.longitude || lampDetail?.lng

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className="fixed top-0 right-0 h-full w-[420px] max-w-[95vw] z-50 flex flex-col bg-[var(--bg)] border-l border-[var(--border)] shadow-2xl overflow-hidden"
        style={{ animation: 'slideInRight 0.22s cubic-bezier(0.16,1,0.3,1)' }}
      >
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
        `}</style>

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-[var(--border)] bg-[var(--surface)] shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Zap size={18} className="text-brand-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[16px] font-bold text-[var(--text)] font-mono">{lamp.reference}</h2>
                <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border', etatCfg.color,
                  lamp.etat === 'online'      ? 'bg-green-500/10 border-green-500/20'  :
                  lamp.etat === 'offline'     ? 'bg-red-500/10 border-red-500/20'      :
                  lamp.etat === 'maintenance' ? 'bg-amber-500/10 border-amber-500/20'  : 'bg-slate-500/10 border-slate-500/20'
                )}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', etatCfg.dot)} />
                  {etatCfg.label}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-[12px] text-[var(--text-muted)] flex-wrap">
                <span>{lamp.zone}</span>
                {lamp.lcu_ref && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="font-mono text-blue-400">{lamp.lcu_ref}</span>
                  </>
                )}
                {lat && lng && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="flex items-center gap-1">
                      <MapPin size={10} />
                      {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Energy KPIs */}
          <div className="px-5 pt-5 pb-2">
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Énergie — {days === 1 ? "Aujourd'hui" : days === 7 ? '7 derniers jours' : '30 derniers jours'}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <KpiPill
                label="Consommation"
                value={fmtKwh(lamp.kwh)}
                sub={`${costDH.toFixed(2)} DH`}
                color="text-brand-500"
              />
              <KpiPill
                label="Dimming moyen"
                value={`${lamp.avg_dim_pct?.toFixed(0) ?? '—'}%`}
                sub={`Intensité active`}
                color="text-purple-400"
              />
              <KpiPill
                label="Économies estimées"
                value={fmtKwh(savKWh)}
                sub={`≈ ${savDH.toFixed(0)} DH`}
                color="text-green-400"
              />
              <KpiPill
                label="Puissance actuelle"
                value={latestTel ? fmtW(latestTel.puissance) : '—'}
                sub={lampDetail?.puissance ? `Nominal ${lampDetail.puissance} W` : undefined}
                color="text-amber-400"
              />
            </div>
          </div>

          {/* Telemetry chart */}
          <SectionTitle>Puissance mesurée (W)</SectionTitle>
          <div className="px-5">
            {telLoading ? (
              <div className="flex items-center justify-center h-[140px]">
                <Loader2 size={18} className="text-brand-500 animate-spin" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-[140px] text-[12px] text-[var(--text-muted)]">
                Aucune télémétrie disponible
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="drawerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="t" tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                    axisLine={false} tickLine={false}
                    interval={Math.floor(chartData.length / 5)} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                    axisLine={false} tickLine={false} />
                  <Tooltip content={<PowerTooltip />}
                    cursor={{ stroke: '#6366f144', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="puissance" stroke="#6366f1" strokeWidth={2}
                    fill="url(#drawerGrad)" dot={false}
                    activeDot={{ r: 3, fill: '#6366f1', stroke: 'var(--surface)', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Recent dimming commands */}
          <SectionTitle>Dernières commandes dimming</SectionTitle>
          <div className="px-5 space-y-1.5">
            {dimmingLoading ? (
              <div className="flex items-center gap-2 py-3 text-[12px] text-[var(--text-muted)]">
                <Loader2 size={13} className="animate-spin" /> Chargement…
              </div>
            ) : dimmingList.length === 0 ? (
              <p className="text-[12px] text-[var(--text-muted)] py-2">Aucune commande de dimming enregistrée</p>
            ) : dimmingList.map((cmd, i) => {
              const srcColors = {
                admin:                    'bg-blue-500/10 text-blue-400',
                calculateur_intelligent:  'bg-purple-500/10 text-purple-400',
                profile_eclairage:        'bg-green-500/10 text-green-400',
                simulation:               'bg-slate-500/10 text-slate-400',
              }
              const srcLabel = {
                admin:                    'Admin',
                calculateur_intelligent:  'Auto',
                profile_eclairage:        'Profil',
                simulation:               'Sim',
              }
              const srcCls = srcColors[cmd.source] || 'bg-slate-500/10 text-slate-400'
              const srcLbl = srcLabel[cmd.source] || cmd.source || '—'
              return (
                <div key={cmd.id ?? i} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0', srcCls)}>
                    {srcLbl}
                  </span>
                  <div className="flex items-center gap-1.5 flex-1 text-[12px] text-[var(--text)]">
                    <span className="text-[var(--text-muted)]">{cmd.old_intensity ?? '?'}%</span>
                    <ArrowRight size={11} className="text-[var(--text-muted)] shrink-0" />
                    <span className="font-bold text-brand-400">{cmd.new_intensity}%</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] shrink-0 flex items-center gap-1">
                    <Clock size={9} />
                    {fmtTime(cmd.created_at)}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Open alerts */}
          <SectionTitle>Alertes ouvertes</SectionTitle>
          <div className="px-5 space-y-1.5 pb-4">
            {alertsLoading ? (
              <div className="flex items-center gap-2 py-3 text-[12px] text-[var(--text-muted)]">
                <Loader2 size={13} className="animate-spin" /> Chargement…
              </div>
            ) : alertList.length === 0 ? (
              <div className="flex items-center gap-2 py-2 text-[12px] text-green-500">
                <CheckCircle size={13} />
                Aucune alerte ouverte
              </div>
            ) : alertList.map((a, i) => {
              const sev = SEV_CFG[a.severity] || SEV_CFG.info
              return (
                <div key={a.id ?? i} className={cn('flex items-start gap-3 px-3.5 py-2.5 rounded-xl border', sev.bg, sev.border)}>
                  <AlertTriangle size={13} className={cn('shrink-0 mt-0.5', sev.text)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', sev.bg, sev.text)}>
                        {sev.label}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">{a.type}</span>
                    </div>
                    <p className="text-[12px] text-[var(--text)] mt-0.5 leading-snug">{a.message}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{fmtTime(a.created_at)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────── */}
        <div className="shrink-0 px-5 py-4 border-t border-[var(--border)] bg-[var(--surface)]">
          <a
            href={`/lampadaires?id=${lamp.id}`}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors"
          >
            <ExternalLink size={14} />
            Voir la fiche complète
          </a>
        </div>
      </div>
    </>
  )
}
