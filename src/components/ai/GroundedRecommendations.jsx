import { AlertTriangle, BookOpen, CheckCircle2, Database, ExternalLink, Globe2, ShieldCheck } from 'lucide-react'

const ORIGIN = {
  sql: { label: 'SQL', icon: Database, cls: 'text-emerald-500 border-emerald-500/25 bg-emerald-500/10' },
  rag: { label: 'RAG', icon: BookOpen, cls: 'text-blue-500 border-blue-500/25 bg-blue-500/10' },
  web: { label: 'WEB', icon: Globe2, cls: 'text-cyan-500 border-cyan-500/25 bg-cyan-500/10' },
}

export default function GroundedRecommendations({ recommendations = [], title = 'Recommandations traçables' }) {
  if (!Array.isArray(recommendations) || recommendations.length === 0) return null
  return (
    <section>
      <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2.5">{title}</p>
      <div className="space-y-2.5">
        {recommendations.map((rec, index) => {
          const webEvidence = (rec.evidence || []).filter((item) => item.type === 'web')
          return (
            <article key={`${rec.text}-${index}`} className={`rounded-xl border p-3 ${rec.conflict ? 'border-amber-500/35 bg-amber-500/5' : 'border-[var(--border)] bg-[var(--surface-2)]/35'}`}>
              <div className="flex items-start gap-2.5">
                {rec.conflict ? <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" /> : <CheckCircle2 size={14} className="text-brand-500 shrink-0 mt-0.5" />}
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-[var(--text)] leading-relaxed">{rec.text}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {(rec.origins || []).map((origin) => {
                      const cfg = ORIGIN[origin]
                      if (!cfg) return null
                      const Icon = cfg.icon
                      return <span key={origin} className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${cfg.cls}`}><Icon size={9} />{cfg.label}</span>
                    })}
                    {rec.requires_human_validation && <span className="inline-flex items-center gap-1 text-[9px] text-[var(--text-muted)]"><ShieldCheck size={9} /> Validation humaine</span>}
                  </div>
                  {webEvidence.length > 0 && <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
                    {webEvidence.map((source) => <a key={`${source.ref}-${source.url}`} href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-cyan-500 hover:underline">
                      [{source.ref}] {source.title}<ExternalLink size={9} />
                    </a>)}
                  </div>}
                  {rec.conflict_reason && <p className="mt-2 text-[10px] text-amber-600 dark:text-amber-400">{rec.conflict_reason}</p>}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
