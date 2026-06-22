import { useState } from 'react'
import {
  ChevronDown, ChevronUp, ArrowRight, Lightbulb, Database,
  AlertTriangle, Zap, Radio, Wrench, Leaf, MapPin, CheckCircle2,
} from 'lucide-react'
import { cn } from '../../utils/helpers'

const PRIORITY = {
  critical: { label: 'Critique', bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-l-red-500',    dot: 'bg-red-400' },
  high:     { label: 'Élevé',    bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-l-orange-500', dot: 'bg-orange-400' },
  medium:   { label: 'Moyen',    bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-l-amber-500',  dot: 'bg-amber-400' },
  low:      { label: 'Faible',   bg: 'bg-slate-500/10',  text: 'text-slate-400',  border: 'border-l-slate-500',  dot: 'bg-slate-400' },
}

const CATEGORY_ICON = {
  availability: Zap, communication: Radio, network: Radio, driver: AlertTriangle,
  maintenance: Wrench, energy: Leaf, dimming: Zap, commissioning: CheckCircle2,
  data_quality: MapPin,
}

const SOURCE_LABEL = {
  rule_based: 'Règle métier', rag_guided: 'RAG', llm_enriched: 'IA', fallback: 'Repli',
}

export default function RecommendationCard({ rec }) {
  const [open, setOpen] = useState(false)
  if (!rec) return null

  const p = PRIORITY[rec.priority] ?? PRIORITY.medium
  const Icon = CATEGORY_ICON[rec.category] ?? Lightbulb
  const hasEvidence = rec.evidence && Object.keys(rec.evidence).length > 0

  return (
    <div className={cn('rounded-xl border border-[var(--border)] border-l-[3px] bg-[var(--surface-2)]/40 overflow-hidden', p.border)}>
      <div className="flex items-start gap-3 p-3.5">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', p.bg)}>
          <Icon size={15} className={p.text} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-[13px] font-semibold text-[var(--text)]">{rec.title}</p>
            <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full', p.bg, p.text)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', p.dot)} />
              {p.label}
            </span>
          </div>

          {/* Reason */}
          <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">{rec.reason}</p>

          {/* Action */}
          {rec.action && (
            <div className="flex items-start gap-1.5 mt-2 text-[12px] text-[var(--text)]">
              <ArrowRight size={13} className="text-brand-500 shrink-0 mt-0.5" />
              <span className="font-medium">{rec.action}</span>
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-muted)]">
            {rec.entity_reference && (
              <span className="font-mono">{rec.entity_reference}</span>
            )}
            <span>{SOURCE_LABEL[rec.source] ?? rec.source}</span>
            {rec.confidence != null && <span>· {Math.round(rec.confidence * 100)}%</span>}
            {hasEvidence && (
              <button
                onClick={() => setOpen((v) => !v)}
                className="ml-auto flex items-center gap-1 hover:text-[var(--text)] transition-colors"
              >
                <Database size={10} />
                {open ? <>Masquer <ChevronUp size={10} /></> : <>Preuves <ChevronDown size={10} /></>}
              </button>
            )}
          </div>

          {/* Evidence (collapsible) */}
          {open && hasEvidence && (
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-[var(--surface)] border border-[var(--border)] p-2.5">
              {Object.entries(rec.evidence).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-[var(--text-muted)] truncate">{k}</span>
                  <span className="font-mono font-semibold text-[var(--text)] shrink-0">
                    {Array.isArray(v) ? v.join(', ') : String(v)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Compact list wrapper with an empty state. */
export function RecommendationList({ recommendations, emptyLabel = 'Aucune recommandation — réseau nominal.' }) {
  const recs = Array.isArray(recommendations) ? recommendations : []
  if (recs.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3 text-[12px] text-green-500">
        <CheckCircle2 size={14} />
        {emptyLabel}
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {recs.map((rec) => <RecommendationCard key={rec.id} rec={rec} />)}
    </div>
  )
}
