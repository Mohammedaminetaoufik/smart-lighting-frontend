import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Sparkles, RefreshCw, AlertTriangle,
  Info, ChevronDown, ChevronUp,
} from 'lucide-react'
import { getPageInsights } from '../../api/ai'
import { cn } from '../../utils/helpers'
import { RecommendationList } from './RecommendationCard'

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

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse p-5">
      <div className="h-3.5 bg-[var(--surface-2)] rounded-full w-3/4" />
      <div className="h-3 bg-[var(--surface-2)] rounded-full w-full" />
      <div className="h-3 bg-[var(--surface-2)] rounded-full w-5/6" />
      <div className="space-y-2 pt-1">
        <div className="h-2.5 bg-[var(--surface-2)] rounded-full w-4/5" />
        <div className="h-2.5 bg-[var(--surface-2)] rounded-full w-3/5" />
      </div>
    </div>
  )
}

export default function AIPageInsights({ page, title = 'Analyse IA' }) {
  const [expanded, setExpanded] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['ai-page-insights', page, refreshKey],
    queryFn: () => getPageInsights(page, refreshKey > 0),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, err) => {
      // Never retry rate-limit errors — the backend already caches a fallback
      if (err?.status === 429 || err?.response?.status === 429) return false
      return failureCount < 1
    },
    retryDelay: 5000,
  })

  // Rule-based recommendations are always present (free, 0 token). The LLM
  // narrative (summary/analysis) is optional and only generated on demand.
  const llmGenerated = data && !!data.generated_at && !!data.summary
  const ruleRecs     = data?.rule_recommendations ?? []
  const hasRuleRecs  = ruleRecs.length > 0
  const showSkeleton = isLoading || (isFetching && !llmGenerated)
  const showContent  = !showSkeleton && data

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-500/15 border border-brand-500/20 flex items-center justify-center shrink-0">
            <Sparkles size={13} className="text-brand-500" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[var(--text)]">{title}</p>
            {data?.generated_at && (
              <p className="text-[10px] text-[var(--text-muted)]">
                {data.cached ? 'Cache · ' : ''}
                {new Date(data.generated_at).toLocaleTimeString('fr-FR', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showContent && hasRuleRecs && <PriorityBadge priority={data.priority} />}

          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={isFetching}
            title="Générer / régénérer l'analyse IA avancée"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-40"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────── */}
      {expanded && (
        <>
          {showSkeleton && <Skeleton />}

          {isError && !showSkeleton && (
            <div className="flex items-center gap-3 px-5 py-4 text-[13px] text-[var(--text-muted)]">
              <AlertTriangle size={15} className="text-amber-500 shrink-0" />
              <span>{error?.message ?? 'Service IA temporairement indisponible.'}</span>
            </div>
          )}

          {showContent && (
            <div className="p-5 space-y-4">

              {/* Rule-based operational recommendations — always available, 0 token */}
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Recommandations opérationnelles
                </p>
                <RecommendationList recommendations={ruleRecs} />
              </div>

              {/* LLM narrative — only when generated */}
              {llmGenerated && (
                <div className="space-y-4 pt-2 border-t border-[var(--border)]">
                  <div>
                    <p className="text-[10px] font-semibold text-brand-500 uppercase tracking-wider mb-1.5">
                      Synthèse IA
                    </p>
                    <p className="text-[13px] text-[var(--text)] leading-relaxed">{data.summary}</p>
                  </div>
                  {data.analysis && (
                    <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">{data.analysis}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Info size={10} className="text-[var(--text-muted)]" />
                    <span className="text-[10px] text-[var(--text-muted)]">
                      Synthèse {data.cached ? '(cache) ' : ''}générée par Llama 3 · Lamalif IA
                    </span>
                  </div>
                </div>
              )}

              {/* Optional LLM enrichment CTA */}
              {!llmGenerated && (
                <button
                  onClick={() => setRefreshKey((k) => k + 1)}
                  disabled={isFetching}
                  className="flex items-center gap-2 text-[12px] font-medium text-brand-500 hover:text-brand-400 transition-colors disabled:opacity-40"
                >
                  <Sparkles size={13} className={isFetching ? 'animate-pulse' : ''} />
                  {isFetching ? 'Génération…' : 'Générer une synthèse IA avancée (optionnel)'}
                </button>
              )}

            </div>
          )}
        </>
      )}
    </div>
  )
}
