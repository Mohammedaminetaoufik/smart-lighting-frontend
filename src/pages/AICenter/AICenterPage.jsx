import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Sparkles, RefreshCw, AlertTriangle, Zap, Radio, Wrench, Leaf,
  AlertCircle, Activity, MapPin, Clock, ChevronRight, ArrowUpRight,
  CheckCircle2, TrendingDown, Cpu, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getDecisionCenter } from '../../api/ai'
import { createWorkOrder } from '../../api/workorders'
import { RecommendationList } from '../../components/ai/RecommendationCard'
import { cn } from '../../utils/helpers'

// ── Config maps ────────────────────────────────────────────────────────────

const STATUS_CFG = {
  normal:   { label: 'Normal',        bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  warning:  { label: 'Avertissement', bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400',   dot: 'bg-amber-400'   },
  critical: { label: 'Critique',      bg: 'bg-red-500/10',     border: 'border-red-500/30',     text: 'text-red-400',     dot: 'bg-red-400'     },
}

const PRIORITY_CFG = {
  low:      { label: 'Faible',   border: 'border-l-slate-500', badge: 'bg-slate-500/15 text-slate-400 border-slate-500/25' },
  medium:   { label: 'Moyen',    border: 'border-l-amber-500', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  high:     { label: 'Élevé',    border: 'border-l-orange-500',badge: 'bg-orange-500/15 text-orange-400 border-orange-500/25' },
  critical: { label: 'Critique', border: 'border-l-red-500',   badge: 'bg-red-500/15 text-red-400 border-red-500/25' },
}

const CATEGORY_ICON = {
  availability:  Zap,
  communication: Radio,
  maintenance:   Wrench,
  energy:        Leaf,
  driver:        AlertTriangle,
  commissioning: CheckCircle2,
  default:       AlertCircle,
}

const SEVERITY_COLOR = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/25',
  warning:  'text-amber-400 bg-amber-500/10 border-amber-500/25',
  info:     'text-sky-400 bg-sky-500/10 border-sky-500/25',
}

// ── Sub-components ─────────────────────────────────────────────────────────

function KpiChip({ icon: Icon, label, value, color = 'text-[var(--text-muted)]' }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
      <Icon size={13} className={color} />
      <span className="text-[12px] font-bold text-[var(--text)]">{value ?? '—'}</span>
      <span className="text-[11px] text-[var(--text-muted)]">{label}</span>
    </div>
  )
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={14} className="text-brand-500" />
      <h3 className="text-[13px] font-bold text-[var(--text)] uppercase tracking-wider">{title}</h3>
    </div>
  )
}

function ActionCard({ rec, onCreateWO }) {
  const navigate = useNavigate()
  const p    = PRIORITY_CFG[rec.priority] ?? PRIORITY_CFG.medium
  const Icon = CATEGORY_ICON[rec.category] ?? CATEGORY_ICON.default

  const handleZone = () => navigate('/map')
  const handleLCU  = () => {
    if (rec.entity_type === 'lcu' && rec.entity_id) {
      navigate(`/lcus?id=${rec.entity_id}`)
    } else {
      navigate('/lcus')
    }
  }
  const handleWO   = () => onCreateWO(rec)

  return (
    <div className={cn(
      'rounded-xl border border-[var(--border)] bg-[var(--surface-2)] overflow-hidden border-l-4',
      p.border,
    )}>
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shrink-0 mt-0.5">
              <Icon size={13} className="text-brand-500" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[var(--text)] leading-snug">{rec.title}</p>
              {rec.entity_reference && (
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{rec.entity_reference}</p>
              )}
            </div>
          </div>
          <span className={cn('shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border', p.badge)}>
            {p.label}
          </span>
        </div>

        {/* Reason + action */}
        {rec.reason && (
          <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">{rec.reason}</p>
        )}
        {rec.action && (
          <p className="text-[12px] font-medium text-[var(--text)] leading-relaxed">→ {rec.action}</p>
        )}

        {/* Confidence */}
        {rec.confidence > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-[var(--surface)] overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-500/60"
                style={{ width: `${Math.round(rec.confidence * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-[var(--text-muted)] shrink-0">
              indice IA {Math.round(rec.confidence * 100)}%
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          {rec.entity_type === 'zone' && (
            <button
              onClick={handleZone}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <MapPin size={10} /> Voir zone
            </button>
          )}
          {(rec.entity_type === 'lcu' || rec.category === 'communication') && (
            <button
              onClick={handleLCU}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <Cpu size={10} /> Voir LCU
            </button>
          )}
          <button
            onClick={handleWO}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-brand-500/10 border border-brand-500/20 text-brand-500 hover:bg-brand-500/20 transition-colors"
          >
            <Wrench size={10} /> Créer intervention
          </button>
        </div>
      </div>
    </div>
  )
}

const MODAL_INPUT = 'w-full px-3 py-2.5 text-[13px] bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition-all'

function CreateWorkOrderModal({ rec, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    title: rec.title || '',
    description: [rec.reason, rec.action ? `→ ${rec.action}` : ''].filter(Boolean).join('\n'),
    priority: rec.priority || 'medium',
    equipment_reference: rec.entity_reference || '',
    probable_cause: rec.reason || '',
    recommended_action: rec.action || '',
    source_type: 'manual',
    status: 'open',
  })
  const [apiError, setApiError] = useState(null)

  const mut = useMutation({
    mutationFn: () => createWorkOrder(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workorders'] })
      toast.success('Bon de travail créé avec succès')
      onClose()
    },
    onError: (err) => setApiError(err?.response?.data?.error || 'La création a échoué'),
  })

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <Wrench size={13} className="text-brand-500" />
            </div>
            <h2 className="text-[15px] font-bold text-[var(--text)]">Créer un bon de travail</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] border border-transparent hover:border-[var(--border)] transition-all"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">
              Titre <span className="text-red-400">*</span>
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Titre du bon de travail"
              className={MODAL_INPUT}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className={cn(MODAL_INPUT, 'resize-none')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">Priorité</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className={MODAL_INPUT}
              >
                <option value="low">Faible</option>
                <option value="medium">Moyen</option>
                <option value="high">Élevé</option>
                <option value="critical">Critique</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">Référence équipement</label>
              <input
                value={form.equipment_reference}
                onChange={(e) => setForm((f) => ({ ...f, equipment_reference: e.target.value }))}
                placeholder="ex: LCU-001"
                className={MODAL_INPUT}
              />
            </div>
          </div>

          {apiError && (
            <p className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {apiError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => { setApiError(null); mut.mutate() }}
            disabled={mut.isPending || !form.title.trim()}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mut.isPending ? 'Création…' : 'Créer le bon de travail'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CauseBar({ label, probability }) {
  const pct = Math.round(probability * 100)
  const color = pct >= 75 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : pct >= 30 ? 'bg-orange-500' : 'bg-slate-500'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] text-[var(--text-muted)]">{label}</span>
        <span className="text-[12px] font-bold text-[var(--text)]">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ZoneRow({ zone }) {
  const pct = zone.total > 0 ? Math.round(zone.offline_count / zone.total * 100) : 0
  const color = pct >= 50 ? 'text-red-400' : pct >= 25 ? 'text-amber-400' : 'text-emerald-400'
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0 gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-[var(--text)] truncate">{zone.zone}</p>
        <div className="mt-1 h-1 rounded-full bg-[var(--surface-2)] overflow-hidden">
          <div
            className={cn('h-full rounded-full', pct >= 50 ? 'bg-red-500' : pct >= 25 ? 'bg-amber-500' : 'bg-emerald-500')}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className={cn('text-[12px] font-bold shrink-0', color)}>
        {zone.offline_count}/{zone.total}
      </span>
    </div>
  )
}

function LCURow({ lcu }) {
  const color = lcu.health_score >= 70 ? 'text-emerald-400' : lcu.health_score >= 40 ? 'text-amber-400' : 'text-red-400'
  const status = lcu.status === 'offline' ? 'bg-red-400' : lcu.status === 'online' ? 'bg-emerald-400' : 'bg-slate-400'
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0 gap-3">
      <div className="flex items-center gap-2.5">
        <span className={cn('w-2 h-2 rounded-full shrink-0', status)} />
        <div>
          <p className="text-[12px] font-medium text-[var(--text)]">{lcu.ref}</p>
          {lcu.zone && <p className="text-[10px] text-[var(--text-muted)]">{lcu.zone}</p>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={cn('text-[12px] font-bold', color)}>{lcu.health_score}/100</p>
        {lcu.offline_lamps > 0 && (
          <p className="text-[10px] text-red-400">{lcu.offline_lamps} hors ligne</p>
        )}
      </div>
    </div>
  )
}

function TimelineEvent({ event }) {
  const color = SEVERITY_COLOR[event.severity] ?? SEVERITY_COLOR.info
  return (
    <div className="flex items-start gap-3 py-2 border-b border-[var(--border)] last:border-0">
      <span className="text-[10px] font-mono font-semibold text-[var(--text-muted)] shrink-0 mt-0.5 w-10">{event.time}</span>
      <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase shrink-0', color)}>
        {event.severity}
      </span>
      <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">{event.event}</p>
    </div>
  )
}

// ── Page skeleton ──────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="h-32 bg-[var(--surface-2)] rounded-2xl" />
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 bg-[var(--surface-2)] rounded-xl" />)}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-[var(--surface-2)] rounded-xl" />)}
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AICenterPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [showAllRecs, setShowAllRecs] = useState(false)
  const [modalRec, setModalRec] = useState(null)

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['ai-decision-center', refreshKey],
    queryFn:  () => getDecisionCenter(refreshKey > 0),
    staleTime: 5 * 60 * 1000,
    retry: (count, err) => (err?.status === 429 ? false : count < 1),
  })

  const status     = data?.status ?? 'normal'
  const cfg        = STATUS_CFG[status] ?? STATUS_CFG.normal
  const score      = data?.network_score
  const kpis       = data?.kpis ?? {}
  const topActions = data?.top_actions ?? []
  const allRecs    = data?.all_recommendations ?? []
  const causes     = data?.probable_causes ?? []
  const zones      = data?.zone_status ?? []
  const lcus       = data?.lcu_status?.filter((l) => l.health_score < 80) ?? []
  const alertSum   = data?.alert_summary ?? {}
  const timeline   = data?.timeline_events ?? []
  const recsToShow = showAllRecs ? allRecs : allRecs.slice(0, 5)

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--text)]">Centre de décision IA</h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Analyse opérationnelle temps réel du réseau d'éclairage
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/ai-assistant"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <Sparkles size={12} />
            Assistant IA
            <ArrowUpRight size={11} />
          </Link>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-brand-500/10 border border-brand-500/20 text-brand-500 hover:bg-brand-500/20 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      {isLoading && <PageSkeleton />}

      {isError && !isLoading && (
        <div className="flex items-center gap-3 p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-[13px] text-[var(--text-muted)]">
          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
          <span>{error?.message ?? 'Service IA temporairement indisponible.'}</span>
        </div>
      )}

      {data && !isLoading && (
        <>
          {/* ── Summary banner ── */}
          <div className={cn('rounded-2xl border p-5 space-y-4', cfg.bg, cfg.border)}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', cfg.bg, 'border', cfg.border)}>
                  <Activity size={18} className={cfg.text} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-[28px] font-bold tabular-nums', cfg.text)}>{score ?? '—'}</span>
                    <span className="text-[14px] text-[var(--text-muted)]">/100</span>
                    <span className={cn(
                      'ml-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
                      cfg.bg, cfg.text, cfg.border,
                    )}>
                      <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', cfg.dot)} />
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">Score de santé réseau</p>
                </div>
              </div>
              {data.confidence && (
                <div className="text-right">
                  <p className="text-[20px] font-bold text-[var(--text)]">{Math.round(data.confidence * 100)}%</p>
                  <p className="text-[11px] text-[var(--text-muted)]">Indice diagnostic indicatif</p>
                </div>
              )}
            </div>

            {data.summary && (
              <p className="text-[13px] text-[var(--text)] leading-relaxed border-t border-[var(--border)] pt-3">
                {data.summary}
              </p>
            )}

            {/* KPI chips */}
            <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
              <KpiChip icon={Zap}          label="Lampadaires"  value={kpis.total_lampadaires} />
              <KpiChip icon={TrendingDown} label="Hors ligne"   value={kpis.offline_lampadaires ?? kpis.offline_count}
                       color={kpis.offline_lampadaires > 0 ? 'text-red-400' : 'text-slate-400'} />
              <KpiChip icon={AlertCircle} label="Alertes ouv." value={kpis.open_alerts}
                       color={kpis.open_alerts > 0 ? 'text-amber-400' : 'text-slate-400'} />
              <KpiChip icon={AlertCircle} label="Critiques 24h" value={kpis.critical_alerts_24h}
                       color={kpis.critical_alerts_24h > 0 ? 'text-red-400' : 'text-slate-400'} />
              <KpiChip icon={Wrench}      label="Bons ouverts"  value={kpis.open_workorders}
                       color="text-brand-500" />
              <KpiChip icon={Leaf}        label="Énergie kWh"   value={kpis.total_energy_kwh ? `${Math.round(kpis.total_energy_kwh)} kWh` : '—'}
                       color="text-yellow-500" />
            </div>
          </div>

          {/* ── Body: 2-column ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* LEFT — actions + all recommendations */}
            <div className="lg:col-span-2 space-y-5">

              {/* Top priority actions */}
              {topActions.length > 0 && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                  <SectionTitle icon={AlertCircle} title="Actions prioritaires" />
                  <div className="space-y-3">
                    {topActions.map((rec, i) => (
                      <ActionCard key={rec.id ?? i} rec={rec} onCreateWO={setModalRec} />
                    ))}
                  </div>
                </div>
              )}

              {/* All recommendations */}
              {allRecs.length > 0 && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                  <SectionTitle icon={Sparkles} title={`Toutes les recommandations (${allRecs.length})`} />
                  <RecommendationList recommendations={recsToShow} />
                  {allRecs.length > 5 && (
                    <button
                      onClick={() => setShowAllRecs((v) => !v)}
                      className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-brand-500 hover:text-brand-400 transition-colors"
                    >
                      <ChevronRight size={13} className={cn('transition-transform', showAllRecs && 'rotate-90')} />
                      {showAllRecs ? 'Voir moins' : `Voir les ${allRecs.length - 5} autres`}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT — zones, LCUs, alertes, causes, timeline */}
            <div className="space-y-5">

              {/* Causes probables */}
              {causes.length > 0 && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                  <SectionTitle icon={Activity} title="Causes probables" />
                  <div className="space-y-3">
                    {causes.map((c) => (
                      <CauseBar key={c.label} label={c.label} probability={c.probability} />
                    ))}
                  </div>
                </div>
              )}

              {/* Zones impactées */}
              {zones.length > 0 && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                  <SectionTitle icon={MapPin} title="Zones impactées" />
                  <div>
                    {zones.slice(0, 6).map((z) => (
                      <ZoneRow key={z.zone} zone={z} />
                    ))}
                  </div>
                  {zones.length > 0 && (
                    <Link
                      to="/map"
                      className="mt-3 flex items-center gap-1 text-[11px] font-medium text-brand-500 hover:text-brand-400 transition-colors"
                    >
                      Voir sur la carte <ArrowUpRight size={11} />
                    </Link>
                  )}
                </div>
              )}

              {/* LCUs critiques */}
              {lcus.length > 0 && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                  <SectionTitle icon={Cpu} title="LCUs critiques" />
                  <div>
                    {lcus.slice(0, 6).map((l) => (
                      <LCURow key={l.ref} lcu={l} />
                    ))}
                  </div>
                  <Link
                    to="/lcus"
                    className="mt-3 flex items-center gap-1 text-[11px] font-medium text-brand-500 hover:text-brand-400 transition-colors"
                  >
                    Gérer les LCUs <ArrowUpRight size={11} />
                  </Link>
                </div>
              )}

              {/* Alertes par catégorie */}
              {(alertSum.critical > 0 || alertSum.warning > 0 || alertSum.info > 0) && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                  <SectionTitle icon={AlertTriangle} title="Alertes ouvertes" />
                  <div className="space-y-2">
                    {[
                      { key: 'critical', label: 'Critiques', color: 'bg-red-500'    },
                      { key: 'warning',  label: 'Avertissement', color: 'bg-amber-500' },
                      { key: 'info',     label: 'Info',      color: 'bg-sky-500'    },
                    ].map(({ key, label, color }) => {
                      const count = alertSum[key] ?? 0
                      const total = (alertSum.critical ?? 0) + (alertSum.warning ?? 0) + (alertSum.info ?? 0)
                      const pct   = total > 0 ? Math.round(count / total * 100) : 0
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <span className="text-[11px] text-[var(--text-muted)] w-24 shrink-0">{label}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                            <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[12px] font-bold text-[var(--text)] w-6 text-right">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                  <Link
                    to="/alerts"
                    className="mt-3 flex items-center gap-1 text-[11px] font-medium text-brand-500 hover:text-brand-400 transition-colors"
                  >
                    Voir toutes les alertes <ArrowUpRight size={11} />
                  </Link>
                </div>
              )}

              {/* Timeline */}
              {timeline.length > 0 && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                  <SectionTitle icon={Clock} title="Événements récents" />
                  <div>
                    {timeline.map((ev, i) => (
                      <TimelineEvent key={i} event={ev} />
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </>
      )}

      {modalRec && (
        <CreateWorkOrderModal rec={modalRec} onClose={() => setModalRec(null)} />
      )}
    </div>
  )
}
