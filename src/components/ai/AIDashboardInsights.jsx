import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Sparkles, RefreshCw, AlertTriangle, ChevronDown, ChevronUp,
  ArrowRight, Zap, Radio, Wrench, Leaf, AlertCircle, Activity,
} from 'lucide-react'
import { getDecisionCenter } from '../../api/ai'
import { cn } from '../../utils/helpers'

const STATUS_CFG = {
  normal:   { label: 'Normal',       dot: 'bg-emerald-400', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  warning:  { label: 'Avertissement', dot: 'bg-amber-400',   badge: 'bg-amber-500/15  text-amber-400  border-amber-500/25'  },
  critical: { label: 'Critique',     dot: 'bg-red-400',     badge: 'bg-red-500/15    text-red-400    border-red-500/25'    },
}

const PRIORITY_CFG = {
  low:      { label: 'Faible',    color: 'text-slate-400',  dot: 'bg-slate-400'  },
  medium:   { label: 'Moyen',     color: 'text-amber-400',  dot: 'bg-amber-400'  },
  high:     { label: 'Élevé',     color: 'text-orange-400', dot: 'bg-orange-400' },
  critical: { label: 'Critique',  color: 'text-red-400',    dot: 'bg-red-400'    },
}

const CATEGORY_ICON = {
  availability:  Zap,
  communication: Radio,
  maintenance:   Wrench,
  energy:        Leaf,
  driver:        AlertTriangle,
  default:       AlertCircle,
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.normal
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
      cfg.badge,
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

function NetworkScore({ score, status }) {
  const color =
    status === 'critical' ? 'text-red-400' :
    status === 'warning'  ? 'text-amber-400' :
    'text-emerald-400'
  return (
    <div className="flex items-baseline gap-1">
      <span className={cn('text-3xl font-bold tabular-nums', color)}>{score}</span>
      <span className="text-[13px] text-[var(--text-muted)]">/100</span>
    </div>
  )
}

function CauseBar({ label, probability }) {
  const pct = Math.round(probability * 100)
  const color =
    pct >= 75 ? 'bg-red-500'   :
    pct >= 50 ? 'bg-amber-500' :
    pct >= 30 ? 'bg-orange-500':
    'bg-slate-500'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] text-[var(--text-muted)] truncate">{label}</span>
        <span className="text-[11px] font-semibold text-[var(--text)] shrink-0">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function ActionRow({ rec, rank }) {
  const p    = PRIORITY_CFG[rec.priority] ?? PRIORITY_CFG.medium
  const Icon = CATEGORY_ICON[rec.category] ?? CATEGORY_ICON.default
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[10px] font-bold text-[var(--text-muted)] mt-0.5">
        {rank}
      </span>
      <Icon size={13} className={cn('shrink-0 mt-0.5', p.color)} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[var(--text)] leading-snug">{rec.title}</p>
        {rec.reason && (
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed line-clamp-2">
            {rec.reason}
          </p>
        )}
      </div>
      <span className={cn('shrink-0 flex items-center gap-1 text-[10px] font-semibold', p.color)}>
        <span className={cn('w-1.5 h-1.5 rounded-full', p.dot)} />
        {p.label}
      </span>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4 p-5">
      <div className="flex gap-4">
        <div className="h-8 w-16 bg-[var(--surface-2)] rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-[var(--surface-2)] rounded-full w-3/4" />
          <div className="h-3 bg-[var(--surface-2)] rounded-full w-1/2" />
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-10 bg-[var(--surface-2)] rounded-xl" />
      ))}
    </div>
  )
}

export default function AIDashboardInsights() {
  const [expanded, setExpanded]     = useState(() => localStorage.getItem('ai-dc-expanded') !== 'false')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    localStorage.setItem('ai-dc-expanded', String(expanded))
  }, [expanded])

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['ai-decision-center', refreshKey],
    queryFn:  () => getDecisionCenter(refreshKey > 0),
    staleTime: 5 * 60 * 1000,
    retry: (count, err) => (err?.status === 429 ? false : count < 1),
  })

  const status     = data?.status  ?? 'normal'
  const score      = data?.network_score ?? null
  const causes     = data?.probable_causes ?? []
  const topActions = data?.top_actions   ?? []
  const summary    = data?.summary       ?? ''
  const confidence = data?.confidence    ?? null

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] bg-brand-500/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500/15 border border-brand-500/20 flex items-center justify-center shrink-0">
            <Activity size={14} className="text-brand-500" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-[var(--text)]">Centre de décision IA</p>
            {data?.generated_at && (
              <p className="text-[10px] text-[var(--text-muted)]">
                {data.cached ? 'Cache · ' : ''}
                {new Date(data.generated_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {data && <StatusBadge status={status} />}
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={isFetching}
            title="Actualiser"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-40"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {isLoading && <Skeleton />}

          {isError && !isLoading && (
            <div className="flex items-center gap-3 px-5 py-4 text-[13px] text-[var(--text-muted)]">
              <AlertTriangle size={15} className="text-amber-500 shrink-0" />
              <span>{error?.message ?? 'Service IA temporairement indisponible.'}</span>
            </div>
          )}

          {data && !isLoading && (
            <div className="p-5 space-y-5">

              {/* ── Score + summary ── */}
              <div className="flex items-start gap-4">
                {score !== null && (
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <NetworkScore score={score} status={status} />
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                      Score réseau
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  {summary && (
                    <p className="text-[13px] text-[var(--text)] leading-relaxed">{summary}</p>
                  )}
                  {confidence !== null && (
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Confiance diagnostic : <span className="font-semibold text-[var(--text)]">{Math.round(confidence * 100)}%</span>
                    </p>
                  )}
                </div>
              </div>

              {/* ── Top 3 actions ── */}
              {topActions.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    Top actions prioritaires
                  </p>
                  <div>
                    {topActions.map((rec, i) => (
                      <ActionRow key={rec.id ?? i} rec={rec} rank={i + 1} />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Causes probables ── */}
              {causes.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                    Causes probables
                  </p>
                  <div className="space-y-2.5">
                    {causes.map((c) => (
                      <CauseBar key={c.label} label={c.label} probability={c.probability} />
                    ))}
                  </div>
                </div>
              )}

              {/* ── CTA ── */}
              <Link
                to="/ai-center"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
                           bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20
                           text-[13px] font-semibold text-brand-500 hover:text-brand-400
                           transition-all duration-200"
              >
                <Sparkles size={13} />
                Ouvrir le Centre IA
                <ArrowRight size={13} />
              </Link>

            </div>
          )}
        </>
      )}
    </div>
  )
}
