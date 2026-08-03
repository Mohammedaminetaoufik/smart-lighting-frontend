import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  X, MapPin, Activity, ClipboardPlus, Cpu, Clock, AlertTriangle, Info,
  BrainCircuit, RefreshCw, ShieldAlert, CheckCircle2, Wrench,
} from 'lucide-react'
import { getLampPrediction } from '../../services/predictiveMaintenanceService'
import { getPredictiveExplanation } from '../../api/ai'
import RiskLevelBadge from './RiskLevelBadge'
import TelemetryFreshnessBadge from './TelemetryFreshnessBadge'
import PredictionConfidence from './PredictionConfidence'
import { timeAgo } from '../../utils/helpers'
import AIQualityMeta from '../ai/AIQualityMeta'
import GroundedRecommendations from '../ai/GroundedRecommendations'

const SEVERITY_COLOR = { normal: '#22c55e', warning: '#f59e0b', critical: '#ef4444' }

function SignalRow({ s }) {
  const color = SEVERITY_COLOR[s.severity] ?? '#6b7280'
  return (
    <li className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-medium text-[var(--text)]">{s.label}</span>
        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color, background: `${color}18` }}>
          {s.deviation_percent > 0 ? '+' : ''}{s.deviation_percent}%
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
        <span>Actuel : <span className="text-[var(--text)] font-medium tabular-nums">{s.current_value}{s.unit}</span></span>
        {s.expected_value != null && <span>Normal : <span className="text-[var(--text)] tabular-nums">{s.expected_value}{s.unit}</span></span>}
      </div>
      {s.contribution_percent != null && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mb-1">
            <span>Contribution au risque</span><span>{s.contribution_percent}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${s.contribution_percent}%`, background: color }} />
          </div>
        </div>
      )}
    </li>
  )
}

function ExplanationPanel({ explanation, isLoading, isError, isRefreshing, onRefresh }) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4">
        <div className="flex items-center gap-2 text-violet-500">
          <RefreshCw size={14} className="animate-spin" />
          <p className="text-[12px] font-semibold">Analyse détaillée de la situation…</p>
        </div>
        <p className="mt-2 text-[11px] text-[var(--text-muted)]">
          L’IA relie le score, la télémétrie et le scénario de panne à un plan préventif.
        </p>
      </div>
    )
  }

  if (isError || !explanation) {
    return (
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5">
        <p className="text-[12px] text-amber-600 dark:text-amber-400">
          L’explication détaillée est indisponible. Les signaux techniques restent consultables ci-dessous.
        </p>
        <button type="button" onClick={onRefresh} className="mt-2 text-[11px] font-semibold text-violet-500">
          Réessayer
        </button>
      </div>
    )
  }

  const plan = Array.isArray(explanation.preventive_plan) ? explanation.preventive_plan : []
  const checklist = Array.isArray(explanation.verification_checklist) ? explanation.verification_checklist : []
  const limitations = Array.isArray(explanation.limitations) ? explanation.limitations : []
  const evidence = Array.isArray(explanation.evidence) ? explanation.evidence : []

  return (
    <section className="rounded-xl border border-violet-500/25 bg-violet-500/5 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3.5 py-3 border-b border-violet-500/15">
        <div className="flex items-center gap-2">
          <BrainCircuit size={15} className="text-violet-500" />
          <div>
            <p className="text-[12px] font-semibold text-[var(--text)]">Explication IA préventive</p>
            <p className="text-[10px] text-[var(--text-muted)]">
              {explanation.source === 'llm_enriched' ? 'Analyse générative fondée sur les preuves' : 'Analyse experte déterministe'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing || explanation.ai_enabled === false}
          title={explanation.ai_enabled === false ? "IA générative désactivée dans le Centre IA" : "Régénérer"}
          className="inline-flex items-center gap-1 rounded-lg border border-violet-500/25 px-2 py-1 text-[10px] font-semibold text-violet-500 disabled:opacity-50"
        >
          <RefreshCw size={10} className={isRefreshing ? 'animate-spin' : ''} />
          Régénérer
        </button>
      </div>

      <div className="p-3.5 space-y-4">
        <div>
          <p className="text-[12.5px] font-semibold text-[var(--text)] leading-relaxed">{explanation.situation_summary}</p>
          <p className="mt-1.5 text-[11.5px] text-[var(--text-muted)] leading-relaxed">{explanation.risk_interpretation}</p>
        </div>

        <AIQualityMeta
          confidence={Number(explanation.confidence_basis?.value_percent) / 100}
          confidenceBasis={{
            evidence_count: explanation.confidence_basis?.fault_observations,
          }}
          warnings={[
            ...(explanation.quality_warnings ?? []),
            explanation.web?.warning,
          ].filter(Boolean)}
          sources={explanation.sources}
          webSources={explanation.web?.sources}
          compact
        />

        <GroundedRecommendations
          recommendations={explanation.grounded_recommendations}
          title="Plan préventif SQL + RAG + Web"
        />

        <div className="grid gap-2">
          <div className="rounded-lg bg-[var(--surface)]/70 border border-[var(--border)] p-2.5">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-violet-500">Scénario probable</p>
            <p className="mt-1 text-[11.5px] text-[var(--text)] leading-relaxed">{explanation.likely_scenario}</p>
          </div>
          <div className="rounded-lg bg-[var(--surface)]/70 border border-[var(--border)] p-2.5">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-orange-500">Impact possible</p>
            <p className="mt-1 text-[11.5px] text-[var(--text)] leading-relaxed">{explanation.operational_impact}</p>
          </div>
          <div className="rounded-lg bg-[var(--surface)]/70 border border-[var(--border)] p-2.5">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-brand-500">Décision proposée</p>
            <p className="mt-1 text-[11.5px] text-[var(--text)] leading-relaxed">{explanation.decision}</p>
          </div>
        </div>

        {evidence.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-[var(--text)] mb-2">Pourquoi cette conclusion ?</p>
            <ul className="space-y-1.5">
              {evidence.slice(0, 4).map((item) => (
                <li key={item.key} className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  <span className="font-semibold text-[var(--text)]">{item.title} :</span>{' '}
                  {item.observation} {item.interpretation}
                </li>
              ))}
            </ul>
          </div>
        )}

        {plan.length > 0 && (
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text)] mb-2">
              <Wrench size={12} className="text-violet-500" /> Plan de maintenance préventive
            </p>
            <ol className="space-y-2">
              {plan.map((step, index) => (
                <li key={`${step.order ?? index}-${step.action ?? ''}`} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-bold text-violet-500">
                    {step.order ?? index + 1}
                  </span>
                  <div>
                    <p className="text-[11.5px] font-semibold text-[var(--text)]">{step.action}</p>
                    <p className="text-[10.5px] text-[var(--text-muted)] leading-relaxed">{step.why}</p>
                    {step.urgency && <span className="text-[9.5px] uppercase tracking-wide text-violet-500">{step.urgency}</span>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {checklist.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-[var(--text)] mb-2">Contrôles de validation</p>
            <ul className="space-y-1.5">
              {checklist.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[10.5px] text-[var(--text-muted)]">
                  <CheckCircle2 size={11} className="text-brand-500 shrink-0 mt-0.5" /> {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-semibold text-red-500">
            <ShieldAlert size={12} /> Sécurité
          </p>
          <p className="mt-1 text-[10.5px] text-[var(--text)] leading-relaxed">{explanation.safety_notice}</p>
        </div>

        {limitations.length > 0 && (
          <details className="text-[10.5px] text-[var(--text-muted)]">
            <summary className="cursor-pointer font-semibold text-[var(--text)]">Limites de l’analyse</summary>
            <ul className="mt-1.5 list-disc pl-4 space-y-1">
              {limitations.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </details>
        )}
      </div>
    </section>
  )
}

export default function PredictionDetailsDrawer({ lampId, onClose, onAction }) {
  const open = lampId != null

  useEffect(() => {
    if (!open) return
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['lamp-prediction', lampId],
    queryFn: () => getLampPrediction(lampId),
    enabled: open,
  })
  const {
    data: explanation,
    isLoading: explanationLoading,
    isError: explanationError,
    isFetching: explanationRefreshing,
    refetch: refreshExplanation,
  } = useQuery({
    queryKey: ['predictive-explanation', lampId, data?.prediction_generated_at],
    queryFn: () => getPredictiveExplanation(data, true),
    enabled: open && Boolean(data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  if (!open) return null
  const staleWarning = data && ['stale', 'obsolete', 'unavailable'].includes(data.telemetry_freshness)

  return (
    <div className="fixed inset-0 z-[900] flex justify-end" role="dialog" aria-modal="true" aria-label="Diagnostic prédictif">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl h-full bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl flex flex-col animate-in slide-in-from-right-4 duration-300 motion-reduce:animate-none">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--border)] shrink-0">
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-[var(--text)] font-mono">{data?.reference ?? '…'}</p>
            <p className="text-[12px] text-[var(--text-muted)] truncate">{data?.zone} · {data?.lcu_reference || 'LCU —'}</p>
          </div>
          <button onClick={onClose} aria-label="Fermer le diagnostic" className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)]">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {isError ? (
            <p className="text-[13px] text-red-500">Impossible de charger le diagnostic.</p>
          ) : isLoading || !data ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-[var(--surface-2)]" />)}
            </div>
          ) : (
            <>
              {/* Synthèse */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Niveau de risque</p>
                  <RiskLevelBadge level={data.risk_level} score={data.risk_score} />
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Panne probable</p>
                  <p className="text-[13px] font-semibold text-[var(--text)]">{data.predicted_label}</p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Échéance estimée</p>
                  <p className="text-[13px] font-semibold text-[var(--text)]">{data.eta_label}</p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Fiabilité du score</p>
                  <PredictionConfidence value={data.confidence} compact />
                </div>
              </div>

              {/* Méthode de scoring / fraîcheur */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-1"><Cpu size={12} /> {data.model_version}</span>
                <span className="inline-flex items-center gap-1"><Clock size={12} /> Prédiction {timeAgo(data.prediction_generated_at)}</span>
                <TelemetryFreshnessBadge freshness={data.telemetry_freshness} lastAt={data.last_telemetry_at} showTime />
              </div>

              {staleWarning && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11.5px] text-amber-600 dark:text-amber-400">
                    Cette prédiction repose sur des données anciennes ou obsolètes. Sa fiabilité peut être réduite.
                  </p>
                </div>
              )}

              <ExplanationPanel
                explanation={explanation}
                isLoading={explanationLoading}
                isError={explanationError}
                isRefreshing={explanationRefreshing}
                onRefresh={() => refreshExplanation()}
              />

              {/* Signaux */}
              <div>
                <p className="text-[12px] font-semibold text-[var(--text)] mb-2 flex items-center gap-1.5">
                  <Info size={13} className="text-[var(--text-muted)]" /> Signaux principaux
                </p>
                <ul className="space-y-2">
                  {(data.signals ?? []).map((s) => <SignalRow key={s.key} s={s} />)}
                  {(!data.signals || data.signals.length === 0) && (
                    <li className="text-[12px] text-[var(--text-muted)]">Pas de télémétrie récente pour expliquer la prédiction.</li>
                  )}
                </ul>
              </div>

              {/* Recommandation */}
              <div className="rounded-xl border border-brand-500/25 bg-brand-500/5 p-3.5">
                <p className="text-[12px] font-semibold text-brand-500 mb-1">Recommandation</p>
                <p className="text-[12.5px] text-[var(--text)] leading-relaxed">{data.recommendation}</p>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 px-5 py-3.5 border-t border-[var(--border)] grid grid-cols-2 gap-2">
          <button onClick={() => onAction('workorder', { ...data, predictive_explanation: explanation })}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold bg-brand-500 hover:bg-brand-600 text-white transition-colors">
            <ClipboardPlus size={13} /> Créer un BT
          </button>
          <button onClick={() => onAction('map', data)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors">
            <MapPin size={13} /> Voir sur la carte
          </button>
          <button onClick={() => onAction('telemetry', data)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors">
            <Activity size={13} /> Télémétrie
          </button>
          <button onClick={onClose}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
