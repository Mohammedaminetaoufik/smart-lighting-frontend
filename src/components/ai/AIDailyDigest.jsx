import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Sparkles, RefreshCw, AlertTriangle, CheckCircle,
  Info, ChevronDown, ChevronUp, AlertCircle, Wrench, Zap
} from 'lucide-react'
import { getDailyDigest } from '../../api/ai'
import { cn } from '../../utils/helpers'

const PRIORITY = {
  low:      { label: 'Faible',   bg: 'bg-slate-500/15',  text: 'text-slate-400',  border: 'border-slate-500/25' },
  medium:   { label: 'Moyen',    bg: 'bg-amber-500/15',  text: 'text-amber-400',  border: 'border-amber-500/25' },
  high:     { label: 'Élevé',    bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/25' },
  critical: { label: 'Critique', bg: 'bg-red-500/15',    text: 'text-red-400',    border: 'border-red-500/25' },
}

function PriorityBadge({ priority }) {
  const cfg = PRIORITY[priority] ?? PRIORITY.medium
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
      cfg.bg, cfg.text, cfg.border,
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {cfg.label}
    </span>
  )
}

function KpiChip({ icon: Icon, label, value, colorClass }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
      <Icon size={12} className={colorClass} />
      <span className="text-[11px] font-semibold text-[var(--text)]">{value}</span>
      <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse p-5">
      <div className="flex gap-2">
        <div className="h-6 bg-[var(--surface-2)] rounded-full w-24" />
        <div className="h-6 bg-[var(--surface-2)] rounded-full w-24" />
        <div className="h-6 bg-[var(--surface-2)] rounded-full w-24" />
      </div>
      <div className="h-3.5 bg-[var(--surface-2)] rounded-full w-3/4" />
      <div className="h-3 bg-[var(--surface-2)] rounded-full w-full" />
      <div className="space-y-2 pt-1">
        <div className="h-2.5 bg-[var(--surface-2)] rounded-full w-4/5" />
        <div className="h-2.5 bg-[var(--surface-2)] rounded-full w-3/5" />
      </div>
    </div>
  )
}

export default function AIDailyDigest() {
  const [expanded, setExpanded] = useState(() => localStorage.getItem('ai-digest-expanded') !== 'false')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    localStorage.setItem('ai-digest-expanded', String(expanded))
  }, [expanded])

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['ai-daily-digest', refreshKey],
    queryFn: () => getDailyDigest(refreshKey > 0),
    staleTime: 30 * 60 * 1000, // 30 min
    retry: (count, err) => {
        if (err?.status === 429) return false
        return count < 1
    }
  })

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] bg-brand-500/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500/15 border border-brand-500/20 flex items-center justify-center shrink-0">
            <Sparkles size={14} className="text-brand-500" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-[var(--text)]">Synthèse Quotidienne IA</p>
            {data && (
              <p className="text-[10px] text-[var(--text-muted)]">
                {data.cached ? 'Dernière analyse ' : 'Générée à '}
                {new Date(data.generated_at * 1000).toLocaleTimeString('fr-FR', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {data && !isLoading && <PriorityBadge priority={data.priority} />}

          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={isFetching}
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

      {/* ── Body ────────────────────────────────────────────── */}
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

              {/* KPI Chips */}
              <div className="flex flex-wrap gap-2">
                <KpiChip 
                  icon={AlertCircle} 
                  label="Alertes 24h" 
                  value={data.kpis.new_alerts_24h} 
                  colorClass={data.kpis.new_alerts_24h > 0 ? 'text-amber-500' : 'text-slate-400'} 
                />
                <KpiChip 
                  icon={AlertCircle} 
                  label="Critiques 24h" 
                  value={data.kpis.critical_alerts_24h} 
                  colorClass={data.kpis.critical_alerts_24h > 0 ? 'text-red-500' : 'text-slate-400'} 
                />
                <KpiChip 
                  icon={Wrench} 
                  label="Bons 24h" 
                  value={data.kpis.new_workorders_24h} 
                  colorClass="text-brand-500" 
                />
                <KpiChip 
                  icon={Zap} 
                  label="Conso" 
                  value={`${Math.round(data.kpis.total_energy_kwh)} kWh`} 
                  colorClass="text-yellow-500" 
                />
              </div>

              {/* Summary */}
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Résumé
                </p>
                <p className="text-[14px] font-medium text-[var(--text)] leading-relaxed">{data.summary}</p>
              </div>

              {/* Analysis */}
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Analyse métier
                </p>
                <p className="text-[13px] text-[var(--text-muted)] leading-relaxed whitespace-pre-wrap">{data.analysis}</p>
              </div>

              {/* Recommendations */}
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2.5">
                  Actions recommandées
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-brand-500/5 border border-brand-500/10 transition-all hover:border-brand-500/20">
                      <CheckCircle size={14} className="text-brand-500 shrink-0 mt-0.5" />
                      <span className="text-[12px] text-[var(--text)] font-medium leading-tight">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Info size={10} className="text-[var(--text-muted)]" />
                  <span className="text-[10px] text-[var(--text-muted)]">
                    Modèle : Llama 3 · Confiance : {Math.round((data.confidence ?? 0) * 100)}%
                  </span>
                </div>
                <div className="text-[10px] text-[var(--text-muted)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full">
                  24 dernières heures
                </div>
              </div>

            </div>
          )}
        </>
      )}
    </div>
  )
}
