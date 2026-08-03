import { AlertTriangle, BookOpen, ExternalLink, Globe2, ShieldCheck } from 'lucide-react'

const TRUST_LABEL = { high: 'fiabilité élevée', medium: 'fiabilité moyenne', low: 'fiabilité faible' }
const FRESHNESS_LABEL = { current: 'actuelle', aging: 'à vérifier', outdated: 'ancienne', unknown: 'date inconnue' }

export default function AIQualityMeta({
  confidence,
  confidenceBasis,
  warnings = [],
  sources = [],
  webSources = [],
  compact = false,
}) {
  const validSources = [...new Set((sources ?? []).filter(Boolean))]
  const validWarnings = [...new Set((warnings ?? []).filter(Boolean))]
  const validWebSources = (webSources ?? []).filter((source) => source?.url)
  const hasConfidence = Number.isFinite(Number(confidence))

  if (!hasConfidence && validSources.length === 0 && validWebSources.length === 0 && validWarnings.length === 0) return null

  return (
    <div className={compact ? 'space-y-1.5' : 'rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3 space-y-2.5'}>
      {hasConfidence && (
        <div className="flex items-start gap-2 text-[10.5px] text-[var(--text-muted)]">
          <ShieldCheck size={12} className="text-brand-500 shrink-0 mt-0.5" />
          <span>
            Confiance d&apos;aide à la décision : {confidenceBasis?.level
              ? `${confidenceBasis.level} (${Math.round(Number(confidence) * 100)} %).`
              : `${Math.round(Number(confidence) * 100)}%.`}
            {' '}Cet indice reflète la qualité des éléments disponibles, pas une probabilité de panne.
            {(confidenceBasis?.evidence_count ?? confidenceBasis?.evidence_observations) != null
              && ` ${confidenceBasis.evidence_count ?? confidenceBasis.evidence_observations} élément(s) factuel(s) analysé(s).`}
          </span>
        </div>
      )}

      {validSources.length > 0 && (
        <div className="flex items-start gap-2 text-[10.5px] text-[var(--text-muted)]">
          <BookOpen size={12} className="text-blue-500 shrink-0 mt-0.5" />
          <span>
            Sources documentaires : {validSources.slice(0, 4).join(' · ')}
            {validSources.length > 4 && ` · +${validSources.length - 4}`}
          </span>
        </div>
      )}

      {validWebSources.length > 0 && (
        <div className="flex items-start gap-2 text-[10.5px] text-[var(--text-muted)]">
          <Globe2 size={12} className="text-cyan-500 shrink-0 mt-0.5" />
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            <span>Sources web :</span>
            {validWebSources.slice(0, 5).map((source, index) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-cyan-600 dark:text-cyan-400 hover:underline"
                title={`${source.title} · confiance ${source.trust_level || 'non évaluée'} · fraîcheur ${source.freshness || 'inconnue'}${source.relevance_score != null ? ` · pertinence ${Math.round(source.relevance_score * 100)} %` : ''}`}
              >
                [W{index + 1}] {source.title || source.domain}
                <span className="opacity-70">· {TRUST_LABEL[source.trust_level] || 'fiabilité non évaluée'} · {FRESHNESS_LABEL[source.freshness] || 'date inconnue'}</span>
                <ExternalLink size={9} />
              </a>
            ))}
          </div>
        </div>
      )}

      {validWarnings.map((warning) => (
        <div key={warning} className="flex items-start gap-2 text-[10.5px] text-amber-600 dark:text-amber-400">
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          <span>{warning}</span>
        </div>
      ))}
    </div>
  )
}
